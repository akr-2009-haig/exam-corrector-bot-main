"use client";

/** Admin: student list → one student's grades → full report. */
import { useEffect, useState } from "react";
import { api } from "../../tg";
import { num, fmtScore, fmtDate } from "../../fmt";
import ReportView from "../ReportView";
import Loader from "../Loader";
import { UserTactical, Alert, Calendar, StarCoin } from "../../icons";

interface Student {
  userId: number;
  name: string;
  attempts: number;
  lastAt: number;
}
interface Detail {
  name: string;
  balance: number;
  results: { id: string; examTitle: string; awarded: number; max: number; bonus: number; at: number }[];
}

export default function Students() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    api<{ students: Student[] }>("/api/students").then((d) => setStudents(d.students)).catch((e) => setError(e.message));
  }, []);

  if (openId !== null) return <StudentDetail id={openId} onBack={() => setOpenId(null)} />;
  if (error) return <div className="state state-error"><Alert size={20}/> {error}</div>;
  if (!students) return <Loader />;
  if (!students.length) return <div className="state"><UserTactical size={24}/> لا يوجد طلاب قدّموا محاولات بعد.</div>;

  return (
    <div className="exam-list">
      {students.map((s, i) => (
        <button 
          className="exam-card tappable" 
          key={s.userId} 
          onClick={() => setOpenId(s.userId)}
          style={{ animation: `slide-in-up 0.4s ease both`, animationDelay: `${i * 0.05}s` }}
        >
          <div className="exam-card-main">
            <div className="exam-title">
              <UserTactical size={16}/> {s.name}
            </div>
            <div className="meta-row">
              {s.attempts} محاولة • آخر: {fmtDate(s.lastAt)}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function StudentDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);

  useEffect(() => {
    api<Detail>(`/api/students/${id}`).then(setD).catch((e) => setError(e.message));
  }, [id]);

  if (openSub)
    return (
      <>
        <button className="btn btn-ghost back-inline" onClick={() => setOpenSub(null)}>
          ‹ رجوع
        </button>
        <ReportView id={openSub} />
      </>
    );
  if (error) return <div className="state state-error"><Alert size={20}/> {error}</div>;
  if (!d) return <Loader />;

  return (
    <div className="manage" style={{ animation: "slide-in-up 0.4s ease both" }}>
      <button className="btn btn-ghost back-inline" onClick={onBack}>
        ‹ الطلاب
      </button>
      <h2 className="view-h icon-text"><UserTactical size={24}/> {d.name}</h2>
      <div className="balance-bar"><StarCoin tone="gold"/> الرصيد: <b>{num(d.balance)}</b> نقطة</div>
      <div className="exam-list">
        {d.results.map((r, i) => (
          <button 
            className="exam-card tappable" 
            key={r.id} 
            onClick={() => setOpenSub(r.id)}
            style={{ animation: `slide-in-up 0.3s ease both`, animationDelay: `${i * 0.05}s` }}
          >
            <div className="exam-card-main">
              <div className="exam-title">{r.examTitle}</div>
              <div className="meta-row">
                <span className="icon-text"><Calendar size={14}/> {fmtDate(r.at)}</span>
                {r.bonus > 0 && <span className="badge badge-gold"><StarCoin tone="gold"/> +{num(r.bonus)}</span>}
              </div>
            </div>
            <div className="result-score-sm">{fmtScore(r.awarded, r.max)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
