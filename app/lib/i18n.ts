"use client";

/* Minimal i18n — same external-store pattern as theme.ts (see that file for
 * the rationale: hydration-safe via useSyncExternalStore, no setState-in-effect).
 * Three locales today (uz/ru/en); adding another means adding one more key to
 * `dict` below and to `LOCALES`. Missing keys fall back to Uzbek, then to the
 * raw key itself, so a partially-translated screen never crashes or blanks. */

import { useSyncExternalStore } from "react";

export type Locale = "uz" | "ru" | "en";
export const LOCALES: { value: Locale; label: string }[] = [
  { value: "uz", label: "O'zbekcha" },
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
];

const LOCALE_KEY = "procell-locale";
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// The `data-locale` attribute is the source of truth — set before paint by
// the inline script in layout.tsx (same no-flash trick as the `dark` class
// in theme.ts), so reading it back here is hydration-safe.
function getSnapshot(): Locale {
  const attr = document.documentElement.dataset.locale;
  return attr === "ru" || attr === "en" ? attr : "uz";
}

function getServerSnapshot(): Locale {
  return "uz";
}

export function setLocale(locale: Locale): void {
  document.documentElement.setAttribute("data-locale", locale);
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    /* localStorage unavailable — ignore */
  }
  emit();
}

/* ===================================================================== */
/* Dictionary                                                             */
/* ===================================================================== */
const dict = {
  uz: {
    "common.logout": "Chiqish",
    "common.cancel": "Bekor qilish",
    "common.yes": "Ha",
    "common.no": "Yo'q",
    "common.save": "Saqlash",
    "common.loading": "Yuklanmoqda...",
    "common.refresh": "Yangilash",

    "landing.badge": "AI Audit Core",
    "landing.title": "Call-center sifatini AI yordamida audit qiling",
    "landing.subtitle": "SalesPulse har bir qo'ng'iroqni tahlil qiladi, operatorlar samaradorligini o'lchaydi va jonli statistika beradi.",
    "landing.login": "Tizimga kirish",
    "landing.goToCabinet": "Kabinetga o'tish",
    "landing.feature1Title": "AI auditor",
    "landing.feature1Body": "Har bir qo'ng'iroq belgilangan mezonlar bo'yicha avtomatik baholanadi.",
    "landing.feature2Title": "Jonli statistika",
    "landing.feature2Body": "KPI, konversiya va yo'qotish sabablari real vaqtda yangilanadi.",
    "landing.feature3Title": "Jamoa nazorati",
    "landing.feature3Body": "Menejerlar va operatorlar samaradorligini bir joydan kuzating.",

    "login.title": "Xush kelibsiz",
    "login.subtitle": "Audit tizimiga kirish uchun ma'lumotlaringizni kiriting",
    "login.email": "Email",
    "login.password": "Parol",
    "login.emailPlaceholder": "email@salespulse.uz",
    "login.passwordPlaceholder": "Kamida 6 ta belgi",
    "login.show": "Ko'rsatish",
    "login.hide": "Yashirish",
    "login.submit": "Tizimga kirish",
    "login.submitting": "Tekshirilmoqda...",
    "login.footer": "SalesPulse © 2026 — Himoyalangan audit muhiti",
    "login.emailRequired": "Email kiriting.",
    "login.emailInvalid": "Email formati noto'g'ri.",
    "login.passwordRequired": "Parol kiriting.",
    "login.passwordTooShort": "Parol kamida {min} ta belgidan iborat bo'lsin.",
    "login.wrongCredentials": "Email yoki parol noto'g'ri.",
    "login.serverUnreachable": "Serverga ulanib bo'lmadi. Aloqani tekshirib, qayta urining.",

    "nav.section.main": "ASOSIY",
    "nav.section.settings": "SOZLAMALAR",
    "nav.overview.label": "Umumiy ko'rinish",
    "nav.overview.hint": "Boshqaruv paneli",
    "nav.management.label": "Boshqaruv paneli",
    "nav.management.hint": "Rahbariyat ko'rinishi",
    "nav.comparison.label": "Solishtirish paneli",
    "nav.comparison.hint": "Kunlik/haftalik/oylik",
    "nav.staff.label": "Xodimlarni boshqarish",
    "nav.staff.hint": "Barcha xodimlar",
    "nav.recordings.label": "Audio yozuvlar",
    "nav.recordings.hint": "Transkripsiya jurnali",
    "nav.upload.label": "Audio yuklash",
    "nav.upload.hint": "Yangi qo'ng'iroqlar",
    "nav.deep-audit.label": "Chuqur tahlil",
    "nav.deep-audit.hint": "Advanced Deep Audit",
    "nav.operators.label": "Operatorlar",
    "nav.operators.hint": "Jamoa boshqaruvi",
    "nav.categories.label": "Mezon kategoriyalari",
    "nav.categories.hint": "Guruhlash",
    "nav.criteria.label": "Baholash mezonlari",
    "nav.criteria.hint": "Ballash qoidalari",
    "nav.amocrm.label": "amoCRM ulanishi",
    "nav.amocrm.hint": "Integratsiya",

    "tab.overview.title": "Umumiy ko'rinish",
    "tab.overview.subtitle": "Call-center sifat auditi bo'yicha umumiy holat",
    "tab.management.title": "Boshqaruv paneli",
    "tab.management.subtitle": "Uch darajali rahbariyat tahlili va platformalar",
    "tab.comparison.title": "Solishtirish paneli",
    "tab.comparison.subtitle": "Kunlik, haftalik va oylik natijalar — davrlararo solishtirish",
    "tab.staff.title": "Xodimlarni boshqarish",
    "tab.staff.subtitle": "Barcha xodimlar — sozlamalar, smena va skriptlar",
    "tab.recordings.title": "Audio yozuvlar",
    "tab.recordings.subtitle": "Transkripsiya qilingan qo'ng'iroqlar jurnali",
    "tab.upload.title": "Audio yuklash",
    "tab.upload.subtitle": "Tahlil uchun yangi qo'ng'iroqlarni yuklang",
    "tab.deep-audit.title": "Chuqur tahlil",
    "tab.deep-audit.subtitle": "Bitta qo'ng'iroqning batafsil AI auditi",
    "tab.operators.title": "Operatorlar",
    "tab.operators.subtitle": "Jamoa boshqaruvi",
    "tab.categories.title": "Mezon kategoriyalari",
    "tab.categories.subtitle": "Baholash toifalari",
    "tab.criteria.title": "Baholash mezonlari",
    "tab.criteria.subtitle": "Ballash qoidalari",
    "tab.amocrm.title": "amoCRM ulanishi",
    "tab.amocrm.subtitle": "CRM integratsiyasi",

    "confirm.logout.title": "Akkaunddan chiqish",
    "confirm.logout.message": "Tizimdan chiqmoqchimisiz?",
    "confirm.logout.confirm": "Ha, chiqish",

    "theme.toggle": "Mavzuni almashtirish",
    "locale.toggle": "Tilni almashtirish",

    "overview.live.online": "Backend ulangan · jonli ma'lumot",
    "overview.live.offline": "Backend oflayn",
    "overview.live.connecting": "Backend bilan ulanmoqda...",
    "overview.backendUnreachable": "Backend bilan aloqa yo'q. Iltimos qayta urinib ko'ring.",
    "overview.topOperators": "Top operatorlar",
    "overview.topOperatorsSubtitle": "O'rtacha KPI baho bo'yicha (jonli)",
    "overview.lostReasons": "Yo'qotish sabablari",
    "overview.lostReasonsSubtitle": "Eng ko'p uchragan (jonli)",
    "overview.recentActivity": "So'nggi faollik",
    "overview.recentActivitySubtitle": "Eng oxirgi tahlil qilingan qo'ng'iroqlar",
    "overview.emptyLeaders": "Hozircha statistika yo'q — birinchi qo'ng'iroq tahlilidan keyin paydo bo'ladi.",
    "overview.emptyLost": "Yo'qotish sabablari hali aniqlanmagan.",
    "overview.emptyRecent": "Hali tahlil qilingan qo'ng'iroqlar yo'q.",
    "overview.stat.calls": "Jami qo'ng'iroq",
    "overview.stat.duration": "O'rtacha davomiyligi",
    "overview.stat.score": "O'rtacha KPI",
    "overview.stat.ai": "AI auditori",
    "overview.stat.live": "Jonli",
    "overview.stat.disconnected": "Ulanmagan",

    "managers.title": "Menejerlar",
    "managers.live": "Jonli yangilanadi (real-time)",
    "managers.active": "aktiv",
    "managers.total": "umumiy",
    "managers.empty": "Hech qanday menejer topilmadi",
    "managers.loading": "Ma'lumotlar yuklanmoqda, kuting...",
    "managers.status.online": "online",
    "managers.status.away": "away",
    "managers.status.offline": "offline",
  },
  ru: {
    "common.logout": "Выйти",
    "common.cancel": "Отмена",
    "common.yes": "Да",
    "common.no": "Нет",
    "common.save": "Сохранить",
    "common.loading": "Загрузка...",
    "common.refresh": "Обновить",

    "landing.badge": "AI Audit Core",
    "landing.title": "Аудит качества call-центра с помощью AI",
    "landing.subtitle": "SalesPulse анализирует каждый звонок, измеряет эффективность операторов и даёт живую статистику.",
    "landing.login": "Войти в систему",
    "landing.goToCabinet": "Перейти в кабинет",
    "landing.feature1Title": "AI-аудитор",
    "landing.feature1Body": "Каждый звонок автоматически оценивается по заданным критериям.",
    "landing.feature2Title": "Живая статистика",
    "landing.feature2Body": "KPI, конверсия и причины потерь обновляются в реальном времени.",
    "landing.feature3Title": "Контроль команды",
    "landing.feature3Body": "Отслеживайте эффективность менеджеров и операторов в одном месте.",

    "login.title": "Добро пожаловать",
    "login.subtitle": "Введите данные для входа в систему аудита",
    "login.email": "Email",
    "login.password": "Пароль",
    "login.emailPlaceholder": "email@salespulse.uz",
    "login.passwordPlaceholder": "Минимум 6 символов",
    "login.show": "Показать",
    "login.hide": "Скрыть",
    "login.submit": "Войти в систему",
    "login.submitting": "Проверка...",
    "login.footer": "SalesPulse © 2026 — Защищённая среда аудита",
    "login.emailRequired": "Введите email.",
    "login.emailInvalid": "Неверный формат email.",
    "login.passwordRequired": "Введите пароль.",
    "login.passwordTooShort": "Пароль должен содержать не менее {min} символов.",
    "login.wrongCredentials": "Неверный email или пароль.",
    "login.serverUnreachable": "Не удалось подключиться к серверу. Проверьте соединение и повторите попытку.",

    "nav.section.main": "ОСНОВНОЕ",
    "nav.section.settings": "НАСТРОЙКИ",
    "nav.overview.label": "Обзор",
    "nav.overview.hint": "Панель управления",
    "nav.management.label": "Панель руководства",
    "nav.management.hint": "Вид для руководства",
    "nav.comparison.label": "Сравнение",
    "nav.comparison.hint": "День/неделя/месяц",
    "nav.staff.label": "Управление сотрудниками",
    "nav.staff.hint": "Все сотрудники",
    "nav.recordings.label": "Аудиозаписи",
    "nav.recordings.hint": "Журнал транскрипций",
    "nav.upload.label": "Загрузка аудио",
    "nav.upload.hint": "Новые звонки",
    "nav.deep-audit.label": "Глубокий анализ",
    "nav.deep-audit.hint": "Advanced Deep Audit",
    "nav.operators.label": "Операторы",
    "nav.operators.hint": "Управление командой",
    "nav.categories.label": "Категории критериев",
    "nav.categories.hint": "Группировка",
    "nav.criteria.label": "Критерии оценки",
    "nav.criteria.hint": "Правила подсчёта баллов",
    "nav.amocrm.label": "Подключение amoCRM",
    "nav.amocrm.hint": "Интеграция",

    "tab.overview.title": "Обзор",
    "tab.overview.subtitle": "Общее состояние аудита качества call-центра",
    "tab.management.title": "Панель руководства",
    "tab.management.subtitle": "Трёхуровневый анализ для руководства и платформы",
    "tab.comparison.title": "Панель сравнения",
    "tab.comparison.subtitle": "Дневные, недельные и месячные результаты — сравнение периодов",
    "tab.staff.title": "Управление сотрудниками",
    "tab.staff.subtitle": "Все сотрудники — настройки, смены и скрипты",
    "tab.recordings.title": "Аудиозаписи",
    "tab.recordings.subtitle": "Журнал расшифрованных звонков",
    "tab.upload.title": "Загрузка аудио",
    "tab.upload.subtitle": "Загрузите новые звонки для анализа",
    "tab.deep-audit.title": "Глубокий анализ",
    "tab.deep-audit.subtitle": "Подробный AI-аудит одного звонка",
    "tab.operators.title": "Операторы",
    "tab.operators.subtitle": "Управление командой",
    "tab.categories.title": "Категории критериев",
    "tab.categories.subtitle": "Категории оценки",
    "tab.criteria.title": "Критерии оценки",
    "tab.criteria.subtitle": "Правила подсчёта баллов",
    "tab.amocrm.title": "Подключение amoCRM",
    "tab.amocrm.subtitle": "Интеграция с CRM",

    "confirm.logout.title": "Выход из аккаунта",
    "confirm.logout.message": "Вы действительно хотите выйти?",
    "confirm.logout.confirm": "Да, выйти",

    "theme.toggle": "Переключить тему",
    "locale.toggle": "Сменить язык",

    "overview.live.online": "Backend подключён · данные в реальном времени",
    "overview.live.offline": "Backend недоступен",
    "overview.live.connecting": "Подключение к backend...",
    "overview.backendUnreachable": "Нет связи с backend. Пожалуйста, повторите попытку.",
    "overview.topOperators": "Лучшие операторы",
    "overview.topOperatorsSubtitle": "По среднему баллу KPI (в реальном времени)",
    "overview.lostReasons": "Причины потерь",
    "overview.lostReasonsSubtitle": "Наиболее частые (в реальном времени)",
    "overview.recentActivity": "Последняя активность",
    "overview.recentActivitySubtitle": "Недавно проанализированные звонки",
    "overview.emptyLeaders": "Статистики пока нет — появится после первого анализа звонка.",
    "overview.emptyLost": "Причины потерь пока не определены.",
    "overview.emptyRecent": "Проанализированных звонков пока нет.",
    "overview.stat.calls": "Всего звонков",
    "overview.stat.duration": "Средняя длительность",
    "overview.stat.score": "Средний KPI",
    "overview.stat.ai": "AI-аудитор",
    "overview.stat.live": "Live",
    "overview.stat.disconnected": "Не подключено",

    "managers.title": "Менеджеры",
    "managers.live": "Обновляется в реальном времени",
    "managers.active": "активны",
    "managers.total": "всего",
    "managers.empty": "Менеджеры не найдены",
    "managers.loading": "Загрузка данных, подождите...",
    "managers.status.online": "онлайн",
    "managers.status.away": "занят",
    "managers.status.offline": "офлайн",
  },
  en: {
    "common.logout": "Log out",
    "common.cancel": "Cancel",
    "common.yes": "Yes",
    "common.no": "No",
    "common.save": "Save",
    "common.loading": "Loading...",
    "common.refresh": "Refresh",

    "landing.badge": "AI Audit Core",
    "landing.title": "Audit your call-center quality with AI",
    "landing.subtitle": "SalesPulse analyzes every call, measures operator performance, and gives you live statistics.",
    "landing.login": "Sign in",
    "landing.goToCabinet": "Go to my dashboard",
    "landing.feature1Title": "AI auditor",
    "landing.feature1Body": "Every call is automatically scored against your defined criteria.",
    "landing.feature2Title": "Live statistics",
    "landing.feature2Body": "KPIs, conversion, and loss reasons update in real time.",
    "landing.feature3Title": "Team oversight",
    "landing.feature3Body": "Track manager and operator performance from one place.",

    "login.title": "Welcome back",
    "login.subtitle": "Enter your details to access the audit system",
    "login.email": "Email",
    "login.password": "Password",
    "login.emailPlaceholder": "email@salespulse.uz",
    "login.passwordPlaceholder": "At least 6 characters",
    "login.show": "Show",
    "login.hide": "Hide",
    "login.submit": "Sign in",
    "login.submitting": "Checking...",
    "login.footer": "SalesPulse © 2026 — Secure audit environment",
    "login.emailRequired": "Enter your email.",
    "login.emailInvalid": "Invalid email format.",
    "login.passwordRequired": "Enter your password.",
    "login.passwordTooShort": "Password must be at least {min} characters.",
    "login.wrongCredentials": "Incorrect email or password.",
    "login.serverUnreachable": "Could not reach the server. Check your connection and try again.",

    "nav.section.main": "MAIN",
    "nav.section.settings": "SETTINGS",
    "nav.overview.label": "Overview",
    "nav.overview.hint": "Dashboard",
    "nav.management.label": "Management panel",
    "nav.management.hint": "Leadership view",
    "nav.comparison.label": "Comparison panel",
    "nav.comparison.hint": "Daily/weekly/monthly",
    "nav.staff.label": "Staff management",
    "nav.staff.hint": "All employees",
    "nav.recordings.label": "Recordings",
    "nav.recordings.hint": "Transcription log",
    "nav.upload.label": "Upload audio",
    "nav.upload.hint": "New calls",
    "nav.deep-audit.label": "Deep audit",
    "nav.deep-audit.hint": "Advanced Deep Audit",
    "nav.operators.label": "Operators",
    "nav.operators.hint": "Team management",
    "nav.categories.label": "Criteria categories",
    "nav.categories.hint": "Grouping",
    "nav.criteria.label": "Evaluation criteria",
    "nav.criteria.hint": "Scoring rules",
    "nav.amocrm.label": "amoCRM connection",
    "nav.amocrm.hint": "Integration",

    "tab.overview.title": "Overview",
    "tab.overview.subtitle": "Overall state of call-center quality audit",
    "tab.management.title": "Management panel",
    "tab.management.subtitle": "Three-tier leadership analysis and platforms",
    "tab.comparison.title": "Comparison panel",
    "tab.comparison.subtitle": "Daily, weekly, and monthly results — period-over-period",
    "tab.staff.title": "Staff management",
    "tab.staff.subtitle": "All employees — settings, shifts, and scripts",
    "tab.recordings.title": "Recordings",
    "tab.recordings.subtitle": "Log of transcribed calls",
    "tab.upload.title": "Upload audio",
    "tab.upload.subtitle": "Upload new calls for analysis",
    "tab.deep-audit.title": "Deep audit",
    "tab.deep-audit.subtitle": "Detailed AI audit of a single call",
    "tab.operators.title": "Operators",
    "tab.operators.subtitle": "Team management",
    "tab.categories.title": "Criteria categories",
    "tab.categories.subtitle": "Evaluation categories",
    "tab.criteria.title": "Evaluation criteria",
    "tab.criteria.subtitle": "Scoring rules",
    "tab.amocrm.title": "amoCRM connection",
    "tab.amocrm.subtitle": "CRM integration",

    "confirm.logout.title": "Sign out",
    "confirm.logout.message": "Are you sure you want to sign out?",
    "confirm.logout.confirm": "Yes, sign out",

    "theme.toggle": "Toggle theme",
    "locale.toggle": "Change language",

    "overview.live.online": "Backend connected · live data",
    "overview.live.offline": "Backend offline",
    "overview.live.connecting": "Connecting to backend...",
    "overview.backendUnreachable": "No connection to the backend. Please try again.",
    "overview.topOperators": "Top operators",
    "overview.topOperatorsSubtitle": "By average KPI score (live)",
    "overview.lostReasons": "Loss reasons",
    "overview.lostReasonsSubtitle": "Most common (live)",
    "overview.recentActivity": "Recent activity",
    "overview.recentActivitySubtitle": "Most recently analyzed calls",
    "overview.emptyLeaders": "No stats yet — will appear after the first call analysis.",
    "overview.emptyLost": "Loss reasons haven't been identified yet.",
    "overview.emptyRecent": "No analyzed calls yet.",
    "overview.stat.calls": "Total calls",
    "overview.stat.duration": "Average duration",
    "overview.stat.score": "Average KPI",
    "overview.stat.ai": "AI auditor",
    "overview.stat.live": "Live",
    "overview.stat.disconnected": "Disconnected",

    "managers.title": "Managers",
    "managers.live": "Updates live (real-time)",
    "managers.active": "active",
    "managers.total": "total",
    "managers.empty": "No managers found",
    "managers.loading": "Loading data, please wait...",
    "managers.status.online": "online",
    "managers.status.away": "away",
    "managers.status.offline": "offline",
  },
} satisfies Record<Locale, Record<string, string>>;

export type DictKey = keyof (typeof dict)["uz"];

function translate(locale: Locale, key: DictKey, vars?: Record<string, string | number>): string {
  const raw = dict[locale][key] ?? dict.uz[key] ?? key;
  if (!vars) return raw;
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), raw);
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useT(): (key: DictKey, vars?: Record<string, string | number>) => string {
  const locale = useLocale();
  return (key, vars) => translate(locale, key, vars);
}
