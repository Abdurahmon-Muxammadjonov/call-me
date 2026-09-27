"use client";

/* Pulse Noir matnlari. Til store'i eskisi bilan umumiy (lib/i18n.ts →
 * useLocale), shuning uchun eski va yangi sahifalar bir vaqtda almashadi.
 *
 * Qoidalar (spetsifikatsiya §4.4): katta harf — faqat CSS
 * `text-transform` orqali, satrni o'zgartirib emas. Tutuq belgisi
 * manbadagidek ‘ (U+2018): "Qo‘ng‘iroqlar". Rus tili — spetsifikatsiya
 * talabi; ingliz tili eski ilovada bor bo'lgani uchun saqlandi. */

import { useCallback } from "react";
import { useLocale, type Locale } from "../lib/i18n";

const uz = {
  "brand.name": "SalesPulse",
  "brand.tagline": "AI audit core",

  "nav.aria": "Asosiy menyu",
  "nav.section.main": "Asosiy",
  "nav.section.settings": "Sozlamalar",
  "nav.analytics": "Analitika",
  "nav.control": "Boshqaruv paneli",
  "nav.compare": "Solishtirish paneli",
  "nav.staffManage": "Xodimlarni boshqarish",
  "nav.staffStats": "Xodimlar statistikasi",
  "nav.status": "Tahlil holati",
  "nav.audio": "Audio yozuvlar",
  "nav.upload": "Audio yuklash",
  "nav.deep": "Chuqur tahlil",
  "nav.operators": "Operatorlar",
  "nav.categories": "Mezon kategoriyalari",
  "nav.criteria": "Baholash mezonlari",
  "nav.amocrm": "amoCRM ulanishi",
  "nav.brand": "Brend sozlamalari",
  "nav.norms": "KPI normalari",
  "nav.locked": "{section} — tarifingizda yopiq",
  "nav.badge.audioLow": "Bugun {threshold} dan past ball olgan qo‘ng‘iroqlar",
  "nav.openMenu": "Menyuni ochish",
  "nav.closeMenu": "Menyuni yopish",

  "company.sub": "{plan} tarif · {n} operator",
  "company.subOperators": "{n} operator",
  "company.menu": "Kompaniya menyusi",
  "company.search": "Kompaniyani qidirish",
  "company.switching": "Kompaniya almashtirilmoqda…",
  "company.switchFailed": "Kompaniyani almashtirib bo‘lmadi",
  "company.theme": "Mavzu",
  "company.theme.dark": "Qorong‘i",
  "company.theme.light": "Yorug‘",
  "company.theme.system": "Tizim",
  "company.logout": "Hisobdan chiqish",
  "company.logout.title": "Hisobdan chiqasizmi?",
  "company.logout.body": "Qayta kirish uchun email va parol kerak bo‘ladi.",
  "company.logout.confirm": "Chiqish",

  "lang.button": "Til: {lang}",
  "lang.uz": "O‘zbekcha",
  "lang.ru": "Русский",
  "lang.en": "English",

  "theme.toLight": "Yorug‘ mavzuga o‘tish",
  "theme.toDark": "Qorong‘i mavzuga o‘tish",

  "live.on": "Jonli",
  "live.reconnecting": "Ulanmoqda",
  "live.offline": "Oflayn",

  "bell.aria": "Bildirishnomalar, {n} ta o‘qilmagan",
  "notif.title": "Bildirishnomalar",
  "notif.tab.all": "Hammasi",
  "notif.tab.signals": "Signallar",
  "notif.empty": "Hozircha yangi bildirishnoma yo‘q",
  "notif.emptySub": "Yangi qo‘ng‘iroqlar kelganda shu yerda ko‘rinadi.",
  "notif.newCall": "Yangi qo‘ng‘iroq",
  "notif.markAll": "Hammasini o‘qilgan deb belgilash",

  "common.close": "Yopish",
  "common.skipToContent": "Asosiy mazmunga o‘tish",
  "common.cancel": "Bekor qilish",
  "common.apply": "Qo‘llash",
  "common.retry": "Qayta urinish",
  "common.loading": "Yuklanmoqda…",
  "common.error": "Ma’lumotni yuklab bo‘lmadi",
  "common.empty": "Ma’lumot yo‘q",
  "common.dash": "—",

  "tone.excellent": "A‘lo",
  "tone.good": "Yaxshi",
  "tone.average": "O‘rtacha",
  "tone.low": "Past",
  "tone.none": "—",

  "operator.fallback": "Operator {ext}",
  "operator.unmapped": "Aniqlanmagan",
  "operator.trackedSince": "Operator raqami {date} dan boshlab saqlanadi",

  "offline.banner": "Internet aloqasi yo‘q — ko‘rsatilayotgan ma’lumot eskirgan bo‘lishi mumkin",
  "page.forbidden": "Bu bo‘lim sizning rolingiz uchun yopiq",
};

export type PKey = keyof typeof uz;

const ru: Partial<Record<PKey, string>> = {
  "brand.tagline": "AI audit core",
  "nav.aria": "Главное меню",
  "nav.section.main": "Основное",
  "nav.section.settings": "Настройки",
  "nav.analytics": "Аналитика",
  "nav.control": "Панель управления",
  "nav.compare": "Сравнение",
  "nav.staffManage": "Управление сотрудниками",
  "nav.staffStats": "Статистика сотрудников",
  "nav.status": "Статус анализа",
  "nav.audio": "Аудиозаписи",
  "nav.upload": "Загрузка аудио",
  "nav.deep": "Глубокий анализ",
  "nav.operators": "Операторы",
  "nav.categories": "Категории критериев",
  "nav.criteria": "Критерии оценки",
  "nav.amocrm": "Подключение amoCRM",
  "nav.brand": "Настройки бренда",
  "nav.norms": "Нормы KPI",
  "nav.locked": "{section} — закрыто в вашем тарифе",
  "nav.badge.audioLow": "Звонки сегодня с оценкой ниже {threshold}",
  "nav.openMenu": "Открыть меню",
  "nav.closeMenu": "Закрыть меню",

  "company.sub": "Тариф {plan} · {n} операторов",
  "company.subOperators": "{n} операторов",
  "company.menu": "Меню компании",
  "company.search": "Поиск компании",
  "company.switching": "Переключение компании…",
  "company.switchFailed": "Не удалось переключить компанию",
  "company.theme": "Тема",
  "company.theme.dark": "Тёмная",
  "company.theme.light": "Светлая",
  "company.theme.system": "Системная",
  "company.logout": "Выйти из аккаунта",
  "company.logout.title": "Выйти из аккаунта?",
  "company.logout.body": "Для повторного входа понадобятся email и пароль.",
  "company.logout.confirm": "Выйти",

  "lang.button": "Язык: {lang}",
  "theme.toLight": "Включить светлую тему",
  "theme.toDark": "Включить тёмную тему",

  "live.on": "Онлайн",
  "live.reconnecting": "Подключение",
  "live.offline": "Офлайн",

  "bell.aria": "Уведомления, непрочитанных: {n}",
  "notif.title": "Уведомления",
  "notif.tab.all": "Все",
  "notif.tab.signals": "Сигналы",
  "notif.empty": "Новых уведомлений пока нет",
  "notif.emptySub": "Новые звонки появятся здесь.",
  "notif.newCall": "Новый звонок",
  "notif.markAll": "Отметить все как прочитанные",

  "common.close": "Закрыть",
  "common.skipToContent": "Перейти к содержимому",
  "common.cancel": "Отмена",
  "common.apply": "Применить",
  "common.retry": "Повторить",
  "common.loading": "Загрузка…",
  "common.error": "Не удалось загрузить данные",
  "common.empty": "Нет данных",

  "tone.excellent": "Отлично",
  "tone.good": "Хорошо",
  "tone.average": "Средне",
  "tone.low": "Низко",

  "operator.fallback": "Оператор {ext}",
  "operator.unmapped": "Не определён",
  "operator.trackedSince": "Номер оператора сохраняется с {date}",

  "offline.banner": "Нет подключения к интернету — данные могут быть устаревшими",
  "page.forbidden": "Этот раздел закрыт для вашей роли",
};

const en: Partial<Record<PKey, string>> = {
  "nav.aria": "Main menu",
  "nav.section.main": "Main",
  "nav.section.settings": "Settings",
  "nav.analytics": "Analytics",
  "nav.control": "Control panel",
  "nav.compare": "Comparison",
  "nav.staffManage": "Staff management",
  "nav.staffStats": "Staff statistics",
  "nav.status": "Analysis status",
  "nav.audio": "Recordings",
  "nav.upload": "Upload audio",
  "nav.deep": "Deep analysis",
  "nav.operators": "Operators",
  "nav.categories": "Criteria categories",
  "nav.criteria": "Scoring criteria",
  "nav.amocrm": "amoCRM connection",
  "nav.brand": "Brand settings",
  "nav.norms": "KPI norms",
  "nav.locked": "{section} is locked on your plan",
  "nav.badge.audioLow": "Calls today scored below {threshold}",
  "nav.openMenu": "Open menu",
  "nav.closeMenu": "Close menu",
  "company.sub": "{plan} plan · {n} operators",
  "company.subOperators": "{n} operators",
  "company.menu": "Company menu",
  "company.search": "Search companies",
  "company.switching": "Switching company…",
  "company.switchFailed": "Could not switch company",
  "company.theme": "Theme",
  "company.theme.dark": "Dark",
  "company.theme.light": "Light",
  "company.theme.system": "System",
  "company.logout": "Log out",
  "company.logout.title": "Log out?",
  "company.logout.body": "You will need your email and password to sign in again.",
  "company.logout.confirm": "Log out",
  "lang.button": "Language: {lang}",
  "theme.toLight": "Switch to light theme",
  "theme.toDark": "Switch to dark theme",
  "live.on": "Live",
  "live.reconnecting": "Connecting",
  "live.offline": "Offline",
  "bell.aria": "Notifications, {n} unread",
  "notif.title": "Notifications",
  "notif.tab.all": "All",
  "notif.tab.signals": "Signals",
  "notif.empty": "No new notifications yet",
  "notif.emptySub": "New calls will show up here.",
  "notif.newCall": "New call",
  "notif.markAll": "Mark all as read",
  "common.close": "Close",
  "common.skipToContent": "Skip to content",
  "common.cancel": "Cancel",
  "common.apply": "Apply",
  "common.retry": "Retry",
  "common.loading": "Loading…",
  "common.error": "Could not load data",
  "common.empty": "No data",
  "tone.excellent": "Excellent",
  "tone.good": "Good",
  "tone.average": "Average",
  "tone.low": "Low",
  "operator.fallback": "Operator {ext}",
  "operator.unmapped": "Unassigned",
  "operator.trackedSince": "Operator extensions are stored since {date}",
  "offline.banner": "No internet connection — data may be out of date",
  "page.forbidden": "This section is closed for your role",
};

const DICT: Record<Locale, Partial<Record<PKey, string>>> = { uz, ru, en };

export function pt(locale: Locale, key: PKey, vars?: Record<string, string | number>): string {
  const raw = DICT[locale][key] ?? uz[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export type PT = (key: PKey, vars?: Record<string, string | number>) => string;

export function usePT(): PT {
  const locale = useLocale();
  return useCallback((key, vars) => pt(locale, key, vars), [locale]);
}
