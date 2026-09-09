import test from 'node:test';
import assert from 'node:assert/strict';
import { applyWorkspaceAction } from '../lib/workspace-actions.ts';
import { sampleExam } from '../lib/sample.ts';
import { validateWorkspace, updateAnswer, scoreAttempt } from '../lib/exam.ts';
const makeWorkspace = () => {
  const exam = structuredClone(sampleExam);
  const active = {
    id: 'active',
    exam: structuredClone(exam),
    name: 'Student',
    startedAt: 1000,
    deadline: 61000,
    status: 'active',
    current: 0,
    answers: {
      q1: { selected: ['B'] },
      q4: {
        text: 'Working',
        attachments: [
          {
            name: 'proof.txt',
            type: 'text/plain',
            data: 'data:text/plain;base64,aGVsbG8=',
          },
        ],
      },
    },
    flagged: ['q1'],
    focusMode: true,
    events: [],
  };
  return {
    version: 1,
    exams: [exam],
    attempts: [
      active,
      {
        ...structuredClone(active),
        id: 'past',
        status: 'submitted',
        submittedAt: 30000,
      },
    ],
  };
};
const reload = (w) => validateWorkspace(JSON.parse(JSON.stringify(w)));
test('deleting the last library exam preserves active and submitted snapshots across reload', () => {
  const w = makeWorkspace();
  const before = structuredClone(w);
  const next = applyWorkspaceAction(w, {
    kind: 'delete_exam',
    id: w.exams[0].id,
  });
  assert.equal(next.exams.length, 0);
  assert.deepEqual(reload(next).attempts, w.attempts);
  assert.equal(next.attempts[0].status, 'active');
  assert.deepEqual(w, before, 'Original workspace not mutated');
});
test('deleting one attempt removes its data without touching other attempts or the library', () => {
  for (const id of ['past', 'active']) {
    const w = makeWorkspace();
    const next = reload(
      applyWorkspaceAction(w, { kind: 'delete_attempt', id }),
    );
    assert.deepEqual(next.exams, w.exams);
    assert.deepEqual(
      next.attempts,
      w.attempts.filter((a) => a.id !== id),
    );
    if (id === 'active')
      assert.ok(
        !next.attempts.some((a) => a.status === 'active'),
        'A new exam is no longer blocked',
      );
  }
});
test('ending early preserves work and flags, grades current answers, and rejects later edits', () => {
  const w = makeWorkspace();
  const next = reload(
    applyWorkspaceAction(w, { kind: 'end_attempt', id: 'active' }, 10000),
  );
  const ended = next.attempts[0];
  assert.equal(ended.status, 'submitted');
  assert.equal(ended.submittedAt, 10000);
  assert.deepEqual(ended.answers, w.attempts[0].answers);
  assert.deepEqual(ended.flagged, w.attempts[0].flagged);
  assert.deepEqual(next.attempts[1], w.attempts[1]);
  assert.deepEqual(next.exams, w.exams);
  assert.deepEqual(scoreAttempt(ended), scoreAttempt(w.attempts[0]));
  assert.deepEqual(
    updateAnswer(ended, 'q1', { selected: ['A'] }, 12000),
    ended,
  );
  assert.ok(!next.attempts.some((a) => a.status === 'active'));
  assert.deepEqual(
    applyWorkspaceAction(next, { kind: 'end_attempt', id: 'active' }, 40000),
    next,
    'Repeated confirmation cannot change submission time',
  );
});
test('late end and stale confirmation do not resurrect or change removed records', () => {
  const w = makeWorkspace();
  assert.equal(
    applyWorkspaceAction(w, { kind: 'end_attempt', id: 'active' }, 90000)
      .attempts[0].submittedAt,
    61000,
  );
  for (const kind of ['delete_exam', 'delete_attempt', 'end_attempt'])
    assert.deepEqual(applyWorkspaceAction(w, { kind, id: 'missing' }), w);
  let empty = applyWorkspaceAction(w, {
    kind: 'delete_exam',
    id: w.exams[0].id,
  });
  for (const a of w.attempts)
    empty = applyWorkspaceAction(empty, { kind: 'delete_attempt', id: a.id });
  assert.deepEqual(reload(empty), { version: 1, exams: [], attempts: [] });
  assert.deepEqual(
    applyWorkspaceAction(empty, { kind: 'end_attempt', id: 'active' }),
    empty,
  );
});
