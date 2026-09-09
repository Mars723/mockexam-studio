import { translations } from './translations.ts';
export type Locale = 'en' | 'zh';
let locale: Locale = 'en';
const listeners = new Set<() => void>();
export const getLocale = () => locale;
export const subscribeLocale = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export function setLocale(value: Locale) {
  locale = value;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = value === 'en' ? 'en' : 'zh-CN';
    try {
      localStorage.setItem('mockexam-locale', value);
    } catch {}
  }
  listeners.forEach((fn) => fn());
}
export function translate(key: string, lang: Locale, ...values: unknown[]) {
  const result = lang === 'en' ? translations[key] || key : key;
  return result.replace(/\{(\d+)\}/g, (_, i) =>
    String(values[Number(i)] ?? ''),
  );
}
export const t = (key: string, ...values: unknown[]) =>
  translate(key, locale, ...values);
