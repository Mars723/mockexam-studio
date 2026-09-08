'use client';
import { useState, useRef } from 'react';
import { Code2, ImagePlus, Paperclip, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { RichText } from './rich-text';
import { CodeEditor } from './code-editor';
import { isAuto, type Question, type ResponseValue } from '@/lib/exam';
import { fileToDataURL } from '@/lib/storage';
const languageLabels: Record<string, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  cpp: 'C / C++',
  java: 'Java',
  sql: 'SQL',
  text: '纯文本',
};
function Picker({
  value,
  onChange,
  options,
  label,
  disabledValues = [],
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; text: string }[];
  label: string;
  disabledValues?: string[];
}) {
  return (
    <Select value={value || null} onValueChange={(v) => onChange(v || '')}>
      <SelectTrigger className="answer-select" aria-label={label}>
        <SelectValue>
          {value ? options.find((o) => o.id === value)?.text : '请选择'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem
            key={o.id}
            value={o.id}
            disabled={disabledValues.includes(o.id)}
          >
            {o.text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function AnswerInput({
  q,
  value,
  onChange,
  onError,
}: {
  q: Question;
  value: ResponseValue;
  onChange: (v: ResponseValue) => void;
  onError: (msg: string) => void;
}) {
  const [code, setCode] = useState(q.type === 'code'),
    [language, setLanguage] = useState(
      q.language && languageLabels[q.language] ? q.language : 'python',
    ),
    [preview, setPreview] = useState(false),
    [uploading, setUploading] = useState(false);
  const latest = useRef(value);
  latest.current = value;
  const field = (id: string, val: string) =>
    onChange({ ...value, fields: { ...value.fields, [id]: val } });
  const auto = isAuto(q);
  async function attach(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const existing = value.attachments || [];
      if (existing.length + files.length > 8)
        throw new Error('每题最多 8 个附件');
      if ([...files].some((f) => f.size > 8 * 1024 * 1024))
        throw new Error('单个附件不能超过 8 MB');
      if (
        existing.reduce((n, f) => n + f.data.length * 0.75, 0) +
          [...files].reduce((n, f) => n + f.size, 0) >
        20 * 1024 * 1024
      )
        throw new Error('每题附件总大小不能超过 20 MB');
      const added = await Promise.all(
        [...files].map(async (f) => ({
          name: f.name,
          type: f.type,
          data: await fileToDataURL(f),
        })),
      );
      onChange({
        ...latest.current,
        attachments: [...(latest.current.attachments || []), ...added],
      });
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  if (auto) {
    const options = q.options!;
    return (
      <div className="options">
        {q.type === 'multiple_choice' ? (
          options.map((o) => (
            <label
              key={o.id}
              className={`option ${value.selected?.includes(o.id) ? 'chosen' : ''}`}
            >
              <Checkbox
                aria-label={`选项 ${o.id}`}
                checked={!!value.selected?.includes(o.id)}
                onCheckedChange={(checked) =>
                  onChange({
                    ...value,
                    selected: checked
                      ? [...(value.selected || []), o.id]
                      : (value.selected || []).filter((id) => id !== o.id),
                  })
                }
              />
              <span className="option-letter">{o.id}</span>
              <RichText text={o.text} />
            </label>
          ))
        ) : (
          <RadioGroup
            value={value.selected?.[0] || ''}
            onValueChange={(v) => onChange({ ...value, selected: [String(v)] })}
          >
            {options.map((o) => (
              <label
                key={o.id}
                className={`option ${value.selected?.includes(o.id) ? 'chosen' : ''}`}
              >
                <RadioGroupItem value={o.id} aria-label={`选项 ${o.id}`} />
                <span className="option-letter">{o.id}</span>
                <RichText text={o.text} />
              </label>
            ))}
          </RadioGroup>
        )}
        <button
          className="text-button"
          onClick={() => onChange({ ...value, selected: [] })}
        >
          清除选择
        </button>
      </div>
    );
  }
  if (q.type === 'fill_blank')
    return (
      <div className="fields">
        {q.blanks!.map((b) => (
          <label key={b.id}>
            <span>{b.label}</span>
            <input
              value={value.fields?.[b.id] || ''}
              onChange={(e) => field(b.id, e.target.value)}
              placeholder="输入答案"
            />
          </label>
        ))}
      </div>
    );
  if (q.type === 'matching')
    return (
      <div className="fields">
        {q.items!.map((it) => (
          <div className="match-row" key={it.id}>
            <RichText text={it.text} />
            <Picker
              value={value.fields?.[it.id] || ''}
              onChange={(v) => field(it.id, v)}
              options={q.matches!}
              label={`${it.text} 对应项`}
            />
          </div>
        ))}
      </div>
    );
  if (q.type === 'ordering')
    return (
      <div className="fields">
        {q.items!.map((_, i) => (
          <div className="match-row" key={i}>
            <span>第 {i + 1} 位</span>
            <Picker
              value={value.fields?.[i + 1] || ''}
              onChange={(v) => field(String(i + 1), v)}
              options={q.items!}
              label={`第 ${i + 1} 位`}
              disabledValues={Object.entries(value.fields || {})
                .filter(([k]) => k !== String(i + 1))
                .map(([, v]) => v)}
            />
          </div>
        ))}
        <button
          className="text-button"
          onClick={() => onChange({ ...value, fields: {} })}
        >
          重置排序
        </button>
      </div>
    );
  if (q.type === 'table')
    return (
      <Table className="answer-table">
        <TableHeader>
          <TableRow>
            <TableHead />
            {q.columns!.map((c, i) => (
              <TableHead key={i}>{c}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {q.rows!.map((r, i) => (
            <TableRow key={i}>
              <TableHead>{r}</TableHead>
              {q.columns!.map((c, j) => (
                <TableCell key={j}>
                  <input
                    aria-label={`${r} ${c}`}
                    value={value.fields?.[`${i}:${j}`] || ''}
                    onChange={(e) => field(`${i}:${j}`, e.target.value)}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  return (
    <div className="written-answer">
      <div className="editor-toolbar">
        <label>
          <Code2 size={16} />
          <span>代码模式</span>
          <Switch
            checked={code}
            onCheckedChange={setCode}
            aria-label="代码模式"
          />
        </label>
        {code ? (
          <Select
            value={language}
            onValueChange={(v) => setLanguage(v || 'text')}
          >
            <SelectTrigger aria-label="代码语言">
              <SelectValue>{languageLabels[language]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(languageLabels).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <button className="text-button" onClick={() => setPreview(!preview)}>
            {preview ? '继续编辑' : '预览公式'}
          </button>
        )}
      </div>
      {code ? (
        <CodeEditor
          value={value.text || ''}
          onChange={(text) => onChange({ ...value, text })}
          language={language}
        />
      ) : preview ? (
        <div className="answer-preview">
          <RichText text={value.text || '尚未输入答案。'} />
        </div>
      ) : (
        <textarea
          className="answer-textarea"
          value={value.text || ''}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          placeholder={
            q.type === 'drawing'
              ? '请在纸上完成作图，上传照片或 PDF。可在此补充说明。'
              : q.type === 'file_response'
                ? '上传实践成果，可在此补充说明。'
                : '在此输入你的答案。支持 Markdown 和 $LaTeX$ 公式。'
          }
          spellCheck={false}
        />
      )}
      <div className="editor-foot">
        <span id="code-help">
          {code
            ? 'Tab 缩进 · Shift+Tab 反缩进 · 括号自动补全 · Esc 后 Tab 移出编辑器'
            : '支持公式预览；代码模式可随时切换，内容保留'}
        </span>
        <span>{value.text?.length || 0} 字符</span>
      </div>
      <label className={`attach-button ${uploading ? 'disabled' : ''}`}>
        <input
          type="file"
          multiple
          disabled={uploading}
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,.py,.js,.ts,.cpp,.c,.java,.sql,.md,.csv,.txt,.mp3,.wav,.m4a,.mp4,.webm,.ipynb"
          onChange={(e) => {
            void attach(e.target.files);
            e.target.value = '';
          }}
        />
        <ImagePlus size={16} />
        {uploading ? '正在读取附件…' : '添加过程照片 / 文件'}
        <span>单个 ≤ 8 MB</span>
      </label>
      {value.attachments?.map((f, i) => (
        <div key={i} className="attachment">
          <Paperclip size={15} />
          <span>{f.name}</span>
          <button
            className="text-button"
            aria-label={`移除附件 ${f.name}`}
            onClick={() =>
              onChange({
                ...value,
                attachments: value.attachments!.filter((_, idx) => idx !== i),
              })
            }
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
