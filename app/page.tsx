'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  Clock3,
  Copy,
  Download,
  FileJson2,
  FileText,
  Flag,
  GraduationCap,
  History,
  LayoutDashboard,
  Maximize2,
  Plus,
  Save,
  ShieldCheck,
  Upload,
  X,
  AlertCircle,
  Grid2X2,
  RotateCcw,
  Monitor,
  CheckCircle2,
  Code2,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { Notifications } from '@/components/notifications';
import { Empty } from '@/components/ui/empty';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { RichText } from '@/components/rich-text';
import { AnswerInput } from '@/components/answer-input';
import { sampleExam } from '@/lib/sample';
import { rulesText } from '@/lib/rules';
import {
  type Exam,
  type Attempt,
  type Workspace,
  type ResponseValue,
  TYPE_LABELS,
  validateExam,
  validateWorkspace,
  questionsOf,
  isAnswered,
  isAuto,
  gradeQuestion,
  scoreAttempt,
  formatTime,
  remainingSeconds,
  finishAttempt,
  updateAnswer,
  scoringText,
} from '@/lib/exam';
import { loadWorkspace, persistWorkspace, downloadFile } from '@/lib/storage';
import { exportPaper, exportGrading } from '@/lib/export';
const initial: Workspace = { version: 1, exams: [sampleExam], attempts: [] };
function mergeBackup(current: Workspace, incoming: Workspace): Workspace {
  const result = structuredClone(current);
  for (const key of ['exams', 'attempts'] as const) {
    for (const item of incoming[key]) {
      const old = result[key].find((x) => x.id === item.id);
      if (old && JSON.stringify(old) !== JSON.stringify(item))
        throw new Error(
          `备份中 ID ${item.id} 与当前${key === 'exams' ? '试卷' : '记录'}内容冲突。请在新浏览器中恢复，或保留两个备份分别使用。`,
        );
      if (!old) (result[key] as (Exam | Attempt)[]).push(item);
    }
  }
  return result;
}
function Status({ state }: { state: string }) {
  return (
    <span className={`save-status ${state === '保存失败' ? 'error' : ''}`}>
      {state === '已保存到本机' ? (
        <CheckCheck size={14} />
      ) : state === '保存失败' ? (
        <AlertCircle size={14} />
      ) : (
        <Save size={14} />
      )}
      <span>{state}</span>
    </span>
  );
}
export default function Home() {
  const [workspace, setWorkspace] = useState<Workspace>(initial),
    workspaceRef = useRef(initial),
    [ready, setReady] = useState(false),
    [saveStatus, setSaveStatus] = useState('正在加载'),
    [tab, setTab] = useState('exams'),
    [selected, setSelected] = useState(sampleExam.id),
    [focusMode, setFocusMode] = useState(false),
    [name, setName] = useState(''),
    [view, setView] = useState<'home' | 'exam' | 'review'>('home'),
    [attemptId, setAttemptId] = useState(''),
    [error, setError] = useState(''),
    [pending, setPending] = useState<Exam | null>(null),
    [pendingBackup, setPendingBackup] = useState<Workspace | null>(null),
    [importing, setImporting] = useState(false),
    [exporting, setExporting] = useState(false),
    [dragging, setDragging] = useState(false),
    [submitOpen, setSubmitOpen] = useState(false),
    [mapOpen, setMapOpen] = useState(false),
    [full, setFull] = useState(false),
    [now, setNow] = useState(Date.now()),
    fileInput = useRef<HTMLInputElement>(null),
    saveQueue = useRef(Promise.resolve()),
    saveRevision = useRef(0),
    [lockBlocked, setLockBlocked] = useState(false),
    [lockReady, setLockReady] = useState(false),
    [reloadKey, setReloadKey] = useState(0);
  const selectedExam =
    workspace.exams.find((e) => e.id === selected) || workspace.exams[0];
  const attempt = workspace.attempts.find((a) => a.id === attemptId),
    qs = attempt ? questionsOf(attempt.exam) : [],
    q = attempt ? qs[attempt.current] : null;
  const active = workspace.attempts.find((a) => a.status === 'active');
  function notify(msg: string) {
    toast.add({ title: msg, type: 'success' });
  }
  function commit(next: Workspace) {
    workspaceRef.current = next;
    setWorkspace(next);
    setSaveStatus('正在保存');
    const revision = ++saveRevision.current;
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(() => persistWorkspace(next))
      .then(() => {
        if (revision === saveRevision.current) setSaveStatus('已保存到本机');
      })
      .catch(() => {
        setSaveStatus('保存失败');
        setError(
          '浏览器未能保存最新内容，可能是存储空间不足或禁用了存储。请立即下载工作台备份，避免关闭后丢失。',
        );
      });
  }
  function changeAttempt(id: string, fn: (a: Attempt) => Attempt) {
    const w = workspaceRef.current;
    commit({
      ...w,
      attempts: w.attempts.map((a) => (a.id === id ? fn(a) : a)),
    });
  }
  useEffect(() => {
    let cancelled = false;
    let release: (() => void) | undefined;
    const locks = navigator.locks;
    if (!locks) {
      setLockReady(true);
      return;
    }
    void locks.request(
      'mockexam-workspace-writer',
      { ifAvailable: true },
      async (lock) => {
        if (cancelled) return;
        if (!lock) {
          setLockBlocked(true);
          setLockReady(true);
          return;
        }
        setLockReady(true);
        await new Promise<void>((r) => {
          release = r;
        });
      },
    );
    return () => {
      cancelled = true;
      release?.();
    };
  }, []);
  useEffect(() => {
    if (!lockReady || lockBlocked) return;
    let cancelled = false;
    loadWorkspace()
      .then((w) => {
        if (cancelled) return;
        const loaded = w || initial;
        const normalized = {
          ...loaded,
          attempts: loaded.attempts.map((a) =>
            a.status === 'active' && a.deadline <= Date.now()
              ? finishAttempt(a)
              : a,
          ),
        };
        workspaceRef.current = normalized;
        setWorkspace(normalized);
        setSelected(normalized.exams[0]?.id || '');
        setReady(true);
        setSaveStatus('已保存到本机');
        if (JSON.stringify(loaded) !== JSON.stringify(normalized))
          commit(normalized);
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            '本机记录加载失败。为保护已有数据，已停止自动保存。可以重试加载，或从备份文件在其他浏览器恢复。',
          );
          setSaveStatus('加载失败');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lockReady, lockBlocked, reloadKey]);
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      const w = workspaceRef.current;
      if (w.attempts.some((a) => a.status === 'active' && a.deadline <= n)) {
        commit({
          ...w,
          attempts: w.attempts.map((a) =>
            a.status === 'active' && a.deadline <= n ? finishAttempt(a, n) : a,
          ),
        });
        notify('考试时间已到，答案已自动提交。');
      }
    }, 500);
    return () => clearInterval(t);
  }, [ready]);
  useEffect(() => {
    if (attempt?.status === 'submitted' && view === 'exam') {
      setView('review');
      setSubmitOpen(false);
      setMapOpen(false);
      if (document.fullscreenElement)
        void document.exitFullscreen().catch(() => {});
    }
  }, [attempt?.status, view]);
  useEffect(() => {
    function log(kind: 'fullscreen_exit' | 'tab_hidden') {
      const w = workspaceRef.current;
      const a = w.attempts.find((a) => a.status === 'active' && a.focusMode);
      if (a && a.deadline > Date.now())
        changeAttempt(a.id, (current) => ({
          ...current,
          events: [...current.events, { at: Date.now(), kind }],
        }));
    }
    function fs() {
      setFull(!!document.fullscreenElement);
      if (!document.fullscreenElement) log('fullscreen_exit');
    }
    function visibility() {
      if (document.hidden) log('tab_hidden');
    }
    document.addEventListener('fullscreenchange', fs);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('fullscreenchange', fs);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  useEffect(() => {
    function before(e: BeforeUnloadEvent) {
      if (
        workspaceRef.current.attempts.some((a) => a.status === 'active') ||
        saveStatus === '正在保存' ||
        saveStatus === '保存失败'
      ) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, [saveStatus]);
  useEffect(() => {
    if (!ready) return;
    const ctx = (
      document as Document & {
        modelContext?: {
          registerTool: (t: unknown, o: { signal: AbortSignal }) => unknown;
        };
      }
    ).modelContext;
    if (!ctx?.registerTool) return;
    const controller = new AbortController();
    const tools = [
      {
        name: 'get_exam_library',
        description:
          'Read this device’s exam titles, question counts, and durations. Does not expose reference answers.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: () => ({
          exams: workspaceRef.current.exams.map((e) => ({
            id: e.id,
            title: e.title,
            questionCount: questionsOf(e).length,
            durationMinutes: e.durationMinutes,
            totalPoints: e.totalPoints,
          })),
        }),
      },
      {
        name: 'stage_exam_import',
        description:
          'Validate a MockExam 1.0 exam and open the visible import review dialog. This stages the import; the user confirms it in the interface.',
        inputSchema: {
          type: 'object',
          properties: { exam: { type: 'object' } },
          required: ['exam'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: (input: unknown) => {
          if (!input || typeof input !== 'object' || !('exam' in input))
            throw new Error('Missing exam');
          const exam = validateExam((input as { exam: unknown }).exam);
          if (workspaceRef.current.exams.some((e) => e.id === exam.id))
            throw new Error('Exam ID already exists');
          setPending(exam);
          setView('home');
          return {
            staged: true,
            title: exam.title,
            questionCount: questionsOf(exam).length,
          };
        },
      },
    ];
    for (const t of tools) {
      try {
        Promise.resolve(
          ctx.registerTool(t, { signal: controller.signal }),
        ).catch(() => {});
      } catch {}
    }
    return () => controller.abort();
  }, [ready]);
  async function readImport(files: FileList | null) {
    if (!files?.[0]) return;
    const file = files[0];
    setImporting(true);
    setError('');
    try {
      const parsed = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
      if (parsed?.version === 1 && Array.isArray(parsed?.attempts)) {
        const backup = validateWorkspace(parsed);
        mergeBackup(workspaceRef.current, backup);
        setPendingBackup(backup);
      } else {
        if (file.size > 10 * 1024 * 1024) throw new Error('试卷不能超过 10 MB');
        const exam = validateExam(parsed);
        if (workspaceRef.current.exams.some((e) => e.id === exam.id))
          throw new Error(
            `试卷 ID “${exam.id}” 已存在。若这是新版试卷，请让 AI 设置新的 ID。`,
          );
        setPending(exam);
      }
    } catch (e) {
      setError(
        e instanceof SyntaxError
          ? 'JSON 语法错误。请检查引号、逗号，以及 LaTeX 反斜线是否正确转义。\n' +
              e.message
          : (e as Error).message,
      );
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }
  function confirmImport() {
    if (!pending) return;
    commit({
      ...workspaceRef.current,
      exams: [pending, ...workspaceRef.current.exams],
    });
    setSelected(pending.id);
    setPending(null);
    setTab('exams');
    notify('试卷已通过校验并加入工作台。');
  }
  function confirmBackup() {
    if (!pendingBackup) return;
    try {
      const merged = mergeBackup(workspaceRef.current, pendingBackup);
      merged.attempts = merged.attempts.map((a) =>
        a.status === 'active' && a.deadline <= Date.now()
          ? finishAttempt(a)
          : a,
      );
      commit(merged);
      setPendingBackup(null);
      notify('备份已恢复，已有内容已保留。');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function enterFullscreen() {
    try {
      if (!document.fullscreenElement) {
        if (!document.documentElement.requestFullscreen)
          throw new Error('unsupported');
        await document.documentElement.requestFullscreen();
      }
      return true;
    } catch {
      setError(
        '当前浏览器未能进入全屏。请使用支持全屏的浏览器，或关闭专注全屏模式后开始。',
      );
      return false;
    }
  }
  async function start() {
    if (!selectedExam || !ready) return;
    if (active) {
      setAttemptId(active.id);
      setView('exam');
      return;
    }
    if (focusMode && !(await enterFullscreen())) return;
    const start = Date.now();
    const a: Attempt = {
      id: crypto.randomUUID(),
      exam: structuredClone(selectedExam),
      name: name.trim(),
      startedAt: start,
      deadline: start + selectedExam.durationMinutes * 60000,
      status: 'active',
      current: 0,
      answers: {},
      flagged: [],
      focusMode,
      events: [],
    };
    commit({
      ...workspaceRef.current,
      attempts: [a, ...workspaceRef.current.attempts],
    });
    setAttemptId(a.id);
    setNow(start);
    setView('exam');
  }
  function resume(a: Attempt) {
    if (a.status === 'active' && remainingSeconds(a) === 0) {
      changeAttempt(a.id, finishAttempt);
      setView('review');
    } else setView(a.status === 'active' ? 'exam' : 'review');
    setAttemptId(a.id);
  }
  function answer(value: ResponseValue) {
    if (!attempt || !q) return;
    changeAttempt(attempt.id, (a) => updateAnswer(a, q.id, value));
  }
  function go(index: number) {
    if (!attempt) return;
    changeAttempt(attempt.id, (a) => ({
      ...a,
      current: Math.max(0, Math.min(qs.length - 1, index)),
    }));
    setMapOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function submit() {
    if (!attempt) return;
    changeAttempt(attempt.id, (a) => finishAttempt(a));
    setSubmitOpen(false);
    setView('review');
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
  }
  async function leaveExam() {
    await saveQueue.current;
    setView('home');
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    notify('已返回工作台，考试计时仍在继续。');
  }
  async function paper() {
    if (!selectedExam) return;
    setExporting(true);
    try {
      await exportPaper(selectedExam);
      notify(
        '打印包已下载。解压后打开 student-paper.html，即可打印或另存 PDF。',
      );
    } catch (e) {
      setError('导出失败：' + (e as Error).message);
    } finally {
      setExporting(false);
    }
  }
  function backup() {
    downloadFile(
      `mockexam-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(workspaceRef.current, null, 2),
    );
    notify('工作台备份已下载，包含试卷、评分细则和全部答题内容。');
  }
  async function copyRules() {
    try {
      await navigator.clipboard.writeText(rulesText);
      notify('完整出题规范已复制，可直接发给 AI。');
    } catch {
      downloadFile(
        'MockExam-AI规则.md',
        rulesText,
        'text/markdown;charset=utf-8',
      );
      notify('剪贴板不可用，已下载规范文件。');
    }
  }
  function grading(a: Attempt) {
    try {
      exportGrading(a);
      notify(
        '批改包已下载。将 grading.md / grading.json 和需要的附件一起交给 AI。',
      );
    } catch (e) {
      setError('导出失败：' + (e as Error).message);
    }
  }
  const messages = (
    <>
      <Notifications />
      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={19} />
          <div>
            <b>需要处理</b>
            <pre>{error}</pre>
            {!ready && !lockBlocked && (
              <button
                className="text-button"
                onClick={() => {
                  setError('');
                  setReloadKey((k) => k + 1);
                }}
              >
                重试加载
              </button>
            )}
            {ready && (
              <button className="text-button" onClick={backup}>
                下载工作台备份
              </button>
            )}
          </div>
          <button onClick={() => setError('')} aria-label="关闭提示">
            <X size={18} />
          </button>
        </div>
      )}
    </>
  );
  if (view === 'exam' && attempt && q) {
    const material = attempt.exam.materials?.find((m) => m.id === q.materialId);
    const answered = qs.filter((q) =>
      isAnswered(q, attempt.answers[q.id]),
    ).length;
    const remaining = remainingSeconds(attempt, now);
    return (
      <div className="exam-shell">
        {messages}
        <header className="exam-header">
          <div className="exam-heading">
            <span className="brand-icon">
              <GraduationCap size={22} />
            </span>
            <div>
              <b>{attempt.exam.title}</b>
              <p>{q.sectionTitle}</p>
            </div>
          </div>
          <div className={`timer ${remaining < 300 ? 'urgent' : ''}`}>
            <Clock3 size={17} />
            <div>
              <small>剩余时间</small>
              <strong>{formatTime(remaining)}</strong>
            </div>
          </div>
          <button className="button secondary" onClick={() => void leaveExam()}>
            <Save size={16} />
            <span>保存并返回</span>
          </button>
        </header>
        <Progress
          value={(answered / qs.length) * 100}
          aria-label="答题进度"
          className="exam-progress"
        />
        {attempt.focusMode && !full && (
          <div className="focus-warning">
            <ShieldCheck size={17} />
            <span>专注模式已开启，当前不在全屏。计时仍在继续。</span>
            <button
              className="text-button"
              onClick={() => void enterFullscreen()}
            >
              <Maximize2 size={15} />
              返回全屏
            </button>
          </div>
        )}
        <div className={`exam-content ${material ? 'with-material' : ''}`}>
          {material && (
            <aside className="material-panel">
              <span className="eyebrow">READING MATERIAL</span>
              <h2>{material.title}</h2>
              <RichText text={material.content} />
            </aside>
          )}
          <main className="question-panel">
            <div className="question-topline">
              <div>
                <span className="question-number">{attempt.current + 1}</span>
                <span>{TYPE_LABELS[q.type]}</span>
                <span className="tag">{q.points} 分</span>
              </div>
              <button
                className={`flag-button ${attempt.flagged.includes(q.id) ? 'flagged' : ''}`}
                onClick={() =>
                  changeAttempt(attempt.id, (a) => ({
                    ...a,
                    flagged: a.flagged.includes(q.id)
                      ? a.flagged.filter((id) => id !== q.id)
                      : [...a.flagged, q.id],
                  }))
                }
              >
                <Flag size={16} />
                {attempt.flagged.includes(q.id) ? '已标记' : '稍后检查'}
              </button>
            </div>
            {q.sectionInstructions && (
              <p className="section-instructions">{q.sectionInstructions}</p>
            )}
            <RichText text={q.prompt} className="question-prompt" />
            <p className="scoring-note">{scoringText(q)}</p>
            <AnswerInput
              key={q.id}
              q={q}
              value={attempt.answers[q.id] || {}}
              onChange={answer}
              onError={setError}
            />
          </main>
        </div>
        <footer className="exam-footer">
          <Status state={saveStatus} />
          <button
            className="question-map-trigger"
            onClick={() => setMapOpen(true)}
          >
            <Grid2X2 size={17} />第 {attempt.current + 1} / {qs.length} 题
            <span>· {answered} 已答</span>
          </button>
          <div className="exam-navigation">
            <button
              className="button secondary"
              disabled={attempt.current === 0}
              onClick={() => go(attempt.current - 1)}
            >
              <ArrowLeft size={16} />
              上一题
            </button>
            {attempt.current < qs.length - 1 ? (
              <button
                className="button primary"
                onClick={() => go(attempt.current + 1)}
              >
                下一题
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="button primary"
                onClick={() => setSubmitOpen(true)}
              >
                检查并交卷
                <Check size={17} />
              </button>
            )}
          </div>
        </footer>
        <Dialog open={mapOpen} onOpenChange={setMapOpen}>
          <DialogContent className="wide-dialog">
            <DialogTitle>题目导航</DialogTitle>
            <DialogDescription>
              自由切换题目，绿色为已作答，角标为稍后检查。
            </DialogDescription>
            <div className="question-map">
              {qs.map((item, i) => (
                <button
                  key={item.id}
                  className={`${isAnswered(item, attempt.answers[item.id]) ? 'answered' : ''} ${attempt.current === i ? 'current' : ''}`}
                  onClick={() => go(i)}
                  aria-label={`第 ${i + 1} 题，${isAnswered(item, attempt.answers[item.id]) ? '已答' : '未完成'}${attempt.flagged.includes(item.id) ? '，已标记' : ''}`}
                >
                  {i + 1}
                  {attempt.flagged.includes(item.id) && <Flag size={10} />}
                </button>
              ))}
            </div>
            <p>
              {answered} / {qs.length} 题已完成 · {attempt.flagged.length}{' '}
              题待检查
            </p>
            <button
              className="button primary"
              onClick={() => {
                setMapOpen(false);
                setSubmitOpen(true);
              }}
            >
              提交试卷
            </button>
          </DialogContent>
        </Dialog>
        <AlertDialog open={submitOpen} onOpenChange={setSubmitOpen}>
          <AlertDialogContent>
            <AlertDialogTitle>确认提交本次考试？</AlertDialogTitle>
            <AlertDialogDescription>
              还有 {qs.length - answered} 道题未完成，{attempt.flagged.length}{' '}
              道题标记待检查。交卷后不能继续修改，选择题将立即批改。
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>继续检查</AlertDialogCancel>
              <AlertDialogAction onClick={submit}>确认交卷</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }
  return (
    <div className="site">
      {messages}
      <header className="topbar">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setView('home');
            setTab('exams');
          }}
        >
          <span className="brand-icon">
            <GraduationCap size={23} />
          </span>
          MockExam<span className="brand-label">STUDIO</span>
        </a>
        <div className="local-tag">
          <span />
          个人考试工作台
        </div>
      </header>
      <main className="workspace">
        {lockBlocked && (
          <div className="focus-warning">
            <AlertCircle size={18} />
            其他标签页正在使用此工作台。请关闭其他标签页后刷新，避免覆盖答题记录。
          </div>
        )}
        {view === 'review' && attempt ? (
          <>
            <button
              className="text-button back-link"
              onClick={() => {
                setView('home');
                setTab('records');
              }}
            >
              <ArrowLeft size={16} />
              返回答题记录
            </button>
            <div className="review-heading">
              <div className="eyebrow">EXAM COMPLETED</div>
              <h1>完成一次练习，看见下一步。</h1>
              <p>
                {attempt.exam.title} · {attempt.name || '未填写姓名'}
              </p>
            </div>
            <div className="result-summary">
              <div className="result-score">
                <span>自动批改得分</span>
                <strong>
                  {scoreAttempt(attempt).earned}
                  <small> / {scoreAttempt(attempt).autoTotal}</small>
                </strong>
                <p>仅包含选择与判断题</p>
              </div>
              <div>
                <b>{scoreAttempt(attempt).manualTotal} 分待批改</b>
                <p>填空、解答等题目的分数尚未计入。</p>
                <p>
                  已作答 {scoreAttempt(attempt).answered} / {qs.length} 题 ·
                  用时{' '}
                  {formatTime(
                    Math.max(
                      0,
                      Math.floor(
                        ((attempt.submittedAt || now) - attempt.startedAt) /
                          1000,
                      ),
                    ),
                  )}
                </p>
                <p>
                  专注记录：退出全屏{' '}
                  {
                    attempt.events.filter((e) => e.kind === 'fullscreen_exit')
                      .length
                  }{' '}
                  次，切屏{' '}
                  {attempt.events.filter((e) => e.kind === 'tab_hidden').length}{' '}
                  次
                </p>
              </div>
              <div className="result-actions">
                <button
                  className="button primary"
                  onClick={() => grading(attempt)}
                >
                  <Download size={17} />
                  导出 AI 批改包
                </button>
                <button className="button secondary" onClick={backup}>
                  <Save size={16} />
                  下载完整备份
                </button>
              </div>
            </div>
            <div className="section-heading">
              <h2>逐题回顾</h2>
              <span className="muted">参考答案与评分细则已解锁</span>
            </div>
            {qs.map((item, i) => {
              const response = attempt.answers[item.id];
              const score = gradeQuestion(item, response);
              const material = attempt.exam.materials?.find(
                (m) => m.id === item.materialId,
              );
              return (
                <details
                  className="review-question"
                  key={item.id}
                  open={i === 0}
                >
                  <summary>
                    <span>
                      <b>{String(i + 1).padStart(2, '0')}</b>
                      {TYPE_LABELS[item.type]}{' '}
                      <span className="muted">{item.points} 分</span>
                    </span>
                    <span
                      className={`tag ${score === null ? 'pending-tag' : score === item.points ? '' : 'wrong-tag'}`}
                    >
                      {score === null
                        ? '待人工批改'
                        : `${score} / ${item.points} 分`}
                    </span>
                  </summary>
                  <div className="review-body">
                    {material && (
                      <div className="review-material">
                        <b>{material.title}</b>
                        <RichText text={material.content} />
                      </div>
                    )}
                    <RichText text={item.prompt} />
                    {item.options?.map((o) => (
                      <div className="review-option" key={o.id}>
                        <b>{o.id}.</b>
                        <RichText text={o.text} />
                      </div>
                    ))}
                    <div className="review-columns">
                      <div>
                        <h3>你的答案</h3>
                        {response?.text ? (
                          <RichText
                            text={
                              item.type === 'code'
                                ? '```' +
                                  (item.language || '') +
                                  '\n' +
                                  response.text +
                                  '\n```'
                                : response.text
                            }
                          />
                        ) : null}
                        {response?.selected?.length ? (
                          <p>{response.selected.join('、')}</p>
                        ) : null}
                        {response?.fields ? (
                          <pre>{JSON.stringify(response.fields, null, 2)}</pre>
                        ) : null}
                        {response?.attachments?.map((f, j) => (
                          <div className="review-attachment" key={j}>
                            <button
                              className="text-button"
                              onClick={() => {
                                const b = atob(f.data.split(',')[1]);
                                downloadFile(
                                  f.name,
                                  Uint8Array.from(b, (c) => c.charCodeAt(0)),
                                  f.type || 'application/octet-stream',
                                );
                              }}
                            >
                              <Download size={14} />
                              {f.name}
                            </button>
                            {/^data:image\/(png|jpeg|webp|gif);base64,/.test(
                              f.data,
                            ) && <img src={f.data} alt={f.name} />}
                          </div>
                        ))}
                        {!isAnswered(item, response) && (
                          <p className="muted">未完成作答</p>
                        )}
                      </div>
                      <div>
                        <h3>参考答案</h3>
                        <RichText
                          text={
                            typeof item.answer === 'string'
                              ? item.answer
                              : '```json\n' +
                                JSON.stringify(item.answer, null, 2) +
                                '\n```'
                          }
                        />
                      </div>
                    </div>
                    <div className="rubric-panel">
                      <h3>评分细则</h3>
                      {item.rubric.map((r, j) => (
                        <p key={j}>
                          <span>{r.criterion}</span>
                          <b>{r.points} 分</b>
                        </p>
                      ))}
                      <small>{scoringText(item)}</small>
                    </div>
                    {item.explanation && <RichText text={item.explanation} />}
                  </div>
                </details>
              );
            })}
          </>
        ) : (
          <>
            <div className="page-heading">
              <div>
                <div className="eyebrow">YOUR NEXT PERSONAL BEST</div>
                <h1>每一次练习，都更接近从容。</h1>
                <p>从一份复习资料，到一场属于你的模拟考试。</p>
              </div>
              <span className="version">WORKSPACE / 01</span>
            </div>
            {active && (
              <div className="active-banner">
                <Clock3 size={18} />
                <div>
                  <b>你有一场尚未完成的考试</b>
                  <p>
                    {active.exam.title} · 剩余{' '}
                    {formatTime(remainingSeconds(active, now))}
                    ，离开页面不会暂停计时。
                  </p>
                </div>
                <button
                  className="button primary"
                  onClick={() => resume(active)}
                >
                  继续作答
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
            <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
              <TabsList className="main-tabs" variant="line">
                <TabsTrigger value="exams">
                  <LayoutDashboard />
                  考试工作台
                </TabsTrigger>
                <TabsTrigger value="records">
                  <History />
                  答题记录
                  {workspace.attempts.length > 0 && (
                    <span className="tab-count">
                      {workspace.attempts.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="rules">
                  <BookOpen />
                  AI 出题规范
                </TabsTrigger>
              </TabsList>
              <TabsContent value="exams">
                <div className="dashboard-grid">
                  <section>
                    <div
                      className={`import-card ${dragging ? 'dragging' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        if (ready) void readImport(e.dataTransfer.files);
                      }}
                    >
                      <div className="import-icon">
                        <FileJson2 size={30} />
                      </div>
                      <div>
                        <div className="eyebrow">BRING YOUR OWN EXAM</div>
                        <h2>你的资料，你的试卷。</h2>
                        <p>导入符合规范的 JSON 文件，即刻开始。</p>
                        <button
                          className="button primary"
                          disabled={!ready || importing}
                          onClick={() => fileInput.current?.click()}
                        >
                          <Upload size={17} />
                          {importing ? '正在校验…' : '导入试卷文件'}
                        </button>
                        <span className="import-hint">
                          或拖拽至此 · JSON · 最大 10 MB
                        </span>
                      </div>
                    </div>
                    <div className="section-heading">
                      <h2>
                        我的试卷{' '}
                        <span className="count">{workspace.exams.length}</span>
                      </h2>
                      <button
                        className="text-button"
                        disabled={!ready}
                        onClick={() => fileInput.current?.click()}
                      >
                        <Plus size={16} />
                        导入
                      </button>
                    </div>
                    {workspace.exams.map((exam) => (
                      <button
                        key={exam.id}
                        className={`exam-card ${selectedExam?.id === exam.id ? 'selected' : ''}`}
                        onClick={() => setSelected(exam.id)}
                        aria-pressed={selectedExam?.id === exam.id}
                      >
                        <span className="exam-icon">
                          <FileText />
                        </span>
                        <span className="exam-info">
                          <span className="tags">
                            <span className="tag">{exam.subject}</span>
                            <span className="tag subtle">
                              {exam.id === sampleExam.id
                                ? '示例试卷'
                                : '已校验'}
                            </span>
                          </span>
                          <h3>{exam.title}</h3>
                          <p>
                            {exam.description ||
                              `${exam.sections.length} 个部分 · 评分细则完整`}
                          </p>
                          <span className="exam-meta">
                            <span>
                              <Clock3 size={14} />
                              {exam.durationMinutes} 分钟
                            </span>
                            <span>{questionsOf(exam).length} 道题</span>
                            <span>{exam.totalPoints} 分</span>
                          </span>
                        </span>
                        {selectedExam?.id === exam.id && (
                          <span className="selection-check">
                            <Check size={15} />
                          </span>
                        )}
                      </button>
                    ))}
                    <div className="workflow">
                      <span className="eyebrow">从资料到实战，只需三步</span>
                      <div>
                        <button onClick={() => setTab('rules')}>
                          <b>01</b>复制出题规范
                        </button>
                        <i>→</i>
                        <p>
                          <b>02</b>让 AI 生成试卷
                        </p>
                        <i>→</i>
                        <p>
                          <b>03</b>导入并开始考试
                        </p>
                      </div>
                    </div>
                  </section>
                  {selectedExam && (
                    <aside className="setup-card">
                      <div className="section-heading">
                        <h2>准备开始</h2>
                        <span className="ready-dot">已就绪</span>
                      </div>
                      <h3>{selectedExam.title}</h3>
                      <div className="stats">
                        <div>
                          <strong>
                            {selectedExam.durationMinutes}
                            <span> min</span>
                          </strong>
                          <small>考试时长</small>
                        </div>
                        <div>
                          <strong>
                            {questionsOf(selectedExam).length}
                            <span> 题</span>
                          </strong>
                          <small>逐题作答</small>
                        </div>
                        <div>
                          <strong>
                            {selectedExam.totalPoints}
                            <span> 分</span>
                          </strong>
                          <small>试卷总分</small>
                        </div>
                      </div>
                      <label className="name-input">
                        <span>
                          考生姓名 <small>可选</small>
                        </span>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="输入你的姓名"
                          maxLength={80}
                        />
                      </label>
                      <div className="setting-row">
                        <div>
                          <label htmlFor="focus">
                            <b>专注全屏模式</b>
                          </label>
                          <p>记录退出全屏与切屏次数</p>
                        </div>
                        <Switch
                          id="focus"
                          checked={focusMode}
                          onCheckedChange={setFocusMode}
                        />
                      </div>
                      <details className="exam-instructions">
                        <summary>查看考试说明</summary>
                        <RichText text={selectedExam.instructions} />
                      </details>
                      <div className="setup-note">
                        <ShieldCheck size={17} />
                        <p>
                          选择题自动批改；主观题可导出交给
                          AI。开始后持续计时，时间到自动交卷。
                        </p>
                      </div>
                      <button
                        className="button primary full"
                        disabled={!ready}
                        onClick={() => void start()}
                      >
                        {active ? '继续进行中的考试' : '进入模拟考试'}
                        <ArrowUpRight size={19} />
                      </button>
                      <button
                        className="button secondary full"
                        disabled={exporting}
                        onClick={() => void paper()}
                      >
                        <Download size={17} />
                        {exporting ? '正在整理打印资料…' : '导出可打印试卷'}
                      </button>
                      <p className="caption">A4 留白学生卷 + 完整答案评分卷</p>
                      <div className="setup-save">
                        <Status state={saveStatus} />
                      </div>
                    </aside>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="records">
                <div className="records-top">
                  <div>
                    <h2>把每一次作答，完整留下。</h2>
                    <p>保存在当前浏览器。下载备份后，可在其他设备恢复。</p>
                  </div>
                  <div className="button-group">
                    <button
                      className="button secondary"
                      disabled={!ready}
                      onClick={() => fileInput.current?.click()}
                    >
                      <RotateCcw size={16} />
                      恢复备份
                    </button>
                    <button
                      className="button primary"
                      disabled={!ready}
                      onClick={backup}
                    >
                      <Download size={16} />
                      下载工作台备份
                    </button>
                  </div>
                </div>
                {workspace.attempts.length === 0 ? (
                  <Empty className="empty-state">
                    <History size={34} />
                    <h3>第一份答题记录，从这里开始。</h3>
                    <p>进入模拟考试后，作答会自动保存到当前设备。</p>
                    <button
                      className="button secondary"
                      onClick={() => setTab('exams')}
                    >
                      前往考试工作台
                      <ArrowRight size={16} />
                    </button>
                  </Empty>
                ) : (
                  <div className="record-list">
                    {workspace.attempts.map((a) => (
                      <article className="record-card" key={a.id}>
                        <div className="record-main">
                          <span className="exam-icon">
                            <FileText />
                          </span>
                          <div>
                            <div className="tags">
                              <span
                                className={`tag ${a.status === 'active' ? 'pending-tag' : ''}`}
                              >
                                {a.status === 'active' ? '进行中' : '已交卷'}
                              </span>
                              <span className="tag subtle">
                                {a.name || '未填写姓名'}
                              </span>
                            </div>
                            <h3>{a.exam.title}</h3>
                            <p>
                              {new Date(a.startedAt).toLocaleString('zh-CN')} ·{' '}
                              {scoreAttempt(a).answered} /{' '}
                              {questionsOf(a.exam).length} 题已答
                            </p>
                          </div>
                        </div>
                        <div className="record-score">
                          {a.status === 'submitted' ? (
                            <>
                              <b>
                                {scoreAttempt(a).earned}{' '}
                                <small>/ {scoreAttempt(a).autoTotal}</small>
                              </b>
                              <span>
                                自动得分 · {scoreAttempt(a).manualTotal} 分待批
                              </span>
                            </>
                          ) : (
                            <>
                              <b>{formatTime(remainingSeconds(a, now))}</b>
                              <span>剩余时间</span>
                            </>
                          )}
                        </div>
                        <div className="record-actions">
                          <button
                            className="button secondary"
                            onClick={() => grading(a)}
                          >
                            <Download size={15} />
                            批改包
                          </button>
                          <button
                            className="button primary"
                            onClick={() => resume(a)}
                          >
                            {a.status === 'active' ? '继续作答' : '查看结果'}
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                <div className="storage-note">
                  <Monitor size={19} />
                  <p>
                    <b>答题内容仅保存在本机。</b>
                    清除浏览器数据会删除本机记录；换设备前请下载备份。备份和批改包都包含完整答案与评分标准。
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="rules">
                <div className="rules-layout">
                  <aside className="rules-sidebar">
                    <span className="eyebrow">ONE FORMAT. EVERY EXAM.</span>
                    <h2>
                      给 AI 一套明确的
                      <br />
                      出题标准。
                    </h2>
                    <p>
                      将完整规范和复习资料一起发给 AI，拿到试卷 JSON
                      后即可导入。
                    </p>
                    <button
                      className="button primary full"
                      onClick={() => void copyRules()}
                    >
                      <Copy size={16} />
                      复制完整出题规范
                    </button>
                    <button
                      className="button secondary full"
                      onClick={() =>
                        downloadFile(
                          'MockExam-AI规则-v1.0.md',
                          rulesText,
                          'text/markdown;charset=utf-8',
                        )
                      }
                    >
                      <Download size={16} />
                      下载规范文件
                    </button>
                    <button
                      className="text-button sample-download"
                      onClick={() =>
                        downloadFile(
                          'MockExam-示例试卷.json',
                          JSON.stringify(sampleExam, null, 2),
                        )
                      }
                    >
                      <FileJson2 size={15} />
                      下载可导入示例
                    </button>
                    <div className="rules-features">
                      <p>
                        <CheckCircle2 size={16} />
                        14 种基础题型，自由组合
                      </p>
                      <p>
                        <CheckCircle2 size={16} />
                        每题预设答案和评分细则
                      </p>
                      <p>
                        <CheckCircle2 size={16} />
                        LaTeX 公式与 Markdown
                      </p>
                      <p>
                        <Code2 size={16} />
                        代码作答与过程附件
                      </p>
                    </div>
                    <p className="rules-help">
                      无法直接表达的复杂题型，使用共享材料加独立小问，或附件作答。详细限制均写在规范内。
                    </p>
                  </aside>
                  <article className="rules-document">
                    <div className="document-title">
                      <FileText size={18} />
                      <span>MOCKEXAM_SPEC.md</span>
                      <span className="tag">v1.0</span>
                    </div>
                    <RichText text={rulesText} />
                  </article>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
        <footer>
          <span>MockExam Studio</span>
          <span>认真练习，安心上场。</span>
          <span>试卷规范 v1.0</span>
        </footer>
      </main>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="hidden-input"
        aria-label="导入 JSON 试卷或备份"
        onChange={(e) => void readImport(e.target.files)}
      />
      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <DialogContent className="wide-dialog">
          <DialogTitle>试卷已通过格式校验</DialogTitle>
          <DialogDescription>
            题目类型、答案引用、分值总和及评分细则结构均已检查。内容正确性仍需由出题者确认。
          </DialogDescription>
          {pending && (
            <>
              <div className="import-preview">
                <h3>{pending.title}</h3>
                <p>
                  {pending.subject} · {pending.durationMinutes} 分钟 ·{' '}
                  {pending.totalPoints} 分 · {questionsOf(pending).length} 题
                </p>
                <div className="tags">
                  {[...new Set(questionsOf(pending).map((q) => q.type))].map(
                    (t) => (
                      <span className="tag" key={t}>
                        {TYPE_LABELS[t]}
                      </span>
                    ),
                  )}
                </div>
              </div>
              <button className="button primary" onClick={confirmImport}>
                加入我的试卷
                <Check size={17} />
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!pendingBackup}
        onOpenChange={(open) => {
          if (!open) setPendingBackup(null);
        }}
      >
        <DialogContent>
          <DialogTitle>恢复工作台备份</DialogTitle>
          <DialogDescription>
            将合并 {pendingBackup?.exams.length} 份试卷和{' '}
            {pendingBackup?.attempts.length}{' '}
            条答题记录。相同内容不会重复导入，已有记录会保留。超过截止时间的考试自动交卷。
          </DialogDescription>
          <button className="button primary" onClick={confirmBackup}>
            恢复并合并备份
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
