"use client";

/**
 * Shows a celebratory (win) or consoling (loss/tie) toast when the user opens
 * the app after a competition they were in has finished. Fetched once; the
 * result is marked seen server-side so it only appears a single time.
 */
import { useEffect, useState } from "react";
import { api, haptic } from "../tg";
import { num } from "../fmt";

interface Result {
  competitionId: string;
  title: string;
  format: number;
  won: boolean;
  tie: boolean;
  amount: number;
  stake: number;
}

export default function ResultToast() {
  const [r, setR] = useState<Result | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    api<{ result: Result | null }>("/api/competitions/results")
      .then((d) => {
        if (d.result) {
          setR(d.result);
          haptic(d.result.won ? "success" : d.result.tie ? "warning" : "error");
        }
      })
      .catch(() => {});
  }, []);

  if (!r) return null;

  const close = () => {
    setClosing(true);
    setTimeout(() => setR(null), 250);
  };

  const kind = r.won ? "win" : r.tie ? "tie" : "loss";
  const emoji = r.won ? "🏆" : r.tie ? "🤝" : "😔";
  const heading = r.won ? "مبروك! فاز فريقك" : r.tie ? "تعادل!" : "انتهت المسابقة";
  const body = r.won
    ? `ربحت ${num(r.amount)} نقطة في «${r.title}»`
    : r.tie
      ? `أُعيدت نقاط رهانك (${num(r.stake)}) في «${r.title}»`
      : `فاز الفريق الآخر في «${r.title}» هذه المرة`;

  return (
    <div className={`toast-backdrop ${closing ? "toast-out" : ""}`} onClick={close}>
      <div className={`toast-card toast-${kind}`} onClick={(e) => e.stopPropagation()}>
        <div className="toast-emoji">{emoji}</div>
        <div className="toast-heading">{heading}</div>
        <div className="toast-body">{body}</div>
        <button className="btn btn-primary" onClick={close}>
          {r.won ? "رائع! 🎉" : "حسنًا"}
        </button>
      </div>
    </div>
  );
}
