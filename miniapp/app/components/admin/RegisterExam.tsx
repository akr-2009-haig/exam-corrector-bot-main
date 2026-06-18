"use client";

/** Admin: upload answer-key photos → preview extracted key → activate. */
import { useRef, useState } from "react";
import { api, haptic } from "../../tg";
import { num } from "../../fmt";
import { Alert, Checklist, Camera, Check } from "../../icons";

interface ExamKey {
  title: string;
  total_marks: number;
  questions: { number: string; title: string; type: string; max_marks: number; items: any[] }[];
}

export default function RegisterExam({ onDone }: { onDone: () => void }) {
  const [keyFiles, setKeyFiles] = useState<File[]>([]);
  const [qFiles, setQFiles] = useState<File[]>([]);
  const [key, setKey] = useState<ExamKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ recipients: number } | null>(null);
  const keyRef = useRef<HTMLInputElement>(null);
  const qRef = useRef<HTMLInputElement>(null);

  async function extract() {
    if (!keyFiles.length || busy) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      keyFiles.forEach((f) => fd.append("photos", f));
      const d = await api<{ key: ExamKey }>("/api/exams/register", { body: fd });
      setKey(d.key);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function activate() {
    if (!key || busy) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("key", JSON.stringify(key));
      qFiles.forEach((f) => fd.append("questions", f));
      const d = await api<{ recipients: number }>("/api/exams/activate", { body: fd });
      haptic("success");
      setDone(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="result-screen" style={{ animation: "slide-in-up 0.4s ease both" }}>
        <div className="result-emoji" style={{ color: "#4ade80" }}><Check size={48}/></div>
        <h2 className="result-h">تم تفعيل الامتحان!</h2>
        <p className="muted">أُرسل الإعلان إلى {done.recipients} طالب.</p>
        <button className="btn btn-primary" onClick={onDone}>
          تمام
        </button>
      </div>
    );
  }

  // Preview + activate.
  if (key) {
    return (
      <div className="form" style={{ animation: "slide-in-up 0.4s ease both" }}>
        <button className="btn btn-ghost back-inline" onClick={() => setKey(null)}>
          ‹ إعادة الرفع
        </button>
        <h2 className="view-h">معاينة المفتاح</h2>
        <div className="key-preview">
          <div className="key-title icon-text"><Checklist size={16}/> {key.title || "امتحان"}</div>
          <div className="muted">الدرجة الكلية: {num(key.total_marks)}</div>
          {key.questions.map((q) => (
            <div className="q-block" key={q.number}>
              <div className="q-head">
                <span>
                  {q.number} — {q.title}
                </span>
                <span className="q-score">{num(q.max_marks)}</span>
              </div>
              {q.items.map((it: any, i: number) => (
                <div className="item item-ok" key={i}>
                  <div className="item-top">
                    <span className="item-q">{it.prompt}</span>
                    <span className="item-mark">{num(it.marks)}</span>
                  </div>
                  <div className="item-ans">
                    <span className="ans-key">{it.answer}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <input ref={qRef} type="file" accept="image/*" multiple hidden onChange={(e) => setQFiles(Array.from(e.target.files || []))} />
        <button className="dropzone" onClick={() => qRef.current?.click()}>
          <Camera size={20}/>
          {qFiles.length ? `${qFiles.length} صورة أسئلة` : "(اختياري) صور ورقة الأسئلة — بدون إجابات"}
        </button>

        {error && <div className="state state-error"><Alert size={16}/> {error}</div>}
        <button className="btn btn-primary" disabled={busy} onClick={activate}>
          {busy ? "⏳…" : <><Check size={16}/> تأكيد وتفعيل</>}
        </button>
      </div>
    );
  }

  // Upload key.
  return (
    <div className="form" style={{ animation: "slide-in-up 0.4s ease both" }}>
      <h2 className="view-h icon-text"><Checklist size={24}/> تسجيل امتحان جديد</h2>
      <p className="muted">ارفع صورة (أو صور) مفتاح الإجابة النموذجية وسأستخرجها.</p>
      <input ref={keyRef} type="file" accept="image/*" multiple hidden onChange={(e) => setKeyFiles(Array.from(e.target.files || []))} />
      <button className="dropzone" onClick={() => keyRef.current?.click()}>
        <Camera size={20}/>
        {keyFiles.length ? `${keyFiles.length} صورة مختارة` : "اختر صور مفتاح الإجابة"}
      </button>
      {error && <div className="state state-error"><Alert size={16}/> {error}</div>}
      <button className="btn btn-primary" disabled={!keyFiles.length || busy} onClick={extract}>
        {busy ? "⏳ جاري الاستخراج…" : "استخراج المفتاح"}
      </button>
    </div>
  );
}
