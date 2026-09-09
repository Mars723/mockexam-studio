'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { Languages } from 'lucide-react';
import { getLocale, subscribeLocale, setLocale, type Locale } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
export const useLocale = () =>
  useSyncExternalStore(subscribeLocale, getLocale, () => 'en' as Locale);
export function LanguagePicker() {
  const lang = useLocale();
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mockexam-locale');
      if (saved === 'en' || saved === 'zh') setLocale(saved);
    } catch {}
  }, []);
  return (
    <Select
      value={lang}
      onValueChange={(v) => {
        if (v === 'en' || v === 'zh') setLocale(v);
      }}
    >
      <SelectTrigger className="language-picker" aria-label="Language / 语言">
        <Languages size={16} />
        <SelectValue>{lang === 'en' ? 'English' : '简体中文'}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="zh">简体中文</SelectItem>
      </SelectContent>
    </Select>
  );
}
