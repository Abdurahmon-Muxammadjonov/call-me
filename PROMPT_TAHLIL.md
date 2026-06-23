# Prompt — Backend: tahlil (deep audit) to'liq va professional bo'lsin

> `/Users/macbook/procell-backend` da ochilgan Claude'ga to'liq nusxalang.
> Frontend (`prosell`) allaqachon tayyor — quyidagilarni backendga qo'shsangiz,
> chuqur tahlil, audio qayta eshitish, to'g'ri davomiylik va o'chirilgan
> operatorlarni yashirish **100% ishlaydi**.
> Backend: Express + Supabase + Gemini, port **5001**.

Frontend hozir `GET /api/calls/:id` dan quyidagi maydonlarni o'qiydi (bo'lmasa
nazokat bilan yashiradi). Vazifa — backend ularni **saqlasin va qaytarsin**.

---

## 1. ❗ Duration noto'g'ri (27 daqiqa → 1:58 bo'lib qolyapti)

Hozir `calls.duration` Gemini taxminidan yoki noto'g'ri manbadan olinyapti. U
audioning **haqiqiy** uzunligi (sekundlarda) bo'lishi kerak.

**Bajaring (`analyze-call.ts`):** audio uzunligini fayl/streamdan o'lchang, Gemini
javobidan emas. Eng ishonchlisi `ffprobe` (ffmpeg):

```ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileP = promisify(execFile);

async function getAudioDurationSec(input: string): Promise<number> {
  // input — lokal fayl yo'li yoki to'g'ridan-to'g'ri URL (ffprobe ikkalasini ham oladi)
  const { stdout } = await execFileP('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', input,
  ]);
  const sec = Math.round(parseFloat(stdout.trim()));
  return Number.isFinite(sec) && sec > 0 ? sec : 0;
}
```

`calls` insert'ida `duration: await getAudioDurationSec(audioPathOrUrl)` qiling
(Gemini bergan `metrics.duration` ni ishlatmang). ffprobe bo'lmasa, audio
bufferdan `music-metadata` paketi bilan ham olsa bo'ladi.

> Frontend qo'shimcha himoya sifatida audioning haqiqiy uzunligini o'zi ham
> `<audio>` metadata'sidan o'qib ko'rsatadi — lekin bazada ham to'g'ri tursin.

---

## 2. Boyitilgan tahlil bloklari (Xulosa / Mijoz / Kelishuv / Keyingi qadamlar)

Frontend `GET /api/calls/:id` da quyidagi **ixtiyoriy** maydonlarni kutadi:

```jsonc
{
  "summary":         "Xulosa — menejer nima qildi, qayerda xato qildi (ko'p qatorli)",
  "client_info":     "Mijoz haqida ma'lumot (biznesi, muammosi, maqsadi)",
  "final_agreement": "Oxirgi kelishuv (tarif, summa, zakolat, vaqt)",
  "next_steps":      ["1-qadam", "2-qadam", "..."]
}
```

### 2a. SQL

```sql
alter table public.calls add column if not exists summary         text;
alter table public.calls add column if not exists client_info     text;
alter table public.calls add column if not exists final_agreement text;
alter table public.calls add column if not exists next_steps       jsonb;  -- string[] sifatida
notify pgrst, 'reload schema';
```

### 2b. Gemini RESPONSE_SCHEMA ga qo'shing (va kerakli joyda `required` ga)

```ts
summary:         { type: SchemaType.STRING, description: "Qo'ng'iroq xulosasi: kuchli/zaif tomonlar, xatolar" },
client_info:     { type: SchemaType.STRING, description: "Mijoz haqida: biznesi, muammosi, maqsadi, byudjeti" },
final_agreement: { type: SchemaType.STRING, description: "Oxirgi kelishuv: tarif, summa, zakolat, qayta bog'lanish vaqti" },
next_steps:      { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Aniq keyingi qadamlar" },
```

System prompt'ga ko'rsatma qo'shing (frontend kutayotgan format — mijozga
namuna): *"`summary` da menejer nimani yaxshi va nimani noto'g'ri qilganini yoz;
`client_info` da mijoz biznesi/muammosi/maqsadi; `final_agreement` da yakuniy
kelishuv (tarif, summa, zakolat, vaqt); `next_steps` da raqamli aniq qadamlar."*

### 2c. Saqlash va qaytarish

`calls` insert'iga `summary, client_info, final_agreement, next_steps` ni qo'shing.
`GET /api/calls/:id` `select('*')` bo'lsa avtomatik qaytadi. Bundan tashqari
[`BACKEND_PROMPT.md`](./BACKEND_PROMPT.md) 2-bo'limidagi `transcript`, `sentiment`,
`risk`, `call_criteria_scores` ham saqlanishi shart (chuqur tahlilning mezon-mezon
breakdown'i va transkripsiyasi shulardan keladi).

---

## 3. O'chirilgan operatorlarning qo'ng'iroqlari ko'rinmasin

Operator (`users`/`managers`) o'chirilsa, uning qo'ng'iroqlari va tahlillari
hech qayerda chiqmasligi kerak.

**Variant A (tavsiya) — cascade:** `calls.manager_id` FK'ga `on delete cascade`:

```sql
alter table public.calls drop constraint if exists calls_manager_id_fkey;
alter table public.calls
  add constraint calls_manager_id_fkey
  foreign key (manager_id) references public.managers(id) on delete cascade;
```

**Variant B — server filtri:** `GET /api/calls` da faqat mavjud menejernikini
qaytaring (join yoki `manager_id in (select id from managers)`).

> Frontend qo'shimcha himoya sifatida menejerlar ro'yxatida yo'q `manager_id` li
> qo'ng'iroqlarni allaqachon yashiradi — lekin backendda ham tozalansa to'g'ri.

---

## 4. manager_id IXTIYORIY bo'lsin (hozircha test tahlil uchun)

Frontend endi menejer tanlamasdan ham tahlil yuboradi. `POST /api/analyze-call`:

- `manager_id` kelmasa xato bermang; `calls.manager_id = null` bilan yozing.
- Ustun nullable bo'lsin: `alter table public.calls alter column manager_id drop not null;`
- (Cascade bilan birga: FK nullable bo'lsa ham `on delete cascade` ishlaydi.)

---

## 5. Fayl yuklash (multipart) — URL bilan bir qatorda

Frontend audio FAYLNI ham yuboradi (`multipart/form-data`, `audio` maydoni).

```ts
import multer from 'multer';
const upload = multer({ limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB
router.post('/', upload.single('audio'), handler);
// handler: req.file bo'lsa — faylni tmp'ga/Storage'ga yozib audio_url yarating yoki
// to'g'ridan-to'g'ri Gemini'ga (inlineData/Buffer) bering; aks holda req.body.audio_url.
// manager_id ham JSON, ham multipart'dan o'qilsin: req.body.manager_id.
```

Audioning duration'i (1-bo'lim) shu fayl/URL'dan o'lchanadi.

---

## 6. Gemini 503 (UNAVAILABLE / "high demand") — retry + backoff

`generateContent` chaqiruvini retry bilan o'rang (503/429 da qayta urinish):

```ts
async function callGeminiWithRetry(fn, { retries = 4, baseMs = 1000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      const status = e?.status ?? e?.response?.status ?? e?.code;
      const retriable = status === 503 || status === 429 ||
        /UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand/i.test(e?.message || '');
      if (!retriable || attempt === retries) throw e;
      await new Promise(r => setTimeout(r, baseMs * 2 ** attempt + Math.floor(Math.random() * 400)));
    }
  }
  throw lastErr;
}
// const result = await callGeminiWithRetry(() => model.generateContent(parts));
```

Hammasi muvaffaqiyatsiz bo'lsa: `res.status(503).json({ success:false,
error:"AI auditor hozir band. Bir necha daqiqadan so'ng qayta urining." })`.

---

## ✅ Yakuniy tekshiruv

1. 27 daqiqali audio tahlil qilinsa, `calls.duration ≈ 1620` (sekund) bo'lsin,
   frontendda `27:00` ko'rinsin.
2. `GET /api/calls/:id` → `summary, client_info, final_agreement, next_steps,
   transcript, sentiment, risk, criteria_scores` keladi.
3. Operator o'chirilsa, uning qo'ng'iroqlari "Audio yozuvlar" va "Chuqur tahlil"
   dan yo'qoladi.
4. Menejersiz va fayl bilan yuborilgan tahlil ham ishlaydi.
5. Gemini 503 bersa — avtomatik qayta urinadi, foydalanuvchi toza xabar oladi.
