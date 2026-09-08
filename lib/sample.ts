import type { Exam } from './exam';
export const sampleExam: Exam = {
  schemaVersion: '1.0',
  id: 'demo_learning_v1',
  title: '学习能力综合模拟考试',
  subject: '综合练习',
  description: '数学 · 阅读理解 · 逻辑思维',
  durationMinutes: 30,
  totalPoints: 40,
  instructions:
    '本卷包含 8 道题。考试期间可以自由切换题目，并标记稍后检查。选择题自动批改，其余题目请导出批改包交给 AI 或老师。所有题目均不倒扣分。',
  materials: [
    {
      id: 'reading_1',
      title: '阅读材料 · 学习与记忆',
      content:
        '研究学习方法时，人们常常把“熟悉”误认为“掌握”。反复阅读会让材料看起来越来越熟悉，但合上书本，知识未必能够被提取。\n\n主动回忆要求学习者在不看资料的情况下重构信息。即使回忆过程存在困难，这种练习也有助于发现知识缺口。把多次复习分散在不同日期，通常也比在一个晚上集中重复更有利于长期保持。\n\n有效的学习并不只是增加投入的时间，更需要关注投入的方式。',
    },
  ],
  sections: [
    {
      id: 'reasoning',
      title: '第一部分 · 数学与逻辑',
      instructions: '仔细审题，计算题请写出推导过程。',
      questions: [
        {
          id: 'q1',
          type: 'single_choice',
          prompt: '若 $3x + 7 = 22$，则 $x$ 的值是多少？',
          points: 4,
          options: [
            { id: 'A', text: '$3$' },
            { id: 'B', text: '$5$' },
            { id: 'C', text: '$7$' },
            { id: 'D', text: '$9$' },
          ],
          answer: ['B'],
          rubric: [
            {
              criterion: '选择 B，得 4 分；其他答案或未答得 0 分。',
              points: 4,
            },
          ],
          explanation: '移项得 $3x=15$，两边除以 3，得到 $x=5$。',
          spaceLines: 3,
          grading: { mode: 'exact' },
        },
        {
          id: 'q2',
          type: 'multiple_choice',
          prompt:
            '下列哪些数是质数？（多选；没有错选时，按选对的数量比例给分。）',
          points: 6,
          options: [
            { id: 'A', text: '2' },
            { id: 'B', text: '9' },
            { id: 'C', text: '13' },
            { id: 'D', text: '21' },
          ],
          answer: ['A', 'C'],
          rubric: [
            { criterion: '选 A 且没有错选，得 3 分。', points: 3 },
            {
              criterion: '选 C 且没有错选，得 3 分。出现任何错选，本题 0 分。',
              points: 3,
            },
          ],
          spaceLines: 3,
          grading: { mode: 'partial' },
        },
        {
          id: 'q3',
          type: 'fill_blank',
          prompt:
            '等差数列 $2, 5, 8, 11, \\ldots$ 的公差为多少？第 10 项是多少？',
          points: 4,
          blanks: [
            { id: 'difference', label: '公差' },
            { id: 'tenth', label: '第 10 项' },
          ],
          answer: { difference: '3', tenth: '29' },
          rubric: [
            { criterion: '公差为 3。', points: 2 },
            { criterion: '第 10 项为 2 + 9 × 3 = 29。', points: 2 },
          ],
          spaceLines: 4,
          grading: { mode: 'manual' },
        },
        {
          id: 'q4',
          type: 'calculation',
          prompt:
            '一个长方形的周长为 $30\\text{ cm}$，长比宽多 $3\\text{ cm}$。求这个长方形的面积，并写出计算过程。',
          points: 6,
          answer:
            '设宽为 $x$ cm，长为 $x+3$ cm。由 $2(x+x+3)=30$，得 $x=6$。长为 9 cm，面积为 $6\\times9=54\\text{ cm}^2$。',
          rubric: [
            { criterion: '正确设未知数并建立周长方程。', points: 2 },
            { criterion: '求出宽 6 cm、长 9 cm。', points: 2 },
            { criterion: '正确求得面积 54 cm²，并写明单位。', points: 2 },
          ],
          spaceLines: 12,
          grading: { mode: 'manual' },
        },
      ],
    },
    {
      id: 'reading',
      title: '第二部分 · 阅读与表达',
      instructions: '第 5–8 题共用阅读材料。',
      questions: [
        {
          id: 'q5',
          type: 'single_choice',
          materialId: 'reading_1',
          prompt: '根据材料，哪一种学习安排最有利于发现知识缺口？',
          points: 4,
          options: [
            { id: 'A', text: '把课本反复读五遍' },
            { id: 'B', text: '不看资料，尝试复述核心概念' },
            { id: 'C', text: '用荧光笔标出全部内容' },
            { id: 'D', text: '只增加每天的学习时长' },
          ],
          answer: ['B'],
          rubric: [{ criterion: '选择 B，得 4 分。', points: 4 }],
          spaceLines: 3,
          grading: { mode: 'exact' },
        },
        {
          id: 'q6',
          type: 'true_false',
          materialId: 'reading_1',
          prompt: '根据材料，只要对内容感到熟悉，就说明已经掌握了它。',
          points: 2,
          options: [
            { id: 'T', text: '正确' },
            { id: 'F', text: '错误' },
          ],
          answer: ['F'],
          rubric: [{ criterion: '选择错误（F），得 2 分。', points: 2 }],
          spaceLines: 2,
          grading: { mode: 'exact' },
        },
        {
          id: 'q7',
          type: 'short_answer',
          materialId: 'reading_1',
          prompt: '结合材料，解释“熟悉”和“掌握”的区别。请用自己的话回答。',
          points: 6,
          answer:
            '熟悉是再次看到内容时能够辨认，掌握则意味着脱离资料也可以提取、重构和使用知识。主动回忆可以检验是否真正掌握，并发现知识缺口。',
          rubric: [
            { criterion: '说明熟悉主要指再认或阅读时的熟悉感。', points: 2 },
            { criterion: '说明掌握需要脱离资料提取或运用知识。', points: 2 },
            {
              criterion: '联系主动回忆及其检验学习效果的作用，表达清楚。',
              points: 2,
            },
          ],
          spaceLines: 9,
          grading: { mode: 'manual' },
        },
        {
          id: 'q8',
          type: 'essay',
          materialId: 'reading_1',
          prompt:
            '为一次一周后的考试制定简短的复习计划。计划应包含主动回忆、间隔复习和错题处理，并解释安排的理由。建议 150–250 字。',
          points: 8,
          answer:
            '示例：第 1 天梳理知识框架，然后合上书本默写关键概念，定位薄弱点。第 2、4、6 天安排短时主动回忆，逐步增加间隔。每次回忆后查阅资料，修正遗漏并记录错题原因；隔天重做错题。第 7 天进行一次计时模拟，针对易错环节查漏补缺。分散复习有利于长期保持，主动回忆可以检验提取能力，错题分析能帮助调整复习重点。合理的等效计划也可得分。',
          rubric: [
            { criterion: '安排主动回忆，并说明如何实施。', points: 2 },
            { criterion: '合理分散至少三次复习，体现间隔。', points: 2 },
            { criterion: '包含错题分析和后续重测。', points: 2 },
            { criterion: '计划可执行，并以材料观点解释安排理由。', points: 2 },
          ],
          spaceLines: 20,
          grading: { mode: 'manual' },
        },
      ],
    },
  ],
};
