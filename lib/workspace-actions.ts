import { finishAttempt, type Workspace } from './exam.ts';

export type WorkspaceAction = {
  kind: 'delete_exam' | 'delete_attempt' | 'end_attempt';
  id: string;
};

// Attempts own an exam snapshot, so removing a library exam must not cascade.
export function applyWorkspaceAction(
  workspace: Workspace,
  action: WorkspaceAction,
  now = Date.now(),
): Workspace {
  if (action.kind === 'delete_exam') {
    return {
      ...workspace,
      exams: workspace.exams.filter((e) => e.id !== action.id),
    };
  }
  if (action.kind === 'delete_attempt') {
    return {
      ...workspace,
      attempts: workspace.attempts.filter((a) => a.id !== action.id),
    };
  }
  return {
    ...workspace,
    attempts: workspace.attempts.map((a) =>
      a.id === action.id ? finishAttempt(a, now) : a,
    ),
  };
}
