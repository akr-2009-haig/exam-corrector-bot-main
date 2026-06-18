/**
 * Vision client via OpenRouter (OpenAI-compatible chat completions), ported
 * from the bot's `src/gemini.ts`. Reads its config straight from the
 * environment so it can run inside the Next.js API routes.
 *
 * We POST with `response_format: { type: "json_object" }` so the model returns
 * valid JSON for our two tasks: extracting an answer key and grading.
 */
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 180_000;
const RETRIES_PER_MODEL = 4;

export type ImagePart = { type: "image_url"; image_url: { url: string } };
export type TextPart = { type: "text"; text: string };
export type ContentPart = TextPart | ImagePart;

export function imagePart(url: string): ImagePart {
  return { type: "image_url", image_url: { url } };
}

const apiKey = () => process.env.OPENROUTER_API_KEY || "";

export const MODELS = {
  extraction: () => process.env.OPENROUTER_MODEL || "google/gemini-3-flash-preview",
  grading: () =>
    process.env.OPENROUTER_GRADING_MODEL ||
    process.env.OPENROUTER_MODEL ||
    "google/gemini-3-flash-preview",
  fallbacks: () =>
    (process.env.OPENROUTER_FALLBACK_MODELS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
};

function short(err: unknown): string {
  return String((err as any)?.message ?? err).replace(/\s+/g, " ").slice(0, 160);
}

async function callOnce(
  model: string,
  systemPrompt: string,
  userParts: ContentPart[],
): Promise<unknown> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      "X-Title": "Exam Grading Mini App",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userParts },
      ],
      temperature: 0.1,
      max_tokens: 8000,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`);
    (err as any).status = res.status;
    throw err;
  }

  const data: any = await res.json();
  if (data?.error) {
    throw new Error(`OpenRouter error: ${JSON.stringify(data.error).slice(0, 200)}`);
  }

  const raw = data?.choices?.[0]?.message?.content ?? "";
  const parsed = extractJSON(raw);
  if (parsed === null) {
    throw new Error(`Model did not return parseable JSON (len=${String(raw).length})`);
  }
  return parsed;
}

async function tryModel(
  model: string,
  systemPrompt: string,
  userParts: ContentPart[],
): Promise<unknown> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= RETRIES_PER_MODEL; attempt++) {
    try {
      return await callOnce(model, systemPrompt, userParts);
    } catch (err: any) {
      lastError = err;
      console.warn(`[OpenRouter] ${model} attempt ${attempt}/${RETRIES_PER_MODEL}: ${short(err)}`);
      if (attempt < RETRIES_PER_MODEL) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
      }
    }
  }
  throw lastError ?? new Error(`${model} failed after ${RETRIES_PER_MODEL} attempts`);
}

export async function visionJSON<T = unknown>(
  primaryModel: string,
  systemPrompt: string,
  userParts: ContentPart[],
): Promise<T> {
  const chain = [primaryModel, ...MODELS.fallbacks()].filter(
    (m, i, arr) => m && arr.indexOf(m) === i,
  );
  let lastError: Error | null = null;
  for (const model of chain) {
    try {
      return (await tryModel(model, systemPrompt, userParts)) as T;
    } catch (err: any) {
      lastError = err;
      if (chain.length > 1) {
        console.warn(`[OpenRouter] model ${model} failed (${short(err)}) → trying next`);
      }
    }
  }
  throw lastError ?? new Error("All models exhausted");
}

export function extractJSON(raw: string): unknown {
  const text = String(raw)
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json)?/gi, "")
    .trim();
  try {
    return JSON.parse(text);
  } catch {
    /* fall through */
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}
