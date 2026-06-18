"use client";

/** Admin: active-exam list → manage (stats, scoreboard, attempts, stop). */
import { useEffect, useState } from "react";
import { api, haptic } from "../../tg";
import { num, fmtScore, fmtDateTime } from "../../fmt";
import ReportView from "../ReportView";
import Loader from "../Loader";
import { Alert, Settings, Bars, Mail, UserTactical, Checklist, Stop, Calendar } from "../../icons";

interface ExamLite {
  id: string;
  title: string;
  totalMarks: number;
  stats: { n: number; students: number; avgPct: number } | null;
}
interface Attempt {
  id: string;
  name: string;
  awarded: number;
  max: number;
  at: number;
}
interface StatsResp {
  title: string;
  totalMarks: number;
  isActive: boolean;
  stats: { n: number; students: number; avgPct: number; maxPct: number; minPct: number; bands: number[] };
  attempts: Attempt[];
}
interface BoardRow {
  rank: number;
  id: string;
  name: string;
  awarded: number;
  max: number;
}

export default function ManageExams() {
  const [exams, setExams] = useState<ExamLite[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = () =>
    api<{ exams: ExamLite[] }>("/api/exams").then((d) => setExams(d.exams)).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  if (openId) return <ExamManage id={openId} onBack={() => { setOpenId(null); load(); }} />;
  if (error) return <div className="state state-error"><Alert size={20}/> {error}</div>;
  if (!exams) return <Loader />;
  if (!exams.length) return <div className="state"><Alert size={24}/> لا يوجد امتحان نشط. سجّل امتحانًا جديدًا.</div>;

  return (
    <div className="exam-list">
      {exams.map((ex, i) => (
        <button 
          className="exam-card tappable" 
          key={ex.id} 
          onClick={() => setOpenId(ex.id)}
          style={{ animation: `slide-in-up 0.4s ease both`, animationDelay: `${i * 0.05}s` }}
        >
          <div className="exam-card-main">
            <div className="exam-title">
              <Settings size={16}/> {ex.title}
            </div>
            <div className="meta-row">
              <span className="icon-text"><Bars size={14}/> {num(ex.totalMarks)} درجة</span>
              <span className="icon-text"><Mail size={14}/> {ex.stats?.n ?? 0} محاولة</span>
              <span className="icon-text"><UserTactical size={14}/> {ex.stats?.students ?? 0} طالب</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function ExamManage({ id, onBack }: { id: string; onBack: () => void }) {
  const [d, setD] = useState<StatsResp | null>(null);
  const [board, setBoard] = useState<BoardRow[] | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<StatsResp>(`/api/exams/${id}/stats`).then(setD).catch((e) => setError(e.message));
  }, [id]);

  async function deactivate() {
    if (!confirm("إيقاف هذا الامتحان؟ لن يستقبل محاولات جديدة.")) return;
    setBusy(true);
    try {
      await api(`/api/exams/${id}/deactivate`, { body: {} });
      haptic("success");
      onBack();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleBoard() {
    if (board) {
      setBoard(null);
      return;
    }
    api<{ rows: BoardRow[] }>(`/api/exams/${id}/scoreboard`).then((r) => setBoard(r.rows)).catch((e) => setError(e.message));
  }

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
        ‹ الامتحانات
      </button>
      <h2 className="view-h">{d.title}</h2>
      <div className="comp-stats">
        <div className="cstat">
          <div className="cstat-v">{d.stats.n}</div>
          <div className="cstat-l">محاولة</div>
        </div>
        <div className="cstat">
          <div className="cstat-v">{d.stats.students}</div>
          <div className="cstat-l">طالب</div>
        </div>
        <div className="cstat">
          <div className="cstat-v">{Math.round(d.stats.avgPct)}%</div>
          <div className="cstat-l">المعدل</div>
        </div>
      </div>

      <div className="admin-actions">
        <button className="btn btn-ghost" onClick={toggleBoard}>
          <Checklist size={16}/> {board ? "إخفاء كشف الدرجات" : "كشف الدرجات"}
        </button>
        <button className="btn btn-danger" disabled={busy} onClick={deactivate}>
          <Stop size={16}/> إيقاف الامتحان
        </button>
      </div>

      {board && (
        <section className="list" style={{ marginTop: "16px" }}>
          {board.map((r, i) => (
            <div className="row sm" key={r.id} style={{ animation: `slide-in-up 0.3s ease both`, animationDelay: `${i * 0.05}s` }}>
              <div className="rank-box">{r.rank}</div>
              <div className="row-name">
                <span>{r.name}</span>
              </div>
              <div className="row-points">
                <span className="pts">{fmtScore(r.awarded, r.max)}</span>
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="standings-h">
        <Mail size={16}/> آخر المحاولات
      </div>
      <div className="exam-list">
        {d.attempts.map((a, i) => (
          <button 
            className="exam-card tappable" 
            key={a.id} 
            onClick={() => setOpenSub(a.id)}
            style={{ animation: `slide-in-up 0.3s ease both`, animationDelay: `${i * 0.05}s` }}
          >
            <div className="exam-card-main">
              <div className="exam-title">{a.name}</div>
              <div className="exam-meta icon-text"><Calendar size={14}/> {fmtDateTime(a.at)}</div>
            </div>
            <div className="result-score-sm">{fmtScore(a.awarded, a.max)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
