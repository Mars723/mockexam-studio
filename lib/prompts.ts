import type { Locale } from './i18n.ts';
export type PromptOptions = {
  count: number;
  minutes: number;
  examLanguage: string;
  scope: string;
};
export function examPrompt(locale: Locale, o: PromptOptions) {
  const written = Math.floor(o.count / 6),
    choice = o.count - 2 * written;
  return locale === 'en'
    ? `You are a rigorous instructor writing a self-contained mock exam. I have uploaded course files containing lectures, assignments, problem sets, quizzes, and review materials. Read EVERY file carefully before writing any questions.

1. Coverage and planning
Build an internal inventory of every assessable knowledge point: definitions, notation, assumptions, theorems, algorithms, concepts, examples, applications, edge cases, and frequent misconceptions. Deduplicate overlap without dropping unique content. Plan coverage so each knowledge point is assessed substantively; merely mentioning a topic does not count. Include both understanding and transfer to new situations. Do not blindly copy the original exercises.
${o.scope.trim() ? `Additional scope and priorities: ${o.scope.trim()}\n` : ''}
2. Exam shape
Target ${o.count} separately scored questions: ${choice} choice questions, ${written} fill-in-the-blank questions, and ${written} written-response questions. Count subquestions individually. This enforces at least a 4:1:1 choice-to-blank-to-written balance: choices are at least four times each other category, and blanks and written questions remain present. Choice questions may be single-choice or multiple-choice; written responses may include calculations, proofs, code or essays as appropriate.
Duration: ${o.minutes} minutes. Write the exam content in ${o.examLanguage}. Choose realistic point values, time per question, and paper answer space. If this length or duration cannot thoroughly assess all knowledge points, first identify the conflict and propose a longer exam or multiple exams. Do not silently omit topics or claim complete coverage. Do not exceed the file specification's limits.

3. Self-contained question writing
Never mention an uploaded document's title, a file name, a problem-set number, an original exercise number, a quiz number, or a phrase such as “the lecture example” in student-facing content. Do not assume I remember any original problem's context or definitions. Reconstruct every necessary setup directly in the question or its linked shared material: define nonstandard terms and symbols; state domains, indexing conventions, assumptions, inputs, units and constraints; include any required data, code, diagram or passage.
A student who understands the course concepts must be able to answer using only the exam. Avoid ambiguous wording, missing premises, unsupported facts and accidental dependence on another answer. Keep the question internally consistent and mathematically correct.

4. No solution hints
Give sufficient context, but do not name the technique to use unless choosing a technique is not part of what is being assessed. Do not supply solution steps, intermediate results, revealing labels, guiding examples, clues in option length, or subtle hints identifying the correct option. Do not put solutions or grading details that reveal answers into prompts, options, blank labels, materials or instructions. Put reference answers, explanations and detailed scoring criteria ONLY in answer, explanation and rubric.

5. Answers and marking
Solve and independently check every question before finalizing it. Single-choice questions have exactly one defensible answer; multiple-choice keys must include all correct options. Supply complete reference answers for every blank and written response. Set each question's points and a non-overlapping, operational rubric in advance. Explain accepted alternatives, partial credit, units, tolerances and precision where relevant. Rubric totals must equal the question points, and all question points must sum to totalPoints. Automatic grading, question instructions and rubrics must agree.

6. Output contract
Follow the complete MockExam specification appended below. Use valid JSON escaping for LaTeX. Ensure math in subquestion labels and table headings is delimited correctly, and programming code is in fenced code blocks. Flatten separately scored subquestions and use shared materials where needed.
Before output, silently check coverage, context completeness, absence of hints, solutions, scoring arithmetic, JSON syntax and schema references. If clarification is unnecessary, return ONLY the complete importable JSON object — no Markdown fences, commentary, answers outside the file, or placeholders.
`
    : `你是一名严谨的课程教师，请为我编写一份题目自洽、背景完整的模拟考试。我已上传包含上课内容、作业、problem set、quiz 和复习资料的文件。请先仔细阅读每一个文件，再开始出题。

一、完整覆盖知识点
先在内部建立可考察知识点清单，涵盖定义、符号、前提、定理、算法、概念、应用、边界情况及常见误区。合并重复内容，但不能漏掉独有知识点。为每个知识点安排实质性考察，仅在题干中提及不算覆盖。兼顾理解与迁移应用，不要简单照抄原作业。
${o.scope.trim() ? `额外范围与重点：${o.scope.trim()}\n` : ''}
二、试卷结构
目标 ${o.count} 道独立计分的小题：选择题 ${choice} 道、填空题 ${written} 道、解答题 ${written} 道。子题按独立题计算。选择题、填空题和解答题至少按 4:1:1 配置，即选择题数量至少为填空题的四倍、也至少为解答题的四倍，同时保留后两类题。选择题可含单选和多选；解答题可按学科采用计算、证明、编程或论述等。
考试时长 ${o.minutes} 分钟。试卷内容语言：${o.examLanguage}。合理设置分值、每题预计时间和纸质作答留白。如果题量或时间不足以仔细、完整考察全部知识点，请先指出矛盾，提出延长考试或分成多份试卷的建议；不要偷偷省略知识点，也不要虚称完整覆盖。不得超出规范限制。

三、题目必须自洽、背景完整
不要在考生可见的题干、材料、选项、标签或说明中提及上传文件的 title、文件名、problem set 编号、原作业题号、quiz 编号或“课堂里那个例子”。不要默认我记得原资料中任何问题的背景或定义。
应在题目本身或明确关联的共享材料中完整重建必要背景：定义非通用术语和符号，交代定义域、索引从何开始、假设、输入、单位、约束，并提供所需数据、代码、图或文章。学生掌握课程知识后，只凭这份试卷就应能理解和回答题目。避免缺失前提、歧义、事实错误，以及不必要地依赖前一题答案。

四、完整描述，但不得提示答案
必要背景不等于解题提示。不要点名待选择的解题方法（除非方法选择不属于考察目标），不要提供推导步骤、中间结果、揭示答案的空格标签、引导性例子、明显的选项长度线索或暗示正确选项的措辞。
不要在题干、选项、填空标签、共享材料或考试说明中写入参考答案、解释或会泄题的评分点。这些内容只能写在 answer、explanation 和 rubric 中。

五、提前设计答案与评分规则
先求解并独立核对每一题。单选只有一个合理正确答案，多选答案集合完整。每个填空和解答题都给出完整参考答案。提前设置每题分值及可执行、不重复计分的 rubric；按需说明等价答案、步骤分、单位、误差与精度要求。rubric 各项分值之和等于该题 points，所有题目的 points 之和等于 totalPoints。自动评分规则必须与题干、rubric 一致。

六、输出要求
严格遵守下面附加的完整 MockExam 规范，正确处理 JSON 中 LaTeX 反斜线转义；小题标签和表头里的公式也必须正确使用数学定界符。编程代码使用代码围栏。独立计分的小问拆成独立 Question，共用背景放入 materials。
输出前在内部核对：知识点覆盖、背景完整、没有提示、答案正确、分值计算、JSON 语法与引用关系。无须澄清时，只输出一份完整、可导入的 JSON 对象，不要 Markdown 围栏、前后解释、文件外答案或占位内容。
`;
}
