"use client";

/**
 * المسابقات — team competitions. Four formats (2/4/6/8 players → two teams).
 *
 * Navigation: list → FmtView → CompDetail, all via Telegram's native BackButton.
 *
 * Admin flow:  tap format card → FmtView → fill start/end times → Create
 * Student flow: tap format card → FmtView → Join (if active comp exists)
 */
import { useEffect, useState } from "react";
import { api, haptic } from "../tg";
import { useBackEntry } from "../nav";
import { num, fmtRelative, fmtDateTime } from "../fmt";
import { StarCoin, Trophy, Target, Swords, Play, Unlock, Plus, Handshake, Undo, Check, Clock, Calendar, Shield, Fire } from "../icons";
import Loader from "./Loader";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Fmt {
  format: number;
  teamSize: number;
  stake: number;
  prizePerWinner: number;
  name: string;
}
interface Comp {
  id: string;
  title: string;
  format: number;
  teamSize: number;
  stake: number;
  prizePerWinner: number;
  pot: number;
  players: number;
  status: string;
  phase: string;
  startsAt: number;
  endsAt: number;
  winnerTeam: number | null;
  joined: boolean;
  myTeam: number | null;
}
interface ListResp {
  formats: Fmt[];
  competitions: Comp[];
  isAdmin: boolean;
  balance: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FORMAT_ICON = (format: number, size = 28) => {
  if (format === 2) return <Swords size={size} />;
  if (format === 4) return <Handshake size={size} />;
  if (format === 6) return <Shield size={size} />;
  if (format >= 8) return <Fire size={size} />;
  return <Target size={size} />;
};

function toDatetimeLocal(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function nowRounded(): number {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.getTime();
}

// ─── Root component ──────────────────────────────────────────────────────────

export default function Competition({ isAdmin }: { isAdmin: boolean }) {
  const [data, setData] = useState<ListResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "fmt" | "detail">("list");
  const [openFmt, setOpenFmt] = useState<Fmt | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = () =>
    api<ListResp>("/api/competitions").then(setData).catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  function goFmt(f: Fmt) { setOpenFmt(f); setView("fmt"); }
  function goDetail(id: string) { setOpenId(id); setView("detail"); }
  function goList() { setOpenFmt(null); setOpenId(null); setView("list"); load(); }
  function goDetailFromFmt(id: string) { setOpenId(id); setView("detail"); }

  if (error) return <div className="state state-error">⚠️ {error}</div>;
  if (!data) return <Loader />;

  const activeByFormat: Record<number, Comp | undefined> = {};
  for (const c of data.competitions) {
    if ((c.status === "open" || c.status === "running") && !activeByFormat[c.format]) {
      activeByFormat[c.format] = c;
    }
  }
  const finished = data.competitions
    .filter((c) => c.status === "settled" || c.status === "cancelled")
    .slice(0, 6);

  if (view === "detail" && openId) {
    return (
      <CompDetail
        id={openId}
        onBack={() => { setView(openFmt ? "fmt" : "list"); load(); }}
      />
    );
  }

  if (view === "fmt" && openFmt) {
    const active = activeByFormat[openFmt.format];
    return (
      <FmtView
        fmt={openFmt}
        active={active}
        isAdmin={isAdmin}
        balance={data.balance}
        onBack={() => { setView("list"); load(); }}
        onDetail={goDetailFromFmt}
        onCreated={(id) => { goDetailFromFmt(id); }}
      />
    );
  }

  // ── Format list ───────────────────────────────────────────────────────────
  return (
    <div className="comp-home">
      <div className="balance-bar">⚡ رصيدك: <b>{num(data.balance)}</b> نقطة</div>

      <div className="fmt-list">
        {data.formats.map((f) => {
          const active = activeByFormat[f.format];
          const ph = active?.phase;
          const fmtClass = `fmt-f${f.format}`;
          const status =
            ph === "live" ? (
              <span className="fmt-stat fmt-stat-live">
                <span className="fmt-dot" /> جارية
              </span>
            ) : ph === "open" ? (
              <span className="fmt-stat fmt-stat-open">
                <span className="fmt-dot" /> {active!.players}/{active!.format}
                {active!.joined && <Check size={12} />}
              </span>
            ) : isAdmin ? (
              <span className="fmt-stat fmt-stat-new">
                <Plus size={12} /> إنشاء
              </span>
            ) : (
              <span className="fmt-stat fmt-stat-none">—</span>
            );
          return (
            <button
              key={f.format}
              className={`fmt-card ${fmtClass} ${ph === "live" ? "fmt-card-live" : ph === "open" ? "fmt-card-open" : ""}`}
              onClick={() => goFmt(f)}
            >
              <div className="fmt-card-head">
                <span className="fmt-card-icon">{FORMAT_ICON(f.format, 26)}</span>
                <div className="fmt-card-titles">
                  <div className="fmt-card-name">{f.name}</div>
                  <div className="fmt-card-mode">{num(f.teamSize)} ضد {num(f.teamSize)}</div>
                </div>
                {status}
              </div>
              <div className="fmt-card-econ">
                <div className="fmt-econ-item">
                  <span className="fmt-econ-val"><StarCoin tone="silver" size={15} /> {num(f.stake)}</span>
                  <span className="fmt-econ-label">الدخول</span>
                </div>
                <div className="fmt-econ-sep" />
                <div className="fmt-econ-item">
                  <span className="fmt-econ-val gold"><Trophy size={15} /> {num(f.prizePerWinner)}</span>
                  <span className="fmt-econ-label">للفائز</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {finished.length > 0 && (
        <>
          <div className="standings-h"><Swords size={18} /> آخر المعارك</div>
          <div className="exam-list">
            {finished.map((c) => (
              <button className="exam-card tappable" key={c.id} onClick={() => goDetail(c.id)}>
                <div className="exam-card-main">
                  <div className="exam-title"><Target size={16} /> {c.title}</div>
                  <div className="exam-meta">
                    {c.status === "cancelled"
                      ? <span className="icon-text"><Undo size={14}/> ملغاة</span>
                      : c.winnerTeam === 0
                        ? <span className="icon-text"><Handshake size={14}/> تعادل</span>
                        : <span className="icon-text"><Trophy size={14}/> فاز الفريق {c.winnerTeam}</span>}
                    {c.joined && c.winnerTeam !== 0 && c.status === "settled" && (
                      c.myTeam === c.winnerTeam
                        ? <span className="badge badge-green"><Check size={14}/> فزت</span>
                        : <span className="badge badge-red">خسرت</span>
                    )}
                  </div>
                </div>
                <span className="fmt-row-arrow">›</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── FmtView: format detail + create form (admin) or join (student) ──────────

function FmtView({
  fmt,
  active,
  isAdmin,
  balance,
  onBack,
  onDetail,
  onCreated,
}: {
  fmt: Fmt;
  active: Comp | undefined;
  isAdmin: boolean;
  balance: number;
  onBack: () => void;
  onDetail: (id: string) => void;
  onCreated: (id: string) => void;
}) {
  useBackEntry(true, onBack);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const defaultStarts = nowRounded() + 60 * 60 * 1000;
  const defaultEnds = defaultStarts + 24 * 60 * 60 * 1000;
  const [startsVal, setStartsVal] = useState(toDatetimeLocal(defaultStarts));
  const [endsVal, setEndsVal] = useState(toDatetimeLocal(defaultEnds));
  const nowMin = toDatetimeLocal(nowRounded());

  async function handleCreate() {
    setNotice(null);
    const startsAt = new Date(startsVal).getTime();
    const endsAt = new Date(endsVal).getTime();
    if (isNaN(startsAt) || isNaN(endsAt)) {
      setNotice("يرجى اختيار وقتَي البداية والنهاية.");
      return;
    }
    if (startsAt >= endsAt) {
      setNotice("وقت النهاية يجب أن يكون بعد وقت البداية.");
      return;
    }
    if (endsAt <= Date.now()) {
      setNotice("وقت النهاية في الماضي.");
      return;
    }
    setBusy(true);
    try {
      const { id } = await api<{ id: string }>("/api/competitions", {
        body: { format: fmt.format, startsAt, endsAt },
      });
      haptic("success");
      onCreated(id);
    } catch (e: any) {
      haptic("error");
      setNotice(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!active) return;
    setNotice(null);
    setJoining(true);
    try {
      await api(`/api/competitions/${active.id}/join`, { body: {} });
      haptic("success");
      onDetail(active.id);
    } catch (e: any) {
      haptic("error");
      setNotice(e.message);
      setJoining(false);
    }
  }

  return (
    <div className="fmt-view">
      <div className="fmt-view-header">
        <span className="fmt-view-icon">{FORMAT_ICON(fmt.format, 36)}</span>
        <div>
          <div className="fmt-view-title">{fmt.name}</div>
          <div className="fmt-view-sub">
            فريقان من {fmt.teamSize} لاعب • رهان {num(fmt.stake)} نقطة للفرد
          </div>
        </div>
      </div>

      <div className="comp-stats">
        <div className="cstat">
          <div className="cstat-v">{num(fmt.stake)}</div>
          <div className="cstat-l">الرهان</div>
        </div>
        <div className="cstat">
          <div className="cstat-v">{num(fmt.prizePerWinner)}</div>
          <div className="cstat-l">للفائز</div>
        </div>
        <div className="cstat">
          <div className="cstat-v">{fmt.format}</div>
          <div className="cstat-l">لاعبون</div>
        </div>
      </div>

      {notice && <div className="state state-error">{notice}</div>}

      {active ? (
        <div className="fmt-active-box">
          <div className="fmt-active-phase">
            {active.phase === "live"
              ? <span className="icon-text"><Play size={16}/> جارية • تنتهي {fmtRelative(active.endsAt)}</span>
              : <span className="icon-text"><Unlock size={16}/> مفتوحة للاشتراك • {active.players}/{active.format} منضمّ</span>}
          </div>
          {active.startsAt > 0 && (
            <div className="fmt-active-times icon-text">
              <Calendar size={14}/> {fmtDateTime(active.startsAt)} &rarr; {fmtDateTime(active.endsAt)}
            </div>
          )}
          <div className="fmt-active-balance icon-text">
            <StarCoin size={14}/> رصيدك: <b>{num(balance)}</b> نقطة
            {active.joined && active.myTeam ? ` • الفريق ${active.myTeam} ✅` : ""}
          </div>

          {!isAdmin && !active.joined && active.phase === "open" && (
            <button
              className="btn btn-primary"
              disabled={busy || joining || balance < active.stake}
              onClick={handleJoin}
            >
              {balance < active.stake
                ? `نقاطك غير كافية (تحتاج ${num(active.stake)})`
                : joining
                  ? "جارٍ الاشتراك…"
                  : `🎟 اشترك بـ ${num(active.stake)} نقطة`}
            </button>
          )}
          {!isAdmin && active.joined && (
            <div className="state">✅ أنت مشترك في الفريق {active.myTeam}</div>
          )}
          {!isAdmin && !active.joined && active.phase !== "open" && (
            <div className="state">المسابقة جارية — لا يمكن الانضمام الآن.</div>
          )}

          <button className="btn btn-secondary" onClick={() => onDetail(active.id)}>
            عرض التفاصيل والفرق ›
          </button>
        </div>
      ) : isAdmin ? (
        <div className="fmt-create-form">
          <div className="fmt-form-title">➕ إنشاء مسابقة جديدة</div>

          <div className="fmt-datetime-group">
            <label>🕐 وقت البداية</label>
            <input
              type="datetime-local"
              className="fmt-datetime-input"
              min={nowMin}
              value={startsVal}
              onChange={(e) => setStartsVal(e.target.value)}
            />
          </div>

          <div className="fmt-datetime-group">
            <label>🏁 وقت الانتهاء</label>
            <input
              type="datetime-local"
              className="fmt-datetime-input"
              min={startsVal || nowMin}
              value={endsVal}
              onChange={(e) => setEndsVal(e.target.value)}
            />
          </div>

          <div className="fmt-form-note">
            يُخصم {num(fmt.stake)} نقطة عند الانضمام • الفائز يحصل على {num(fmt.prizePerWinner)} نقطة
          </div>

          <button className="btn btn-primary" disabled={busy} onClick={handleCreate}>
            {busy ? "جارٍ الإنشاء…" : `🚀 إنشاء المسابقة`}
          </button>
        </div>
      ) : (
        <div className="state">
          ⏳ لا توجد معركة نشطة الآن. ترقّب الإطلاق!
        </div>
      )}
    </div>
  );
}

// ─── CompDetail ───────────────────────────────────────────────────────────────

function CompDetail({ id, onBack }: { id: string; onBack: () => void }) {
  useBackEntry(true, onBack);

  const [d, setD] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = () => api(`/api/competitions/${id}`).then(setD).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]);

  async function act(fn: () => Promise<any>) {
    setBusy(true);
    setNotice(null);
    try {
      await fn();
      haptic("success");
      await load();
    } catch (e: any) {
      haptic("error");
      setNotice(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="state state-error">⚠️ {error}</div>;
  if (!d) return <Loader />;

  const lobbyFull = d.players >= d.format;

  return (
    <div className="comp-detail" style={{ animation: "slide-in-up 0.4s ease both" }}>
      <h2 className="view-h"><Target size={20} /> {d.title}</h2>
      <div className="comp-phase-big">
        {d.phase === "open"
          ? <span className="icon-text"><Unlock size={18}/> مفتوحة للاشتراك • {d.players}/{d.format}</span>
          : d.phase === "live"
            ? <span className="icon-text"><Play size={18}/> جارية • تنتهي {fmtRelative(d.endsAt)}</span>
            : d.phase === "ended"
              ? <span className="icon-text"><Clock size={18}/> بانتظار إعلان النتيجة</span>
              : d.phase === "cancelled"
                ? <span className="icon-text"><Undo size={18}/> ملغاة</span>
                : d.winnerTeam === 0
                  ? <span className="icon-text"><Handshake size={18}/> انتهت بالتعادل</span>
                  : <span className="icon-text"><Trophy size={18}/> فاز الفريق {d.winnerTeam}</span>}
      </div>

      <div className="comp-stats">
        <div className="cstat"><div className="cstat-v">{num(d.pot)}</div><div className="cstat-l">مجموع الجائزة</div></div>
        <div className="cstat"><div className="cstat-v">{num(d.stake)}</div><div className="cstat-l">الرهان</div></div>
        <div className="cstat"><div className="cstat-v">{num(d.prizePerWinner)}</div><div className="cstat-l">لكل فائز</div></div>
      </div>

      <div className="comp-window">
        فريقان من {d.teamSize} لاعب — الفريق صاحب أعلى نقاط امتحانات خلال المسابقة يفوز.
        {d.startsAt > 0 && <><br /><span className="icon-text"><Calendar size={14}/> {fmtDateTime(d.startsAt)} → {fmtDateTime(d.endsAt)}</span></>}
      </div>

      <div className="balance-bar icon-text">
        <StarCoin size={16}/> رصيدك: <b>{num(d.balance)}</b> نقطة
        {d.myTeam ? ` • أنت في الفريق ${d.myTeam}` : ""}
      </div>

      {notice && <div className="state state-error">{notice}</div>}

      {!d.joined && d.phase === "open" && (
        <button
          className="btn btn-primary"
          disabled={busy || d.balance < d.stake || lobbyFull}
          onClick={() => act(() => api(`/api/competitions/${id}/join`, { body: {} }))}
        >
          {d.balance < d.stake
            ? "نقاطك لا تكفي للرهان"
            : lobbyFull
              ? "اكتمل العدد"
              : <span className="icon-text"><StarCoin tone="silver" size={16}/> اشترك بـ {num(d.stake)} نقطة</span>}
        </button>
      )}

      <div className="teams">
        {(d.teams || []).map((t: any) => (
          <div
            className={`team-box ${d.winnerTeam === t.team ? "team-win" : ""} ${d.myTeam === t.team ? "team-mine" : ""}`}
            key={t.team}
          >
            <div className="team-head">
              <span>الفريق {t.team}{d.myTeam === t.team ? " (فريقك)" : ""}</span>
              <span className="team-total">{num(t.total)} نقطة</span>
            </div>
            {t.members.length === 0 && <div className="team-empty">لا أحد بعد</div>}
            {t.members.map((m: any, i: number) => (
              <div className={`team-member ${m.isMe ? "me" : ""}`} key={i}>
                <span>{m.name}</span>
                <span className="tm-pts">{num(m.points)}</span>
              </div>
            ))}
            {Array.from({ length: Math.max(0, d.teamSize - t.members.length) }).map((_, i) => (
              <div className="team-member slot" key={`s${i}`}>
                <span>مقعد شاغر</span>
                <span>—</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {d.isAdmin && (d.phase === "open" || d.phase === "live" || d.phase === "ended") && (
        <div className="admin-actions">
          {(d.phase === "live" || d.phase === "ended") && (
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => {
                if (confirm("إنهاء المسابقة وإعلان الفائز الآن؟"))
                  act(() => api(`/api/competitions/${id}/settle`, { body: {} }));
              }}
            >
              🏆 إنهاء وإعلان الفائز
            </button>
          )}
          <button
            className="btn btn-danger"
            disabled={busy}
            onClick={() => {
              if (confirm("إلغاء المسابقة وإعادة كل الرهانات؟"))
                act(() => api(`/api/competitions/${id}/settle`, { body: { cancel: true } }));
            }}
          >
            ↩️ إلغاء وإعادة الرهانات
          </button>
        </div>
      )}
    </div>
  );
}
