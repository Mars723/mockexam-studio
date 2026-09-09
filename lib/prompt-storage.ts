import type { Locale } from './i18n.ts';
import { examPrompt, type PromptOptions } from './prompts.ts';

export type PromptDraft = { options: PromptOptions; text: string };
type PromptStorage = Pick<Storage, 'getItem' | 'setItem'>;
const key = (locale: Locale) => `mockexam-prompt-v1-${locale}`;
export function defaultPromptDraft(locale: Locale): PromptDraft {
  const options = {
    count: 36,
    minutes: 90,
    scope: '',
    examLanguage: 'English',
  };
  return { options, text: examPrompt(locale, options) };
}
export function readPromptDraft(
  storage: PromptStorage,
  locale: Locale,
): PromptDraft | null {
  const raw = storage.getItem(key(locale));
  if (raw === null) return null;
  const draft = JSON.parse(raw);
  const o = draft?.options;
  if (
    typeof draft?.text !== 'string' ||
    !o ||
    !Number.isFinite(o.count) ||
    o.count < 6 ||
    o.count > 300 ||
    !Number.isFinite(o.minutes) ||
    o.minutes < 1 ||
    o.minutes > 1440 ||
    typeof o.scope !== 'string' ||
    !['English', '中文'].includes(o.examLanguage)
  ) {
    throw new Error('Invalid saved prompt');
  }
  return {
    text: draft.text,
    options: {
      count: o.count,
      minutes: o.minutes,
      scope: o.scope,
      examLanguage: o.examLanguage,
    },
  };
}
export function savePromptDraft(
  storage: PromptStorage,
  locale: Locale,
  draft: PromptDraft,
) {
  storage.setItem(key(locale), JSON.stringify(draft));
}
