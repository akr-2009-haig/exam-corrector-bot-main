"use client";

/** Admin: pending retake requests → grant / deny. */
import { useEffect, useState } from "react";
import { api, haptic } from "../../tg";
import { fmtScore, fmtDateTime } from "../../fmt";
import Loader from "../Loader";
import { Alert, Checklist, UserTactical, Clock, Stop, Check } from "../../icons";

interface Req {
  id: string;
  examTitle: string;
  studentName: string;
  priorScore: { awarded: number; max: number } | null;
  at: number;
}

export default function Retakes() {
  const [reqs, setReqs] = useState<Req[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    api<{ requests: Req[] }>("/api/retakes").then((d) => setReqs(d.requests)).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  async function resolve(id: string, granted: boolean) {
    setBusy(id);
    try {
      await api(`/api/retakes/${id}/resolve`, { body: { granted } });
      haptic("success");
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  if (error) return <div className="state state-error"><Alert size={20}/> {error}</div>;
  if (!reqs) return <Loader />;
  if (!reqs.length) return <div className="state"><Check size={24}/> لا توجد طلبات إعادة معلّقة.</div>;

  return (
    <div className="exam-list">
      {reqs.map((r, i) => (
        <div 
          className="exam-card col" 
          key={r.id}
          style={{ animation: `slide-in-up 0.4s ease both`, animationDelay: `${i * 0.05}s` }}
        >
          <div className="exam-card-main">
            <div className="exam-title"><UserTactical size={16}/> {r.studentName}</div>
            <div className="meta-row">
              <span className="icon-text"><Checklist size={14}/> {r.examTitle}</span>
              {r.priorScore && <span className="badge badge-orange">{fmtScore(r.priorScore.awarded, r.priorScore.max)}</span>}
            </div>
            <div className="meta-row sub"><span className="icon-text"><Clock size={12}/> {fmtDateTime(r.at)}</span></div>
          </div>
          <div className="admin-actions">
            <button className="btn btn-primary btn-sm" disabled={busy === r.id} onClick={() => resolve(r.id, true)}>
              <Check size={14}/> السماح
            </button>
            <button className="btn btn-danger btn-sm" disabled={busy === r.id} onClick={() => resolve(r.id, false)}>
              <Stop size={14}/> الرفض
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
