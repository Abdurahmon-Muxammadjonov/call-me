/* Bo'yashdan OLDIN ishlaydigan skript (root layout <head> ida).
 *
 * Spetsifikatsiya §3.5 `data-theme` va aksentni serverda cookie'dan
 * chizishni so'raydi. Root layout'da cookies() o'qish HAMMA sahifani
 * (landing ham) dinamik renderga o'tkazib yuboradi — tezlik yo'qoladi.
 * Next.js'ning o'z tavsiyasi (docs: "Preventing flash before hydration")
 * aynan shu usul: sinxron inline skript birinchi bo'yashdan oldin
 * `data-theme` ni qo'yadi, "sakrash" bo'lmaydi. Cookie nomlari
 * spetsifikatsiyadagidek: sp_theme, sp_accent, sp_locale.
 *
 * Eski sahifalar hali `.dark` klassi va `procell-theme` /
 * `procell-locale` localStorage kalitlariga tayanadi — ular ham
 * sinxron saqlanadi (cookie bo'lmasa, eski kalitdan o'qiladi). */

import { ACCENT_KEYS, accentVars } from "./accent";

export const THEME_COOKIE = "sp_theme";
export const ACCENT_COOKIE = "sp_accent";
export const LOCALE_COOKIE = "sp_locale";

export function bootstrapScript(): string {
  const accents = Object.fromEntries(ACCENT_KEYS.map((k) => [k, accentVars(k)]));
  return `(function(){
var d=document.documentElement;
function ck(n){var m=document.cookie.match(new RegExp('(?:^|; )'+n+'=([^;]*)'));return m?decodeURIComponent(m[1]):null}
try{
var p=ck(${JSON.stringify(THEME_COOKIE)});
if(p!=='dark'&&p!=='light'&&p!=='system'){var s=localStorage.getItem('procell-theme');p=(s==='dark'||s==='light')?s:'system'}
var r=p==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;
d.setAttribute('data-theme',r);d.classList.toggle('dark',r==='dark');
}catch(e){d.setAttribute('data-theme','dark');}
try{
var A=${JSON.stringify(accents)};var v=A[ck(${JSON.stringify(ACCENT_COOKIE)})];
if(v){for(var k in v)d.style.setProperty(k,v[k])}
}catch(e){}
try{
var l=ck(${JSON.stringify(LOCALE_COOKIE)})||localStorage.getItem('procell-locale');
l=(l==='ru'||l==='en')?l:'uz';d.setAttribute('data-locale',l);d.setAttribute('lang',l);
}catch(e){}
})();`;
}
