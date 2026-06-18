"use client";

/** Student: pick an exam, upload answer-sheet photos, get graded instantly. */
import { useEffect, useRef, useState } from "react";
import { api, haptic } from "../tg";
import { fmtScore, num } from "../fmt";
import ReportView from "./ReportView";
import Loader from "./Loader";
import { Camera, Checklist, Alert, Lightning, Fire, Refresh, Trophy, Target, Bars } from "../icons";

interface Exam {
  id: string;
  title: string;
  totalMarks: number;
  answered: boolean;
  myScore: { awarded: number; max: number } | null;
  canRetake: boolean;
}
interface GradeResult {
  submissionId: string;
  bonus: { speed: { points: number }; loyalty: { points: number; streak: number }; total: number };
  pointsEarned: number;
  balance: number;
  result: { total_awarded: number; total_max: number };
}

export default function Grade() {
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Exam | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [openReport, setOpenReport] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () =>
    api<{ exams: Exam[] }>("/api/exams")
      .then((d) => setExams(d.exams))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  async function submit() {
    if (!picked || !files.length || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("photos", f));
      const res = await api<GradeResult>(`/api/exams/${picked.id}/submit`, { body: fd });
      setResult(res);
      haptic("success");
    } catch (e: any) {
      haptic("error");
      setNotice(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function requestRetake(examId: string) {
    try {
      await api(`/api/exams/${examId}/retake-request`, { body: {} });
      setNotice("📨 تم إرسال طلبك إلى المعلّم. ستصلك رسالة عند الرد.");
    } catch (e: any) {
      setNotice(e.message);
    }
  }

  if (openReport) {
    return (
      <>
        <button className="btn btn-ghost back-inline" onClick={() => setOpenReport(null)}>
          ‹ رجوع
        </button>
        <ReportView id={openReport} />
      </>
    );
  }

  // Result screen.
  if (result) {
    return (
      <div className="result-screen">
        <div className="result-emoji" style={{ color: "#ffd76a" }}>
          <Trophy size={48} />
        </div>
        <h2 className="result-h">تم تصحيح ورقتك!</h2>
        <div className="result-score">{fmtScore(result.result.total_awarded, result.result.total_max)}</div>
        <div className="bonus-chips center">
          {result.bonus.speed.points > 0 && (
            <span className="cele-chip chip-gold">
              <Lightning size={14}/> سرعة +{result.bonus.speed.points}
            </span>
          )}
          {result.bonus.loyalty.points > 0 && (
            <span className="cele-chip chip-blue">
              <Fire size={14}/> وفاء +{result.bonus.loyalty.points} ({result.bonus.loyalty.streak} متتالية)
            </span>
          )}
        </div>
        <div className="earned">
          ربحت <b>{num(result.pointsEarned)}</b> نقطة • رصيدك: <b>{num(result.balance)}</b>
        </div>
        <button className="btn btn-primary" onClick={() => setOpenReport(result.submissionId)}>
          <Checklist size={16} /> عرض التصحيح الكامل
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            setResult(null);
            setPicked(null);
            setFiles([]);
            load();
          }}
        >
          ‹ العودة للامتحانات
        </button>
      </div>
    );
  }

  // Upload screen.
  if (picked) {
    return (
      <div className="upload-screen" style={{ animation: "slide-in-up 0.4s ease both" }}>
        <button className="btn btn-ghost back-inline" onClick={() => setPicked(null)}>
          ‹ الامتحانات
        </button>
        <h2 className="view-h">{picked.title}</h2>
        <p className="muted">الدرجة الكلية: {num(picked.totalMarks)} — صوّر ورقة إجاباتك بوضوح ثم ارفعها.</p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />
        <button className="dropzone" onClick={() => fileRef.current?.click()}>
          <Camera size={20} />
          {files.length ? `${files.length} صورة مختارة — اضغط للتغيير` : "اختر صور ورقة الإجابة"}
        </button>

        {notice && <div className="state state-error"><Alert size={16}/> {notice}</div>}

        <button className="btn btn-primary" disabled={!files.length || busy} onClick={submit}>
          {busy ? "⏳ جاري التصحيح…" : "إرسال للتصحيح"}
        </button>
      </div>
    );
  }

  // Exam list.
  if (error) return <div className="state state-error"><Alert size={20}/> {error}</div>;
  if (!exams) return <Loader />;
  if (!exams.length)
    return <div className="state"><Alert size={24}/> لا توجد امتحانات متاحة حاليًا. ستصلك رسالة عند نشر امتحان جديد.</div>;

  return (
    <div className="exam-list">
      {notice && <div className="state"><Alert size={16}/> {notice}</div>}
      {exams.map((ex, i) => (
        <div 
          className="exam-card" 
          key={ex.id}
          style={{ animation: `slide-in-up 0.4s ease both`, animationDelay: `${i * 0.05}s` }}
        >
          <div className="exam-card-main">
            <div className="exam-title">{ex.title}</div>
            <div className="meta-row">
              <span className="icon-text"><Bars size={14}/> {num(ex.totalMarks)} درجة</span>
              {ex.answered && ex.myScore && (
                <span className="badge badge-green">
                  {fmtScore(ex.myScore.awarded, ex.myScore.max)}
                </span>
              )}
            </div>
          </div>
          {!ex.answered || ex.canRetake ? (
            <button className="btn btn-primary btn-sm" onClick={() => setPicked(ex)}>
              {ex.canRetake ? <><Refresh size={14}/> محاولة جديدة</> : <><Camera size={14}/> إجابة</>}
            </button>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => requestRetake(ex.id)}>
              <Alert size={14}/> طلب إعادة
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
