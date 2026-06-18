"use client";

/** Full per-item correction of one submission (owner or admin). */
import { useEffect, useState } from "react";
import { api } from "../tg";
import { fmtScore, pct, fmtDateTime } from "../fmt";
import Loader from "./Loader";

interface GradedItem {
  n: number;
  question: string;
  student_answer: string;
  correct_answer: string;
  awarded: number;
  max: number;
  correct: boolean;
  note: string;
}
interface GradedQuestion {
  number: string;
  title: string;
  awarded: number;
  max: number;
  items: GradedItem[];
}
interface Report {
  examTitle: string;
  studentName: string | null;
  awarded: number;
  max: number;
  speedBonus: number;
  loyaltyBonus: number;
  at: number;
  result: { questions: GradedQuestion[]; total_awarded: number; total_max: number; feedback: string };
  photoUrls: string[];
}

export default function ReportView({ id }: { id: string }) {
  const [r, setR] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPhotos, setShowPhotos] = useState(false);

  useEffect(() => {
    api<Report>(`/api/submissions/${id}`).then(setR).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="state state-error">⚠️ {error}</div>;
  if (!r) return <Loader />;

  const p = pct(r.awarded, r.max);
  const bonus = Math.round((r.speedBonus + r.loyaltyBonus) * 10) / 10;

  return (
    <div className="report">
      <div className="report-head">
        <div className="report-title">{r.examTitle}</div>
        {r.studentName && <div className="report-sub">{r.studentName}</div>}
        <div className="report-score">
          <span className={`score-big ${p >= 50 ? "ok" : "bad"}`}>{fmtScore(r.awarded, r.max)}</span>
          <span className="score-pct">{p}%</span>
        </div>
        {bonus > 0 && (
          <div className="bonus-chips">
            {r.speedBonus > 0 && <span className="cele-chip chip-gold">⚡ سرعة +{r.speedBonus}</span>}
            {r.loyaltyBonus > 0 && <span className="cele-chip chip-blue">🔥 وفاء +{r.loyaltyBonus}</span>}
          </div>
        )}
        <div className="report-date">{fmtDateTime(r.at)}</div>
      </div>

      {r.result.feedback && <div className="feedback">📝 {r.result.feedback}</div>}

      {r.result.questions.map((q) => (
        <div className="q-block" key={q.number}>
          <div className="q-head">
            <span>
              {q.number} — {q.title}
            </span>
            <span className="q-score">{fmtScore(q.awarded, q.max)}</span>
          </div>
          {q.items.map((it) => (
            <div className={`item ${it.correct ? "item-ok" : it.awarded > 0 ? "item-part" : "item-bad"}`} key={it.n}>
              <div className="item-top">
                <span className="item-q">{it.question}</span>
                <span className="item-mark">{fmtScore(it.awarded, it.max)}</span>
              </div>
              <div className="item-ans">
                <span className="ans-you">إجابتك: {it.student_answer || "—"}</span>
                {!it.correct && <span className="ans-key">الصحيح: {it.correct_answer}</span>}
              </div>
              {it.note && <div className="item-note">{it.note}</div>}
            </div>
          ))}
        </div>
      ))}

      {r.photoUrls.length > 0 && (
        <div className="photos-block">
          <button className="btn btn-ghost" onClick={() => setShowPhotos((v) => !v)}>
            {showPhotos ? "🙈 إخفاء ورقة الطالب" : "🖼 عرض ورقة الطالب"}
          </button>
          {showPhotos &&
            r.photoUrls.map((u) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} className="sheet-img" src={u + window.location.search} alt="ورقة" />
            ))}
        </div>
      )}
    </div>
  );
}
