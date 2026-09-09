import { t } from './i18n.ts';
export const TYPE_LABELS = {
  single_choice: '单项选择',
  multiple_choice: '多项选择',
  true_false: '判断题',
  fill_blank: '填空题',
  short_answer: '简答题',
  essay: '论述 / 作文',
  calculation: '计算题',
  proof: '证明题',
  matching: '匹配题',
  ordering: '排序题',
  table: '表格题',
  code: '编程题',
  drawing: '作图题',
  file_response: '附件 / 实践题',
} as const;
export type QuestionType = keyof typeof TYPE_LABELS;
export type Option = {
  id: string;
  text: string;
};
export type Question = {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  answer: unknown;
  rubric: {
    criterion: string;
    points: number;
  }[];
  explanation?: string;
  materialId?: string;
  options?: Option[];
  blanks?: {
    id: string;
    label: string;
  }[];
  items?: Option[];
  matches?: Option[];
  columns?: string[];
  rows?: string[];
  language?: string;
  acceptedFiles?: string[];
  spaceLines: number;
  grading: {
    mode: 'exact' | 'partial' | 'manual';
    wrongPenalty?: number;
  };
};
export type Exam = {
  schemaVersion: '1.0';
  id: string;
  title: string;
  subject: string;
  description?: string;
  durationMinutes: number;
  totalPoints: number;
  instructions: string;
  materials?: {
    id: string;
    title: string;
    content: string;
  }[];
  sections: {
    id: string;
    title: string;
    instructions?: string;
    questions: Question[];
  }[];
};
export type Attachment = {
  name: string;
  type: string;
  data: string;
};
export type ResponseValue = {
  text?: string;
  selected?: string[];
  fields?: Record<string, string>;
  attachments?: Attachment[];
};
export type Attempt = {
  id: string;
  exam: Exam;
  name: string;
  startedAt: number;
  deadline: number;
  submittedAt?: number;
  status: 'active' | 'submitted';
  current: number;
  answers: Record<string, ResponseValue>;
  flagged: string[];
  focusMode: boolean;
  events: {
    at: number;
    kind: 'fullscreen_exit' | 'tab_hidden';
  }[];
};
export type Workspace = {
  version: 1;
  exams: Exam[];
  attempts: Attempt[];
};
export const questionsOf = (exam: Exam) =>
  exam.sections.flatMap((s) =>
    s.questions.map((q) => ({
      ...q,
      sectionTitle: s.title,
      sectionInstructions: s.instructions,
    })),
  );
export const isAuto = (q: Question) =>
  ['single_choice', 'multiple_choice', 'true_false'].includes(q.type);
export function isAnswered(q: Question, a?: ResponseValue) {
  if (!a) return false;
  if (isAuto(q)) return !!a.selected?.length;
  const keys = fieldKeys(q);
  if (keys.length) return keys.every((k) => !!a.fields?.[k]?.trim());
  return !!a.text?.trim() || !!a.attachments?.length;
}
export function fieldKeys(q: Question): string[] {
  if (q.type === 'fill_blank') return q.blanks!.map((x) => x.id);
  if (q.type === 'matching') return q.items!.map((x) => x.id);
  if (q.type === 'ordering') return q.items!.map((_, i) => String(i + 1));
  if (q.type === 'table')
    return q.rows!.flatMap((_, r) => q.columns!.map((_, c) => `${r}:${c}`));
  return [];
}
const round = (n: number) => Math.round(n * 100) / 100;
export function gradeQuestion(q: Question, a?: ResponseValue): number | null {
  if (!isAuto(q)) return null;
  const selected = [...new Set(a?.selected || [])];
  if (!selected.length) return 0;
  const correct = q.answer as string[];
  const exact =
    selected.length === correct.length &&
    selected.every((x) => correct.includes(x));
  if (q.grading.mode === 'exact')
    return exact
      ? q.points
      : q.grading.wrongPenalty
        ? -q.grading.wrongPenalty
        : 0;
  if (selected.some((x) => !correct.includes(x)))
    return q.grading.wrongPenalty ? -q.grading.wrongPenalty : 0;
  return round((q.points * selected.length) / correct.length);
}
export function scoreAttempt(a: Attempt) {
  const qs = questionsOf(a.exam);
  return {
    earned: round(
      qs.reduce((n, q) => n + (gradeQuestion(q, a.answers[q.id]) || 0), 0),
    ),
    autoTotal: round(qs.filter(isAuto).reduce((n, q) => n + q.points, 0)),
    manualTotal: round(
      qs.filter((q) => !isAuto(q)).reduce((n, q) => n + q.points, 0),
    ),
    answered: qs.filter((q) => isAnswered(q, a.answers[q.id])).length,
  };
}
export function scoringText(q: Question) {
  return !isAuto(q)
    ? t('人工 / AI 按评分细则逐项给分')
    : t(
        '{0}；错选{1}；未作答 0 分',
        q.grading.mode === 'exact'
          ? t('全部选对得满分')
          : t('未选错时按正确选项比例给分'),
        q.grading.wrongPenalty
          ? t('扣 {0} 分', q.grading.wrongPenalty)
          : t('得 0 分'),
      );
}
export function remainingSeconds(a: Attempt, now = Date.now()) {
  return Math.max(0, Math.ceil((a.deadline - now) / 1000));
}
export function finishAttempt(a: Attempt, now = Date.now()): Attempt {
  return a.status === 'submitted'
    ? a
    : { ...a, status: 'submitted', submittedAt: Math.min(now, a.deadline) };
}
export function updateAnswer(
  a: Attempt,
  qid: string,
  value: ResponseValue,
  now = Date.now(),
): Attempt {
  if (a.status !== 'active') return a;
  if (now >= a.deadline) return finishAttempt(a, now);
  return { ...a, answers: { ...a.answers, [qid]: value } };
}
export function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
export function validateExam(input: unknown): Exam {
  const errors: string[] = [];
  function need(ok: unknown, path: string, message: string) {
    if (!ok) errors.push(`${path}：${message}`);
  }
  function obj(v: unknown): v is Record<string, any> {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }
  const str = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  function id(v: unknown, path: string) {
    need(
      typeof v === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(v),
      path,
      t('应为字母开头，含字母、数字、下划线或短横线的唯一 ID（最多 80 字符）'),
    );
  }
  function unique(values: unknown[], path: string) {
    need(new Set(values).size === values.length, path, t('ID 或内容重复'));
  }
  function checkOptions(v: unknown, path: string) {
    need(
      Array.isArray(v) && v.length >= 2 && v.length <= 50,
      path,
      t('需要 2–50 项'),
    );
    if (Array.isArray(v)) {
      v.forEach((o, i) => {
        if (!obj(o)) {
          need(false, `${path}[${i}]`, t('需要对象'));
          return;
        }
        id(o.id, `${path}[${i}].id`);
        need(str(o.text), `${path}[${i}].text`, t('不能为空'));
      });
      unique(
        v.map((o) => o?.id),
        path,
      );
    }
  }
  if (!obj(input)) throw new Error(t('根节点必须是 JSON 对象。'));
  const e = input;
  need(e.schemaVersion === '1.0', 'schemaVersion', t('仅支持 "1.0"'));
  id(e.id, 'id');
  need(str(e.title), 'title', t('试卷标题不能为空'));
  need(str(e.subject), 'subject', t('科目不能为空'));
  need(str(e.instructions), 'instructions', t('考试说明不能为空'));
  need(
    num(e.durationMinutes) &&
      e.durationMinutes >= 1 &&
      e.durationMinutes <= 1440,
    'durationMinutes',
    t('须为 1–1440 分钟'),
  );
  need(num(e.totalPoints) && e.totalPoints > 0, 'totalPoints', t('应为正数'));
  if (e.description !== undefined)
    need(typeof e.description === 'string', 'description', t('应为文本'));
  const materials = Array.isArray(e.materials) ? e.materials : [];
  if (e.materials !== undefined)
    need(Array.isArray(e.materials), 'materials', t('应为数组'));
  materials.forEach((m: any, i: number) => {
    if (!obj(m)) {
      need(false, `materials[${i}]`, t('需要对象'));
      return;
    }
    id(m.id, `materials[${i}].id`);
    need(
      str(m.title) && str(m.content),
      `materials[${i}]`,
      t('需提供标题和材料正文'),
    );
  });
  unique(
    materials.map((m: any) => m?.id),
    'materials',
  );
  need(
    Array.isArray(e.sections) &&
      e.sections.length > 0 &&
      e.sections.length <= 50,
    'sections',
    t('需要 1–50 个部分'),
  );
  const qids: string[] = [];
  let sum = 0;
  let count = 0;
  if (Array.isArray(e.sections)) {
    unique(
      e.sections.map((s: any) => s?.id),
      'sections',
    );
    e.sections.forEach((s: any, si: number) => {
      const sp = `sections[${si}]`;
      if (!obj(s)) {
        need(false, sp, t('需要对象'));
        return;
      }
      id(s.id, `${sp}.id`);
      need(str(s.title), `${sp}.title`, t('不能为空'));
      if (s.instructions !== undefined)
        need(
          typeof s.instructions === 'string',
          `${sp}.instructions`,
          t('应为文本'),
        );
      need(
        Array.isArray(s.questions) && s.questions.length > 0,
        `${sp}.questions`,
        t('题目列表不能为空'),
      );
      if (!Array.isArray(s.questions)) return;
      s.questions.forEach((q: any, qi: number) => {
        const p = `${sp}.questions[${qi}]`;
        count++;
        if (!obj(q)) {
          need(false, p, t('需要对象'));
          return;
        }
        id(q.id, `${p}.id`);
        qids.push(q.id);
        need(
          Object.hasOwn(TYPE_LABELS, q.type),
          `${p}.type`,
          t('不支持的题型，请使用规范中的 14 种题型'),
        );
        need(str(q.prompt), `${p}.prompt`, t('题干不能为空'));
        need(
          num(q.points) &&
            q.points > 0 &&
            Math.abs(q.points * 100 - Math.round(q.points * 100)) < 1e-8,
          `${p}.points`,
          t('须为正数，最多两位小数'),
        );
        if (num(q.points)) sum += q.points;
        need(
          Number.isInteger(q.spaceLines) &&
            q.spaceLines >= 1 &&
            q.spaceLines <= 60,
          `${p}.spaceLines`,
          t('留白应为 1–60 行整数'),
        );
        need(
          q.answer !== undefined && q.answer !== null && q.answer !== '',
          `${p}.answer`,
          t('必须提前给出参考答案'),
        );
        if (q.explanation !== undefined)
          need(
            typeof q.explanation === 'string',
            `${p}.explanation`,
            t('应为文本'),
          );
        if (q.materialId !== undefined)
          need(
            materials.some((m: any) => m?.id === q.materialId),
            `${p}.materialId`,
            t('找不到对应材料'),
          );
        need(
          Array.isArray(q.rubric) && q.rubric.length > 0,
          `${p}.rubric`,
          t('必须给出评分细则'),
        );
        if (Array.isArray(q.rubric)) {
          q.rubric.forEach((r: any, ri: number) =>
            need(
              obj(r) && str(r.criterion) && num(r.points) && r.points > 0,
              `${p}.rubric[${ri}]`,
              t('需要 criterion 和正数 points'),
            ),
          );
          need(
            Math.abs(
              q.rubric.reduce(
                (n: number, r: any) => n + (num(r?.points) ? r.points : 0),
                0,
              ) - q.points,
            ) < 0.001,
            `${p}.rubric`,
            t('细则分数总和必须等于题目分值'),
          );
        }
        need(obj(q.grading), `${p}.grading`, t('必须指定评分模式'));
        if (
          ['single_choice', 'multiple_choice', 'true_false'].includes(q.type)
        ) {
          checkOptions(q.options, `${p}.options`);
          const answers = Array.isArray(q.answer) ? q.answer : [];
          need(
            answers.length > 0 &&
              answers.every(
                (v: unknown) =>
                  typeof v === 'string' &&
                  q.options?.some((o: any) => o.id === v),
              ),
            `${p}.answer`,
            t('应为有效选项 ID 的非空数组'),
          );
          unique(answers, `${p}.answer`);
          if (q.type !== 'multiple_choice')
            need(
              answers.length === 1,
              `${p}.answer`,
              t('单选和判断只能有一个答案'),
            );
          if (q.type === 'true_false')
            need(
              q.options?.length === 2,
              `${p}.options`,
              t('判断题必须有两个选项'),
            );
          need(
            q.grading?.mode === 'exact' ||
              (q.type === 'multiple_choice' && q.grading?.mode === 'partial'),
            `${p}.grading.mode`,
            t('单选/判断使用 exact，多选可用 exact 或 partial'),
          );
          if (q.grading?.wrongPenalty !== undefined)
            need(
              num(q.grading.wrongPenalty) &&
                q.grading.wrongPenalty >= 0 &&
                q.grading.wrongPenalty <= q.points,
              `${p}.grading.wrongPenalty`,
              t('错选扣分应在 0 与本题分值之间'),
            );
        } else {
          need(
            q.grading?.mode === 'manual',
            `${p}.grading.mode`,
            t('非选择题使用 manual，交给 AI 或教师批改'),
          );
          need(
            q.grading?.wrongPenalty === undefined,
            `${p}.grading.wrongPenalty`,
            t('人工题不使用自动错选扣分'),
          );
          if (q.type === 'fill_blank') {
            need(
              Array.isArray(q.blanks) &&
                q.blanks.length >= 1 &&
                q.blanks.length <= 50,
              `${p}.blanks`,
              t('需要 1–50 个空'),
            );
            if (Array.isArray(q.blanks)) {
              unique(
                q.blanks.map((b: any) => b?.id),
                `${p}.blanks`,
              );
              q.blanks.forEach((b: any, i: number) => {
                if (!obj(b)) {
                  need(false, `${p}.blanks[${i}]`, t('需要对象'));
                  return;
                }
                id(b.id, `${p}.blanks[${i}].id`);
                need(str(b.label), `${p}.blanks[${i}].label`, t('不能为空'));
                need(
                  obj(q.answer) && str(q.answer[b.id]),
                  `${p}.answer.${b.id}`,
                  t('每空必须给出文本参考答案'),
                );
              });
            }
          } else if (q.type === 'matching') {
            checkOptions(q.items, `${p}.items`);
            checkOptions(q.matches, `${p}.matches`);
            if (Array.isArray(q.items))
              q.items.forEach((it: any) =>
                need(
                  obj(q.answer) &&
                    q.matches?.some((m: any) => m.id === q.answer[it?.id]),
                  `${p}.answer.${it?.id}`,
                  t('应指向 matches 中的 ID（允许重复匹配）'),
                ),
              );
          } else if (q.type === 'ordering') {
            checkOptions(q.items, `${p}.items`);
            need(
              Array.isArray(q.answer) &&
                q.answer.length === q.items?.length &&
                new Set(q.answer).size === q.answer.length &&
                q.answer.every((v: any) =>
                  q.items?.some((it: any) => it.id === v),
                ),
              `${p}.answer`,
              t('答案必须是 items ID 的完整排列'),
            );
          } else if (q.type === 'table') {
            for (const key of ['rows', 'columns']) {
              need(
                Array.isArray(q[key]) &&
                  q[key].length > 0 &&
                  q[key].length <= 12 &&
                  q[key].every(str),
                `${p}.${key}`,
                t('需要 1–12 个非空文本标签'),
              );
            }
            need(
              obj(q.answer),
              `${p}.answer`,
              t('需要键为 "行索引:列索引" 的对象，索引从 0 开始'),
            );
            if (Array.isArray(q.rows) && Array.isArray(q.columns))
              q.rows.forEach((_: any, r: number) =>
                q.columns.forEach((__: any, c: number) =>
                  need(
                    obj(q.answer) && str(q.answer[`${r}:${c}`]),
                    `${p}.answer.${r}:${c}`,
                    t('每个单元格必须有参考答案'),
                  ),
                ),
              );
          } else
            need(
              str(q.answer),
              `${p}.answer`,
              t('此题型参考答案应为非空 Markdown 文本'),
            );
          if (q.language !== undefined)
            need(
              typeof q.language === 'string',
              `${p}.language`,
              t('应为文本'),
            );
        }
      });
    });
  }
  unique(qids, 'questions');
  need(count <= 300, 'questions', t('一份试卷最多 300 题'));
  need(
    Math.abs(sum - e.totalPoints) < 0.001,
    'totalPoints',
    t('应等于所有题分值之和（{0}）', round(sum)),
  );
  if (errors.length)
    throw new Error(
      errors.slice(0, 40).join('\n') +
        (errors.length > 40
          ? t('\n……另有 {0} 项问题', errors.length - 40)
          : ''),
    );
  return input as Exam;
}
export function validateWorkspace(v: unknown): Workspace {
  if (!v || typeof v !== 'object') throw new Error(t('备份格式错误'));
  const w = v as Workspace;
  if (w.version !== 1 || !Array.isArray(w.exams) || !Array.isArray(w.attempts))
    throw new Error(t('仅支持 version: 1 的工作台备份'));
  w.exams.forEach(validateExam);
  if (new Set(w.exams.map((e) => e.id)).size !== w.exams.length)
    throw new Error(t('备份包含重复试卷 ID'));
  if (new Set(w.attempts.map((a) => a?.id)).size !== w.attempts.length)
    throw new Error(t('备份包含重复记录 ID'));
  w.attempts.forEach((a) => {
    validateExam(a.exam);
    const qs = questionsOf(a.exam);
    if (
      typeof a.id !== 'string' ||
      typeof a.name !== 'string' ||
      !Number.isFinite(a.startedAt) ||
      !Number.isFinite(a.deadline) ||
      a.deadline <= a.startedAt ||
      !['active', 'submitted'].includes(a.status) ||
      !Number.isInteger(a.current) ||
      a.current < 0 ||
      a.current >= qs.length ||
      !a.answers ||
      typeof a.answers !== 'object' ||
      Array.isArray(a.answers) ||
      !Array.isArray(a.flagged) ||
      !a.flagged.every((x) => qs.some((q) => q.id === x)) ||
      typeof a.focusMode !== 'boolean' ||
      !Array.isArray(a.events) ||
      !a.events.every(
        (e) =>
          Number.isFinite(e.at) &&
          ['fullscreen_exit', 'tab_hidden'].includes(e.kind),
      ) ||
      (a.status === 'submitted' && !Number.isFinite(a.submittedAt))
    )
      throw new Error(t('备份中的答题记录不完整'));
    for (const [id, value] of Object.entries(a.answers)) {
      const q = qs.find((q) => q.id === id);
      if (!q || !value || typeof value !== 'object')
        throw new Error(t('答题记录题号无效'));
      if (value.text !== undefined && typeof value.text !== 'string')
        throw new Error(t('文本答案格式错误'));
      if (
        value.selected !== undefined &&
        (!Array.isArray(value.selected) ||
          !isAuto(q) ||
          !value.selected.every((id) => q.options?.some((o) => o.id === id)))
      )
        throw new Error(t('选择题答案格式错误'));
      if (
        value.fields !== undefined &&
        (!value.fields ||
          typeof value.fields !== 'object' ||
          Array.isArray(value.fields) ||
          !Object.entries(value.fields).every(
            ([k, v]) => fieldKeys(q).includes(k) && typeof v === 'string',
          ))
      )
        throw new Error(t('结构化答案格式错误'));
      if (
        value.attachments !== undefined &&
        (!Array.isArray(value.attachments) ||
          !value.attachments.every(
            (f) =>
              typeof f.name === 'string' &&
              typeof f.type === 'string' &&
              typeof f.data === 'string' &&
              /^data:[^;]*;base64,[A-Za-z0-9+/=\r\n]+$/.test(f.data),
          ))
      )
        throw new Error(t('附件格式错误'));
    }
  });
  return w;
}
