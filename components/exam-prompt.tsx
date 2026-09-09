'use client';
import { useState } from 'react';
import { Copy, Download, CheckCircle2 } from 'lucide-react';
import { useLocale } from './language-picker';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { examPrompt } from '@/lib/prompts';
import { getRules } from '@/lib/rules-en';
import { downloadFile } from '@/lib/storage';
export function ExamPrompt() {
  const lang = useLocale(),
    en = lang === 'en';
  const [count, setCount] = useState(36),
    [minutes, setMinutes] = useState(90),
    [scope, setScope] = useState(''),
    [examLanguage, setExamLanguage] = useState('English'),
    [includeRules, setIncludeRules] = useState(true),
    [status, setStatus] = useState('');
  const prompt = examPrompt(lang, { count, minutes, scope, examLanguage });
  const full = prompt + (includeRules ? '\n\n---\n\n' + getRules(lang) : '');
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
              setCount(Math.max(6, Math.min(300, Number(e.target.value) || 6)))
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
              setMinutes(
                Math.max(1, Math.min(1440, Number(e.target.value) || 1)),
              )
            }
          />
        </label>
        <label>
          {en ? 'Exam content language' : '试卷内容语言'}
          <Select
            value={examLanguage}
            onValueChange={(v) => setExamLanguage(v || 'English')}
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
            onChange={(e) => setScope(e.target.value)}
            rows={3}
            placeholder={
              en
                ? 'e.g. Chapters 1–6; emphasize edge cases'
                : '例如：第 1–6 章，重点考察边界情况'
            }
          />
        </label>
        <div className="setting-row">
          <label htmlFor="append-rules">
            {en ? 'Append full specification' : '附加完整出题规范'}
          </label>
          <Switch
            id="append-rules"
            checked={includeRules}
            onCheckedChange={setIncludeRules}
          />
        </div>
        <button className="button primary full" onClick={() => void copy()}>
          <Copy size={16} />
          {en ? 'Copy complete prompt' : '复制完整 Prompt'}
        </button>
        <button
          className="button secondary full"
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
          {status && (
            <>
              <CheckCircle2 size={14} />
              {status}
            </>
          )}
        </p>
        <p className="prompt-tip">
          {en
            ? 'The preview includes exactly what will be copied. Changing interface language does not translate your imported exams or answers.'
            : '右侧预览就是将被复制的完整内容。切换界面语言不会翻译导入的试卷或你的答案。'}
        </p>
      </aside>
      <section>
        <textarea
          className="prompt-editor"
          aria-label={
            en ? 'Complete exam-generation prompt' : '完整出题 Prompt'
          }
          readOnly
          value={full}
        />
      </section>
    </div>
  );
}
