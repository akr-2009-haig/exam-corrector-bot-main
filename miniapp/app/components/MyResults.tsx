"use client";

/** Student: list of own graded attempts → open full report. */
import { useEffect, useState } from "react";
import { api } from "../tg";
import { fmtScore, fmtDate, num } from "../fmt";
import ReportView from "./ReportView";
import Loader from "./Loader";
import { Alert, Camera, Calendar, StarCoin } from "../icons";

interface ResultRow {
  id: string;
  examTitle: string;
  awarded: number;
  max: number;
  bonus: number;
  at: number;
}

export default function MyResults() {
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api<{ results: ResultRow[] }>("/api/results")
      .then((d) => setRows(d.results))
      .catch((e) => setError(e.message));
  }, []);

  if (open) {
    return (
      <>
        <button className="btn btn-ghost back-inline" onClick={() => setOpen(null)}>
          ‹ نتائجي
        </button>
        <ReportView id={open} />
      </>
    );
  }

  if (error) return <div className="state state-error"><Alert size={20}/> {error}</div>;
  if (!rows) return <Loader />;
  if (!rows.length)
    return <div className="state"><Camera size={24}/> لا توجد لديك محاولات بعد. اختر امتحانًا وأرسل ورقتك.</div>;

  return (
    <div className="exam-list">
      {rows.map((r, i) => (
        <button 
          className="exam-card tappable" 
          key={r.id} 
          onClick={() => setOpen(r.id)}
          style={{ animation: `slide-in-up 0.4s ease both`, animationDelay: `${i * 0.05}s` }}
        >
          <div className="exam-card-main">
            <div className="exam-title">{r.examTitle}</div>
            <div className="meta-row">
              <span className="icon-text"><Calendar size={14}/> {fmtDate(r.at)}</span>
              {r.bonus > 0 && <span className="badge badge-gold"><StarCoin tone="gold"/> +{num(r.bonus)} مكافأة</span>}
            </div>
          </div>
          <div className="result-score-sm">{fmtScore(r.awarded, r.max)}</div>
        </button>
      ))}
    </div>
  );
}
