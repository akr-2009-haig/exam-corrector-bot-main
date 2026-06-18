# تقرير الأخطاء البرمجية والعناصر غير المنفّذة
# Exam Corrector Bot — Bug & Gap Analysis

> **تاريخ التحليل:** 18 يونيو 2026  
> **نطاق التحليل:** جميع ملفات المستودع (Bot + Mini App)

---

## ملخص تنفيذي

| الفئة | العدد |
|-------|-------|
| 🔴 أخطاء حرجة (Critical Bugs) | 4 |
| 🟠 ثغرات أمنية (Security Issues) | 3 |
| 🟡 أخطاء منطقية / وظائف معطوبة | 6 |
| 🔵 وثائق مضللة / README خاطئ | 3 |
| ⚪ مشاكل أداء (N+1 Queries) | 4 |
| ⚫ Placeholder / كود تجريبي في الإنتاج | 3 |
| **المجموع** | **23** |

---

## 🔴 الأخطاء الحرجة (Critical Bugs)

---

### [BUG-01] متغيرات البيئة في README مختلفة كلياً عن الكود الفعلي

**الملف:** `README.md` مقابل `miniapp/lib/gemini.ts`  
**الخطورة:** 🔴 حرجة — المشروع لن يشتغل بدون هذا الإصلاح

**المشكلة:**  
الـ README يطلب من المستخدم ضبط متغيرات بيئة لـ Google Gemini، لكن الكود الفعلي يستخدم **OpenRouter** وليس Gemini مباشرةً. من يتبع الـ README لن يستطيع تشغيل المشروع.

| الـ README يقول | الكود الفعلي يستخدم |
|----------------|---------------------|
| `GEMINI_API_KEY` | `OPENROUTER_API_KEY` |
| `GEMINI_MODEL` | `OPENROUTER_MODEL` |
| `GEMINI_GRADING_MODEL` | `OPENROUTER_GRADING_MODEL` |
| (غير موثق) | `OPENROUTER_FALLBACK_MODELS` |

**دليل من الكود:**
```typescript
// miniapp/lib/gemini.ts
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const apiKey = () => process.env.OPENROUTER_API_KEY || "";  // ← ليس GEMINI_API_KEY

export const MODELS = {
  extraction: () => process.env.OPENROUTER_MODEL || "google/gemini-3-flash-preview",
  grading: () => process.env.OPENROUTER_GRADING_MODEL || process.env.OPENROUTER_MODEL || ...
};
```

**التأثير:** المشروع يفشل تماماً في الاستخراج والتصحيح لأن المتغير `OPENROUTER_API_KEY` يكون فارغاً.

---

### [BUG-02] تناقض تام في تعليق `src/membership.ts`

**الملف:** `src/membership.ts`  
**الخطورة:** 🔴 حرجة — التعليق يصف سلوكاً معاكساً للكود

**المشكلة:**  
رأس الدالة يقول أن النتائج مخزنة مؤقتاً (Cached)، لكن الكود يقول صراحةً أنه لا توجد ذاكرة تخزين مؤقتة.

```typescript
/**
 * Results are cached so we don't call getChatMember on every message   ← التعليق يكذب
 */
export async function isChannelMember(...): Promise<boolean> {
  // NO caching — checked live against Telegram on EVERY operation     ← الحقيقة
  // ...
}
```

**التأثير الفعلي:**  
كل رسالة يرسلها أي مستخدم → طلب HTTP فوري لـ Telegram API للتحقق من العضوية. تحت الضغط، هذا يمكن أن يصل إلى حد Telegram API ويوقف البوت.

---

### [BUG-03] جميع أوامر البوت الموثّقة في README غير موجودة في الكود

**الملف:** `README.md` مقابل `index.ts`  
**الخطورة:** 🔴 حرجة — ميزات أساسية غير مُنفَّذة في البوت

**المشكلة:**  
الـ README يوثّق 8 أوامر للبوت، لكن `index.ts` لا ينفّذ منها إلا 3 فقط. والأسوأ أن `bot.on("message")` يلتقط كل رسالة غير معروفة ويعرض زر المنصة بدلاً من أي رد مفيد.

| الأمر | موثَّق في README | مُنفَّذ فعلياً |
|-------|:---:|:---:|
| `/start` | ✅ | ✅ |
| `/app` | ❌ | ✅ |
| `/open` | ❌ | ✅ |
| `/exams` | ✅ | ❌ |
| `/results` | ✅ | ❌ |
| `/history` | ✅ | ❌ |
| `/students` | ✅ | ❌ |
| `/new` | ✅ | ❌ |
| `/test` | ✅ | ❌ |
| `/cancel` | ✅ | ❌ |
| `/skip` | ✅ | ❌ |

**دليل من الكود:**
```typescript
// index.ts — هذا كل ما يوجد:
bot.start(safe("start", sendLauncher));
bot.command("app", safe("app", sendLauncher));
bot.command("open", safe("open", sendLauncher));

// أي رسالة أخرى → نفس الزر بدون أي معالجة مختلفة
bot.on("message", safe("msg", sendLauncher));
```

**التأثير:** طالب يكتب `/exams` أو `/results` داخل البوت يحصل فقط على زر "افتح التطبيق" بدون أي تفسير أو مساعدة.

---

### [BUG-04] خطأ في `CLAUDE.md` يتناقض مع الكود الفعلي

**الملف:** `CLAUDE.md` مقابل `artifacts/api-server/src/app.ts`  
**الخطورة:** 🔴 حرجة (إرشادات مضللة للمطورين)

**المشكلة:**  
`CLAUDE.md` يقول:
```
Use Bun.serve() — Don't use express.
```
لكن `artifacts/api-server` يستخدم **Express 5** كاملاً، وهذا موثّق في `replit.md` أيضاً. أي مطور جديد يتبع `CLAUDE.md` سيكتب كوداً لا يتوافق مع باقي المشروع.

---

## 🟠 الثغرات الأمنية (Security Issues)

---

### [SEC-01] بوابة مصادقة مفتوحة عبر `ALLOW_ANON=1`

**الملف:** `miniapp/lib/auth.ts`  
**الخطورة:** 🟠 عالية — تجاوز كامل للمصادقة

**المشكلة:**
```typescript
export function authUser(req: NextRequest): AuthedUser | null {
  const user = validateInitData(initData, process.env.BOT_TOKEN || "");
  if (user) return { ...user, isAdmin: isAdminId(user.id) };

  // ⚠️ إذا ALLOW_ANON=1 → أي شخص يتحكم في x-debug-id يصبح أي مستخدم
  if (process.env.ALLOW_ANON === "1") {
    const id = Number(req.headers.get("x-debug-id") || "1") || 1;
    return { id, first_name: "Tester", isAdmin: isAdminId(id) };
  }
  return null;
}
```

**السيناريو الخطر:**  
إذا تم نشر التطبيق بـ `ALLOW_ANON=1` بالخطأ، يستطيع أي شخص:
1. إرسال `x-debug-id: <ADMIN_ID>` → يصبح مشرفاً كاملاً
2. الوصول لجميع بيانات الطلاب
3. تفعيل/إلغاء الامتحانات
4. الموافقة على طلبات الإعادة

---

### [SEC-02] كود تجريبي (Demo Hook) مدمج في مسار الإنتاج

**الملف:** `miniapp/app/api/leaderboard/route.ts`  
**الخطورة:** 🟠 متوسطة

```typescript
// ⚠️ هذا في Production Code — ليس في ملف تطوير منفصل
if (
  process.env.ALLOW_ANON === "1" &&
  req.nextUrl.searchParams.get("demo") === "1"
) {
  celebration = { prevRank: 8, newRank: 5, pointsGained: 14.5, overtook: 3 };
}
```

يسمح لأي شخص بتفعيل نافذة "احتفال" وهمية إذا كان `ALLOW_ANON=1` فعّالاً. كود تشخيصي لا ينبغي وجوده في مسارات الإنتاج.

---

### [SEC-03] `window.location.search` يُضاف تلقائياً لكل طلبات API

**الملف:** `miniapp/app/tg.ts`  
**الخطورة:** 🟠 متوسطة

```typescript
export async function api<T = any>(path: string, opts = {}): Promise<T> {
  // ⚠️ initData التي تحتوي على بيانات المستخدم تُضاف كـ query string
  const res = await fetch(
    path + (path.includes("?") ? "" : window.location.search),
    { ... }
  );
}
```

`window.location.search` يحتوي على `initData` الخاص بـ Telegram الذي يتضمن معرّف المستخدم وبيانات الجلسة. إضافته كـ query parameter يجعله يظهر في سجلات (logs) الخادم وأي proxy وسيط، وهو مخالف لتوصيات Telegram التي تنص على إرسال `initData` كـ header فقط — وهو ما يفعله الكود فعلاً بـ `x-init-data` — لكنه يضيفه أيضاً في الـ URL بشكل غير ضروري.

---

## 🟡 أخطاء منطقية / وظائف معطوبة

---

### [BUG-05] المسابقات لا تنتهي تلقائياً بدون تدخل المستخدم

**الملف:** `miniapp/lib/db.ts` — `settleDueCompetitions()`  
**الخطورة:** 🟡 متوسطة

**المشكلة:**  
دالة `settleDueCompetitions()` التي تحسم المسابقات المنتهية تُستدعى فقط بشكل "كسول" (Lazy) من مسارات API:
- `GET /api/competitions`
- `GET /api/competitions/results`

لا يوجد `setInterval` أو Cron Job يستدعيها بشكل دوري. إذا لم يفتح أحد صفحة المسابقات، تبقى المسابقة في حالة "جارية" إلى الأبد، ولا يصل اللاعبون لنتائجهم.

```typescript
// ✅ يُستدعى فقط عند طلب API:
export async function GET(req): Promise<NextResponse> {
  settleDueCompetitions();  // ← كسول تماماً، بدون مؤقت مستقل
  return NextResponse.json({...});
}
```

**المقارنة:** البوت يُشغّل `drainOutbox` كل 3 ثواني عبر `setInterval` — نفس النمط مطلوب للمسابقات.

---

### [BUG-06] `drainOutbox` في البوت تستخدم `void` بدون معالجة للأخطاء

**الملف:** `index.ts`  
**الخطورة:** 🟡 منخفضة-متوسطة

```typescript
setInterval(() => void drainOutbox(), 3000);
```

`void` تتجاهل Promise الناتج. إذا رمت `drainOutbox` خطأً غير متوقع (مثل خطأ في قاعدة البيانات)، لن يُسجَّل أي شيء في السجلات. يجب استبدالها بـ:

```typescript
setInterval(() => drainOutbox().catch(err => console.error("[outbox] crash:", err)), 3000);
```

---

### [BUG-07] خطأ في حالة "الرسالة الفارغة" عند إخفاق تصحيح الورقة

**الملف:** `miniapp/app/api/exams/[id]/submit/route.ts`  
**الخطورة:** 🟡 متوسطة

```typescript
} catch {
  return NextResponse.json({ error: "تعذّر قراءة الصور المرفوعة." }, { status: 400 });
}
```

عدة `catch` في هذا المسار تبتلع الخطأ الأصلي بدون تسجيله:
- `catch` عند قراءة الـ FormData → الخطأ مفقود
- `catch` عند حفظ الصور → `console.error` موجود ✅ (لكن ليس في الأول)

**الخطر:** إذا فشل عملية ما لسبب غير متوقع، يحصل المطور على رسالة خطأ للمستخدم لكن بدون أي أثر في السجلات يساعد على التشخيص.

---

### [BUG-08] `maxDuration = 300` مرتبط بـ Vercel وقد لا يعمل على Bun

**الملفات:** `miniapp/app/api/exams/register/route.ts`, `miniapp/app/api/exams/[id]/submit/route.ts`  
**الخطورة:** 🟡 متوسطة

```typescript
export const maxDuration = 300;  // خاصية Vercel Edge Functions فقط
```

هذه الخاصية مخصصة لـ Vercel. المشروع يستخدم Bun وربما يُنشر على خادم مخصص. على Bun، يتجاهل Next.js هذا الإعداد ويستخدم مهلة افتراضية أقصر. يمكن أن يؤدي هذا لانقطاع مكالمات Gemini الطويلة بعد 30-60 ثانية.

---

### [BUG-09] دالة `adminIds()` مكررة في 4 أماكن مختلفة

**الملفات:**
- `src/config.ts` → `parseIds()`
- `miniapp/lib/db.ts` → `adminIds()`
- `miniapp/lib/auth.ts` → `adminIds()`
- `miniapp/app/api/exams/[id]/retake-request/route.ts` → `adminIds()`

**المشكلة:** إذا تغيّر منطق تحليل `ADMIN_IDS` (مثل دعم تنسيق جديد)، يجب تعديل 4 أماكن. أي نسيان = خطأ صامت.

```typescript
// نفس الكود يُكرر 4 مرات:
function adminIds(): number[] {
  return (process.env.ADMIN_IDS || "")
    .split(/[,\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n !== 0);
}
```

---

### [BUG-10] المنطقة الزمنية (Timezone) مُرمَّزة ثابتة لبغداد

**الملف:** `miniapp/app/api/leaderboard/route.ts`  
**الخطورة:** 🟡 منخفضة

```typescript
/** Iraq is UTC+3 all year (no DST). */
const BAGHDAD_OFFSET_MS = 3 * 60 * 60 * 1000;  // ← ثابت غير قابل للتهيئة
```

حساب بداية الأسبوع والشهر للتصنيف مرتبط ببغداد (UTC+3) بشكل صلب في الكود. إذا استخدم أستاذ المنصةَ من منطقة زمنية مختلفة، تكون نقاط "الأسبوع الحالي" و"الشهر الحالي" مبنية على توقيت بغداد وليس توقيته.

---

## 🔵 وثائق مضللة / README خاطئ

---

### [DOC-01] الـ README يصف البنية القديمة للبوت وليس الحالية

**الملف:** `README.md`  
**الخطورة:** 🔵 إرشادات مضللة

الـ README يصف بالتفصيل كيف يعالج البوت الصور مباشرةً ويُصحّح الامتحانات — وهو ما كان يحدث في **النسخة القديمة**. في الكود الحالي:
- البوت لا يعالج أي صورة
- البوت لا يتصل بـ Gemini إطلاقاً
- البوت لا يعرف شيئاً عن الامتحانات أو الإجابات
- كل هذا انتقل للـ Mini App

**أقسام README التي تصف ميزات غير موجودة في البوت:**
- "📷 سير عمل المعلم" كاملاً
- "📝 سير عمل الطالب" كاملاً
- "🔄 سياسة المحاولات وإعادة الامتحان"
- "⚡ أداء عالي في الخلفية" (يصف Semaphore للـ Gemini في البوت)

---

### [DOC-02] متغيرات بيئة مفقودة كلياً من README

**الملف:** `README.md`  
**الخطورة:** 🔵

المتغيرات التالية ضرورية للتشغيل الكامل لكنها غائبة عن قسم "متغيرات البيئة":

| المتغير | الوحدة | الوصف |
|---------|--------|-------|
| `MINIAPP_URL` | Bot + Mini App | رابط الـ Mini App |
| `OPENROUTER_API_KEY` | Mini App | **مفتاح AI الرئيسي** |
| `OPENROUTER_MODEL` | Mini App | نموذج الاستخراج |
| `OPENROUTER_GRADING_MODEL` | Mini App | نموذج التصحيح |
| `OPENROUTER_FALLBACK_MODELS` | Mini App | نماذج احتياطية |
| `REQUIRED_CHANNEL_ID` | Bot + Mini App | قناة العضوية |
| `REQUIRED_CHANNEL_USERNAME` | Bot + Mini App | اسم قناة العضوية |
| `UPLOAD_DIR` | Mini App | مجلد حفظ الصور |
| `SCORE_SPEED_TIERS` | Mini App | طبقات مكافأة السرعة |
| `SCORE_LOYALTY_STEP` | Mini App | خطوة مكافأة الوفاء |
| `SCORE_LOYALTY_CAP` | Mini App | حد أعلى مكافأة الوفاء |
| `COMP_STAKES` | Mini App | رهانات المسابقات |

---

### [DOC-03] أوامر البوت الموثّقة غير صحيحة حتى لقسم "تيليجرام"

**الملف:** `README.md`  
**الخطورة:** 🔵

الجدول في الـ README يعرض الأوامر كأنها موجودة في البوت التليجرامي. لكن الحقيقة أن كل هذه الوظائف أصبحت داخل الـ Mini App. المستخدم الجديد الذي يقرأ README ويجرب `/exams` في البوت سيحصل فقط على زر "افتح التطبيق" بدون أي شرح.

---

## ⚪ مشاكل الأداء — N+1 Queries

---

### [PERF-01] N+1 في `leaderboard()` — استعلام منفصل لكل مستخدم

**الملف:** `miniapp/lib/db.ts`

```typescript
const examCount = getDb().prepare(
  `SELECT COUNT(DISTINCT exam_id) AS c FROM submissions WHERE ...`
);

return rows.map((r) => ({
  ...r,
  exams: (examCount.get(r.userId) as { c: number }).c,  // ← N استعلام!
}));
```

إذا كان التصنيف يضم 100 طالب → 101 استعلام بدلاً من 2.

---

### [PERF-02] N+1 في `/api/competitions` — استعلامان لكل مسابقة

**الملف:** `miniapp/app/api/competitions/route.ts`

```typescript
const competitions = listCompetitions().map((c) => {
  const entries = competitionEntries(c.id);  // ← استعلام لكل مسابقة
  const mine = userEntry(c.id, user.id);     // ← استعلام آخر لكل مسابقة
  return { ... };
});
```

إذا كانت هناك 60 مسابقة → 121 استعلام.

---

### [PERF-03] N+1 في `/api/retakes` — 3 استعلامات لكل طلب إعادة

**الملف:** `miniapp/app/api/retakes/route.ts`

```typescript
const requests = listPendingRetakeRequests().map((r) => {
  const prior = lastSubmissionForExam(r.exam_id, r.user_id);  // استعلام 1
  return {
    examTitle: getExam(r.exam_id)?.key.title || "امتحان",       // استعلام 2
    studentName: resolveName(getUser(r.user_id), r.user_id),   // استعلام 3
  };
});
```

لكل طلب معلّق: 3 استعلامات. إذا كان هناك 20 طلب → 61 استعلام.

---

### [PERF-04] N+1 في `competitionTeams()` — استعلامان لكل لاعب

**الملف:** `miniapp/lib/db.ts`

```typescript
for (const e of competitionEntries(comp.id)) {
  const points = Math.round(examPointsInWindow(e.user_id, from, to) * 10) / 10;  // استعلام 1
  const bucket = byTeam[e.team] ?? byTeam[1]!;
  bucket.members.push({
    name: resolveName(getUser(e.user_id), e.user_id),  // استعلام 2
    points
  });
}
```

لكل لاعب في المسابقة: استعلامان. في مسابقة من 8 لاعبين → 17 استعلام لعرض الفرق.

---

## ⚫ Placeholder / كود غير مكتمل / تجريبي في الإنتاج

---

### [PLHD-01] كود Demo صلب داخل مسار API الإنتاجي

**الملف:** `miniapp/app/api/leaderboard/route.ts`  
**الخطورة:** ⚫

```typescript
// Demo hook for local testing only (needs ALLOW_ANON=1, never in prod).
if (
  process.env.ALLOW_ANON === "1" &&
  req.nextUrl.searchParams.get("demo") === "1"
) {
  // بيانات ثابتة مُرمَّجة داخل كود الإنتاج
  celebration = { prevRank: 8, newRank: 5, pointsGained: 14.5, overtook: 3 };
}
```

هذا كود اختبار يجب أن يكون في ملف تطوير منفصل أو يُحذف قبل النشر.

---

### [PLHD-02] `selected_exam_id` في جدول `users` لا يُكتب من أي مكان

**الملف:** `src/db.ts` + `miniapp/lib/db.ts`  
**الخطورة:** ⚫ عمود Placeholder لم يُكتمل

```sql
-- src/db.ts: العمود موجود في Schema
CREATE TABLE IF NOT EXISTS users (
  ...
  selected_exam_id TEXT,   -- ← لا يوجد أي كود يكتب هنا
  ...
);
```

عبر كامل الكود (Bot + Mini App) لا توجد أي عملية تكتب في `selected_exam_id`. العمود مُعرَّف لكنه لا يُستخدم لأي غرض حالياً.

---

### [PLHD-03] `randomUUID` يُصدَّر من `src/db.ts` لكنه لا يُستخدم هناك

**الملف:** `src/db.ts`  
**الخطورة:** ⚫ كود عشوائي

```typescript
import { randomUUID } from "crypto";
// ... (لا يوجد أي استخدام لـ randomUUID داخل الملف)
export { db, randomUUID };  // ← يُصدَّر رغم عدم استخدامه داخلياً
```

`randomUUID` مستوردة من `crypto` فقط لإعادة تصديرها. هذا يربط `db.ts` بمسؤولية لا علاقة لها بقاعدة البيانات.

---

## جدول ملخص المشاكل حسب الملف

| الملف | عدد المشاكل | أبرز مشكلة |
|-------|:-----------:|------------|
| `README.md` | 3 | وثائق تصف نظاماً مختلفاً كلياً |
| `src/membership.ts` | 1 | تعليق يكذب على الكود |
| `index.ts` | 2 | أوامر README غير موجودة + void بلا معالجة |
| `src/db.ts` | 2 | عمود غير مستخدم + export غير ضروري |
| `miniapp/lib/auth.ts` | 1 | بوابة مصادقة مفتوحة |
| `miniapp/lib/db.ts` | 3 | N+1 × 2 + adminIds() مكررة |
| `miniapp/lib/gemini.ts` | 1 | الاسم "gemini" لكنه OpenRouter |
| `miniapp/app/api/leaderboard/route.ts` | 2 | Demo hook + Timezone مُرمَّز |
| `miniapp/app/api/competitions/route.ts` | 1 | N+1 queries |
| `miniapp/app/api/exams/[id]/submit/route.ts` | 2 | maxDuration + error swallowing |
| `miniapp/app/api/retakes/route.ts` | 1 | N+1 queries |
| `CLAUDE.md` | 1 | يتناقض مع الكود (Express vs Bun.serve) |

---

## التوصيات حسب الأولوية

### أولوية 1 — يمنع التشغيل (يجب إصلاحه أولاً)
1. **[BUG-01]** تصحيح README: `GEMINI_*` → `OPENROUTER_*`
2. **[DOC-02]** إضافة جميع متغيرات البيئة المفقودة لـ README

### أولوية 2 — ثغرات أمنية
3. **[SEC-01]** إزالة `ALLOW_ANON` من production أو حمايته بضمانات إضافية
4. **[PLHD-01] + [SEC-02]** حذف كود Demo من مسار الإنتاج

### أولوية 3 — تجربة المستخدم
5. **[BUG-03]** إما تنفيذ الأوامر في البوت أو تحديث README
6. **[BUG-02]** تصحيح تعليق `membership.ts` أو إضافة Caching فعلي
7. **[BUG-05]** إضافة `setInterval` لـ `settleDueCompetitions` في البوت

### أولوية 4 — جودة الكود
8. **[BUG-09]** توحيد `adminIds()` في دالة مشتركة واحدة
9. **[PERF-01 ~ 04]** تحسين N+1 Queries بـ JOINs أو batch queries
10. **[BUG-06]** إضافة `.catch()` لـ `drainOutbox` في `setInterval`

---

*وثيقة تحليلية تقنية — مبنية على قراءة كاملة للكود المصدري.*
