/**
 * i18n — Çoklu dil desteği (TR / EN)
 * Kullanım: import { t, setLocale, getLocale } from '../i18n';
 */
import trStrings from '../../locales/tr.json';
import enStrings from '../../locales/en.json';

export const LOCALES = { tr: 'Türkçe', en: 'English' } as const;
export type Locale = keyof typeof LOCALES;

const translations: Record<Locale, Record<string, any>> = {
  tr: trStrings,
  en: enStrings,
};

let currentLocale: Locale = 'tr';
let listeners: Array<() => void> = [];

// Başlangıçta localStorage'dan oku (senkron — hem web hem native)
try {
  const saved = (globalThis as any).localStorage?.getItem('war-nexus-locale');
  if (saved === 'en' || saved === 'tr') currentLocale = saved;
} catch {}

export function setLocale(lang: Locale) {
  currentLocale = lang;
  try { (globalThis as any).localStorage?.setItem('war-nexus-locale', lang); } catch {}
  listeners.forEach(fn => fn());
}

export function getLocale(): Locale {
  return currentLocale;
}

export function onLocaleChange(fn: () => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

/** Nested key lookup: t('auth.login') → translations[locale].auth.login */
function resolve(obj: any, path: string): string | undefined {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

/**
 * Translate key with optional parameter interpolation.
 * t('welcome', { name: 'Ali' }) → "Hoş geldin, Ali"
 * Params use {{param}} syntax in translation values.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let val = resolve(translations[currentLocale], key);
  // Fallback to Turkish
  if (val === undefined && currentLocale !== 'tr') {
    val = resolve(translations.tr, key);
  }
  // Fallback to key itself
  if (val === undefined) return key;
  // Parameter interpolation
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      val = val.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
  }
  return val;
}
