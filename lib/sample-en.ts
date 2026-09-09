import { sampleExam } from './sample.ts';
import type { Exam, Question } from './exam.ts';
const e: Exam = structuredClone(sampleExam);
e.title = 'Learning Skills Mock Exam';
e.subject = 'General practice';
e.description = 'Mathematics · Reading comprehension · Reasoning';
e.instructions =
  'This exam contains 8 questions. You may navigate freely and flag questions for review. Choice questions are graded automatically; export the other answers for review by an AI or teacher. No question deducts points.';
e.materials = [
  {
    id: 'reading_1',
    title: 'Reading · Learning and memory',
    content:
      'When studying, people often mistake familiarity for mastery. Repeated reading makes material feel more familiar, but it may still be difficult to retrieve after the book is closed.\n\nActive recall asks learners to reconstruct information without looking at their notes. Even when recall is difficult, the process helps reveal gaps in understanding. Spreading review sessions across several days also tends to support long-term retention more effectively than repeating everything in one evening.\n\nEffective learning is not only about spending more time. It also depends on how that time is used.',
  },
];
e.sections[0].title = 'Part 1 · Mathematics and reasoning';
e.sections[0].instructions =
  'Read carefully. Show your working for calculation questions.';
e.sections[1].title = 'Part 2 · Reading and writing';
e.sections[1].instructions =
  'Questions 5–8 refer to the shared reading passage.';
const qs = e.sections.flatMap((s) => s.questions);
function set(i: number, patch: Partial<Question>) {
  Object.assign(qs[i], patch);
}
set(0, {
  prompt: 'If $3x + 7 = 22$, what is the value of $x$?',
  rubric: [
    {
      criterion: 'Select B for 4 points; any other or blank answer scores 0.',
      points: 4,
    },
  ],
  explanation: 'Subtract 7 to get $3x=15$, then divide by 3 to get $x=5$.',
});
set(1, {
  prompt:
    'Which of the following are prime numbers? Select all that apply. If no incorrect option is selected, credit is proportional to the correct options selected.',
  rubric: [
    { criterion: 'Select A, with no incorrect selections.', points: 3 },
    {
      criterion:
        'Select C, with no incorrect selections. Any incorrect selection makes the entire question score 0.',
      points: 3,
    },
  ],
});
set(2, {
  prompt:
    'For the arithmetic sequence $2,5,8,11,\\ldots$, find the common difference and the 10th term.',
  blanks: [
    { id: 'difference', label: 'Common difference $d$' },
    { id: 'tenth', label: 'The 10th term $a_{10}$' },
  ],
  rubric: [
    { criterion: 'Common difference is 3.', points: 2 },
    { criterion: 'The 10th term is 2 + 9 × 3 = 29.', points: 2 },
  ],
});
set(3, {
  prompt:
    'A rectangle has perimeter $30\\text{ cm}$. Its length is $3\\text{ cm}$ greater than its width. Find its area and show your working.',
  answer:
    'Let the width be $x$ cm and the length $x+3$ cm. Then $2(x+x+3)=30$, so $x=6$. The length is 9 cm, and the area is $6\\times9=54\\text{ cm}^2$.',
  rubric: [
    {
      criterion: 'Define an unknown and form a correct perimeter equation.',
      points: 2,
    },
    { criterion: 'Find width 6 cm and length 9 cm.', points: 2 },
    { criterion: 'Obtain 54 cm² with the correct unit.', points: 2 },
  ],
});
set(4, {
  prompt:
    'According to the passage, which activity best helps reveal gaps in understanding?',
  options: [
    { id: 'A', text: 'Reading the textbook five times' },
    { id: 'B', text: 'Recalling key concepts without looking at notes' },
    { id: 'C', text: 'Highlighting the entire text' },
    { id: 'D', text: 'Only increasing the number of hours spent studying' },
  ],
  rubric: [{ criterion: 'Select B for 4 points.', points: 4 }],
});
set(5, {
  prompt:
    'According to the passage, feeling familiar with material is sufficient evidence of mastery.',
  options: [
    { id: 'T', text: 'True' },
    { id: 'F', text: 'False' },
  ],
  rubric: [{ criterion: 'Select False (F) for 2 points.', points: 2 }],
});
set(6, {
  prompt:
    'In your own words, explain the difference between familiarity and mastery using the passage.',
  answer:
    'Familiarity means recognizing information when it is presented again. Mastery involves retrieving, reconstructing, or applying it without referring to the source. Active recall tests mastery and reveals gaps.',
  rubric: [
    {
      criterion:
        'Explain familiarity as recognition or the feeling of knowing while rereading.',
      points: 2,
    },
    {
      criterion: 'Explain mastery as independent retrieval or application.',
      points: 2,
    },
    {
      criterion:
        'Connect active recall to checking learning and finding gaps, with clear expression.',
      points: 2,
    },
  ],
});
set(7, {
  prompt:
    'Create a brief revision plan for an exam one week away. Include active recall, spaced review, and error correction. Explain the reasons for your choices. Aim for 150–250 words.',
  answer:
    'Example: On day 1, outline the topics, then close the notes and recall key ideas to identify weaknesses. Use short recall sessions on days 2, 4, and 6. After each session, check the notes, correct omissions, and record why mistakes occurred. Retry missed problems the next day. On day 7, complete a timed mock exam and review recurring errors. Spacing supports retention, recall checks retrieval, and error analysis directs effort to weaker areas. Equivalent sound plans are acceptable.',
  rubric: [
    {
      criterion: 'Include active recall and describe how to do it.',
      points: 2,
    },
    { criterion: 'Space at least three review sessions sensibly.', points: 2 },
    { criterion: 'Include error analysis and later retesting.', points: 2 },
    {
      criterion: 'Offer a practical plan with reasons grounded in the passage.',
      points: 2,
    },
  ],
});
export const sampleExamEnglish = e;
