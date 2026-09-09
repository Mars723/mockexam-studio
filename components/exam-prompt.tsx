'use client';
import { useEffect, useState } from 'react';
import { Copy, Download, Save, RefreshCw } from 'lucide-react';
import { useLocale } from './language-picker';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { examPrompt } from '@/lib/prompts';
import type { Locale } from '@/lib/i18n';
import {
  defaultPromptDraft,
  readPromptDraft,
  savePromptDraft,
  type PromptDraft,
} from '@/lib/prompt-storage';
import { downloadFile } from '@/lib/storage';
export function ExamPrompt() {
  const lang = useLocale();
  return <PromptEditor key={lang} lang={lang} />;
}
function PromptEditor({ lang }: { lang: Locale }) {
  const en = lang === 'en';
  const [draft, setDraft] = useState(() => defaultPromptDraft(lang));
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'error' | ''>('');
  const [status, setStatus] = useState('');
  useEffect(() => {
    try {
      const saved = readPromptDraft(localStorage, lang);
      if (saved) {
        setDraft(saved);
        setSaveState('saved');
      }
    } catch {
      setSaveState('error');
    }
    setReady(true);
  }, [lang]);
  const { count, minutes, scope, examLanguage } = draft.options;
  function save(next: PromptDraft) {
    try {
      savePromptDraft(localStorage, lang, next);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }
  function update(next: PromptDraft) {
    setDraft(next);
    setStatus('');
    save(next);
  }
  function options(next: Partial<PromptDraft['options']>) {
    update({ ...draft, options: { ...draft.options, ...next } });
  }
  function regenerate() {
    if (
      !window.confirm(
        en
          ? 'Replace the current prompt with a new prompt using these settings? Your manual edits will be replaced.'
          : '按当前设置重新生成 Prompt？这会替换正文，包括你手动编辑的内容。',
      )
    )
      return;
    update({ ...draft, text: examPrompt(lang, draft.options) });
  }
  const full = draft.text;
  async function copy() {
    try {
      await navigator.clipboard.writeText(full);
      setStatus(
        en
          ? 'Prompt copied, ready to paste into your AI.'
          : '已复制，可以直接粘贴给 AI。',
      );
    } catch {
      downloadFile(
        'MockExam-exam-prompt.md',
        full,
        'text/markdown;charset=utf-8',
      );
      setStatus(
        en
          ? 'Clipboard unavailable. Prompt downloaded.'
          : '剪贴板不可用，已下载 Prompt。',
      );
    }
  }
  return (
    <div className="prompt-panel">
      <aside className="prompt-controls">
        <span className="eyebrow">FROM MATERIALS TO QUESTIONS</span>
        <h2>
          {en
            ? 'Better questions start with a clear brief.'
            : '用明确要求，生成更好的试卷。'}
        </h2>
        <p>
          {en
            ? 'Upload all your study files to your AI, then paste this prompt. It asks for full coverage, complete context, and no answer hints.'
            : '先向 AI 上传全部复习资料，再粘贴这里的 Prompt。它要求完整覆盖知识点、交代背景，并避免解题提示。'}
        </p>
        <label>
          {en ? 'Target questions' : '目标题数'}
          <input
            type="number"
            min={6}
            max={300}
            step={6}
            value={count}
            onChange={(e) =>
              options({
                count: Math.max(6, Math.min(300, Number(e.target.value) || 6)),
              })
            }
          />
        </label>
        <label>
          {en ? 'Duration (minutes)' : '考试时长（分钟）'}
          <input
            type="number"
            min={1}
            max={1440}
            value={minutes}
            onChange={(e) =>
              options({
                minutes: Math.max(
                  1,
                  Math.min(1440, Number(e.target.value) || 1),
                ),
              })
            }
          />
        </label>
        <label>
          {en ? 'Exam content language' : '试卷内容语言'}
          <Select
            value={examLanguage}
            onValueChange={(v) => options({ examLanguage: v || 'English' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="中文">中文</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label>
          {en
            ? 'Extra scope or priorities (optional)'
            : '额外范围或重点（可选）'}
          <textarea
            value={scope}
            onChange={(e) => options({ scope: e.target.value })}
            rows={3}
            placeholder={
              en
                ? 'e.g. Chapters 1–6; emphasize edge cases'
                : '例如：第 1–6 章，重点考察边界情况'
            }
          />
        </label>
        <button
          className="button secondary full"
          disabled={!ready}
          onClick={regenerate}
        >
          <RefreshCw size={16} />
          {en ? 'Generate from settings' : '按设置生成'}
        </button>
        <p className="prompt-tip">
          {en
            ? 'Settings apply when you generate a new prompt. Your current text stays intact until then.'
            : '调整设置后，点击上方按钮更新正文；设置不会自动覆盖你的编辑。'}
        </p>
        <button
          className="button primary full"
          disabled={!ready}
          onClick={() => void copy()}
        >
          <Copy size={16} />
          {en ? 'Copy prompt' : '复制 Prompt'}
        </button>
        <button
          className="button secondary full"
          disabled={!ready}
          onClick={() =>
            downloadFile(
              'MockExam-exam-prompt.md',
              full,
              'text/markdown;charset=utf-8',
            )
          }
        >
          <Download size={16} />
          {en ? 'Download prompt' : '下载 Prompt'}
        </button>
        <p className="prompt-copy-status" role="status">
          {status}
        </p>
        <p className="prompt-tip">
          {en
            ? 'Copy the file specification separately from the AI specification tab, and send both to your AI. Only the editable text here is copied or downloaded.'
            : '请到「AI 出题规范」单独复制规范，并将两者一起发给 AI。这里只复制或下载你编辑的 Prompt 正文。'}
        </p>
      </aside>
      <section>
        <div className="prompt-editor-toolbar">
          <div>
            <strong>{en ? 'Your prompt' : '你的 Prompt'}</strong>
            <p role="status">
              {saveState === 'error'
                ? en
                  ? 'Could not save locally. Copy or download your draft, or try Save again.'
                  : '本地保存失败，请复制或下载备份，或再次点击保存。'
                : saveState === 'saved'
                  ? en
                    ? 'Saved in this browser · English and Chinese drafts are separate'
                    : '已保存到当前浏览器 · 中英文草稿独立保存'
                  : en
                    ? 'Edit directly · Changes save automatically in this browser'
                    : '可直接编辑 · 修改后自动保存到当前浏览器'}
            </p>
          </div>
          <button
            className="button secondary"
            disabled={!ready}
            onClick={() => save(draft)}
          >
            <Save size={16} />
            {en ? 'Save' : '保存'}
          </button>
        </div>
        <textarea
          className="prompt-editor"
          aria-label={
            en ? 'Complete exam-generation prompt' : '完整出题 Prompt'
          }
          disabled={!ready}
          value={full}
          onChange={(e) => update({ ...draft, text: e.target.value })}
        />
      </section>
    </div>
  );
}
