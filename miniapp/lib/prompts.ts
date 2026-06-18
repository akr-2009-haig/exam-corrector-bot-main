/**
 * System prompts and result types for the two AI tasks.
 *
 *  1. EXTRACTION — read an answer-key photo and emit a structured exam.
 *  2. GRADING    — compare a student's answer photos against that key and
 *                  emit a per-item score with Arabic feedback.
 *
 * All natural-language feedback returned to students is in ARABIC, because
 * the audience is Arabic-speaking English learners.
 */

// ─── 1) Answer-key extraction ─────────────────────────────────────────────────

export const EXTRACTION_PROMPT = `You are an exam-digitising assistant. You are given one or more photos of an
English exam ANSWER KEY for Arabic-speaking students. The questions are in
English; the model/correct answers are written on the sheet (often in a
different colour). Mark allocations appear in headers like "(20 M)" or "(3 M)".

Extract the exam into STRICT JSON with EXACTLY this shape:

{
  "title": "<short title from the header, e.g. 'Unit One – Lecture 3'>",
  "total_marks": <number, sum of all question marks>,
  "questions": [
    {
      "number": "Q1",
      "title": "<the question heading, e.g. 'Grammar'>",
      "type": "grammar" | "translation" | "spelling" | "other",
      "max_marks": <number from the header>,
      "items": [
        {
          "n": 1,
          "prompt": "<the sub-question text WITHOUT the answer>",
          "answer": "<the correct/model answer for this item>",
          "marks": <marks for this single item>
        }
      ]
    }
  ]
}

Rules:
- Distribute a question's max_marks evenly across its items unless the sheet
  states otherwise (e.g. 20 marks / 10 items = 2 marks each). Marks may be
  fractional. The items' marks must sum to max_marks.
- "type": use "grammar" for verb-form / tense / sentence-correction questions,
  "translation" for translate-to-Arabic items (answer = the Arabic word/phrase),
  "spelling" for "complete the correctly spelt word" / irregular-verb items,
  otherwise "other".
- Multiple-choice items: when the QUESTION lists options in parentheses
  (e.g. "(swam / were swimming)" or "(hear / heard)") and only ONE option is
  marked as correct on the key (different colour, circled, underlined, or
  written separately as the answer), put ONLY that correct option in "answer".
  Do NOT keep the wrong option.
- Use " / " in "answer" ONLY when the key genuinely accepts several different
  answers as all correct (both written in the answer colour).
- Preserve Arabic answers exactly as written.
- Read ALL questions and ALL items across ALL provided images.
- Output ONLY the JSON object. No markdown, no commentary.`;

// ─── 2) Grading ────────────────────────────────────────────────────────────────

/**
 * The grading prompt is built per-submission because it must embed the active
 * exam's answer key. `leniency` is currently always "balanced" but is a
 * parameter so it can be tightened later.
 */
export function buildGradingPrompt(
  examKeyJson: string,
  leniency: "balanced" | "strict" = "balanced",
): string {
  const leniencyRules =
    leniency === "strict"
      ? `Be STRICT: the answer must match the key closely. Minor spelling
mistakes lose marks.`
      : `Be LENIENT but fair (balanced):
- Ignore trivial spelling slips, capitalisation, extra spaces, and Arabic
  diacritics (tashkeel) when the intended answer is clearly correct.
- Accept correct Arabic synonyms for translation items even if they differ
  from the key.
- For grammar items, the verb form / tense correctness is what matters, not
  perfect handwriting.
- Award PARTIAL marks when an answer is partly right (e.g. correct tense but
  misspelt). Round to one decimal place.
- When the student's handwriting is ambiguous, give the benefit of the doubt.`;

  return `You are an English-exam grader for Arabic-speaking students. You are given
the ANSWER KEY (as JSON below) and one or more photos of ONE student's filled
answer sheet. Read the student's handwritten/typed answers from the photos and
grade each item against the key.

ANSWER KEY:
${examKeyJson}

GRADING POLICY:
${leniencyRules}

If the student left an item blank or you cannot find their answer for it, set
"student_answer" to "" and "awarded" to 0.

Return STRICT JSON with EXACTLY this shape:

{
  "questions": [
    {
      "number": "Q1",
      "title": "Grammar",
      "awarded": <sum of item awards>,
      "max": <question max_marks>,
      "items": [
        {
          "n": 1,
          "question": "<short item prompt>",
          "student_answer": "<what the student wrote>",
          "correct_answer": "<the key answer>",
          "awarded": <marks given to this item>,
          "max": <item marks>,
          "correct": <true if full marks, else false>,
          "note": "<brief Arabic note: why marks were lost, or 'صحيح'>"
        }
      ]
    }
  ],
  "total_awarded": <sum across all questions>,
  "total_max": <sum of all question max>,
  "feedback": "<2-4 sentence overall remark in ARABIC, written in the voice of
the student's own TEACHER marking the paper by hand: warm, personal, specific
(mention what was strong and what to revise). NEVER mention AI, automation,
models, confidence, image quality or extraction — write only as a human
teacher would on a corrected paper.>"
}

All "note" and "feedback" text MUST be in Arabic. Notes should also read like
a teacher's red-pen remark (e.g. "انتبه لهمزة القطع", "راجع قاعدة الجمع"), not
like a system log. Output ONLY the JSON object.`;
}

// ─── Result types ────────────────────────────────────────────────────────────

export interface GradedItem {
  n: number;
  question: string;
  student_answer: string;
  correct_answer: string;
  awarded: number;
  max: number;
  correct: boolean;
  note: string;
}

export interface GradedQuestion {
  number: string;
  title: string;
  awarded: number;
  max: number;
  items: GradedItem[];
}

export interface GradingResult {
  questions: GradedQuestion[];
  total_awarded: number;
  total_max: number;
  feedback: string;
}

// ─── Result normalisation ────────────────────────────────────────────────────

/** Coerce a model-provided value to a finite, non-negative number. */
function toNum(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Sanitise the model's grading output so the numbers we store and show are
 * always consistent:
 *   - every numeric field is coerced (no NaN/strings),
 *   - each item's award is clamped to [0, item max] (item max taken from the
 *     exam key when the model omits or garbles it),
 *   - per-question and grand totals are RECOMPUTED from the items — we never
 *     trust the model's arithmetic.
 */
export function normalizeGradingResult(
  key: ExamKeyLike,
  raw: GradingResult,
): GradingResult {
  const keyQuestions = Array.isArray(key?.questions) ? key.questions : [];
  const rawQuestions = Array.isArray(raw?.questions) ? raw.questions : [];

  let totalAwarded = 0;
  let totalMax = 0;

  const questions: GradedQuestion[] = rawQuestions.map((q, qi) => {
    const keyQ = keyQuestions[qi];
    const keyItems = Array.isArray(keyQ?.items) ? keyQ.items : [];
    const rawItems = Array.isArray(q?.items) ? q.items : [];

    let qAwarded = 0;
    let qMax = 0;

    const items: GradedItem[] = rawItems.map((it, ii) => {
      const keyItem = keyItems[ii];
      const max = toNum(it?.max, toNum(keyItem?.marks));
      const awarded = Math.min(toNum(it?.awarded), max);
      qAwarded += awarded;
      qMax += max;
      return {
        n: toNum(it?.n, ii + 1),
        question: String(it?.question ?? keyItem?.prompt ?? ""),
        student_answer: String(it?.student_answer ?? ""),
        correct_answer: String(it?.correct_answer ?? keyItem?.answer ?? ""),
        awarded,
        max,
        correct: awarded >= max && max > 0,
        note: String(it?.note ?? ""),
      };
    });

    // If the model returned no items, fall back to its own (clamped) numbers.
    if (!items.length) {
      qMax = toNum(q?.max, toNum(keyQ?.max_marks));
      qAwarded = Math.min(toNum(q?.awarded), qMax);
    }

    totalAwarded += qAwarded;
    totalMax += qMax;

    return {
      number: String(q?.number ?? keyQ?.number ?? `Q${qi + 1}`),
      title: String(q?.title ?? keyQ?.title ?? ""),
      awarded: round1(qAwarded),
      max: round1(qMax),
      items,
    };
  });

  return {
    questions,
    total_awarded: round1(totalAwarded),
    total_max: round1(totalMax),
    feedback: String(raw?.feedback ?? ""),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Structural subset of ExamKey we need (avoids a circular import with db.ts). */
interface ExamKeyLike {
  questions?: {
    number?: string;
    title?: string;
    max_marks?: number;
    items?: { prompt?: string; answer?: string; marks?: number }[];
  }[];
}
