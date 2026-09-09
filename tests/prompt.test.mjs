import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
  plugins: [react()],
  resolve: { alias: { '@': process.cwd() } },
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const data = new Map();
let failStorage = false,
  copied = '',
  allowReplace = false;
globalThis.localStorage = {
  getItem: (k) => data.get(k) ?? null,
  setItem: (k, v) => {
    if (failStorage) throw Error('Quota exceeded');
    data.set(k, v);
  },
};
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    userAgent: 'node',
    platform: '',
    clipboard: {
      writeText: async (text) => {
        copied = text;
      },
    },
  },
});
// No browser DOM is used; exercise the actual component's event handlers and effects.

try {
  const { ExamPrompt } = await server.ssrLoadModule(
    '/components/exam-prompt.tsx',
  );
  const { setLocale } = await server.ssrLoadModule('/lib/i18n.ts');
  globalThis.window = { confirm: () => allowReplace };
  let root;
  const mount = async () => {
    await act(() => {
      root = TestRenderer.create(React.createElement(ExamPrompt));
    });
  };
  const editor = () => root.root.findByProps({ className: 'prompt-editor' });
  const button = (text) =>
    root.root.findAllByType('button').find((b) => b.children.includes(text));
  await mount();
  assert.equal(editor().props.readOnly, undefined);
  assert.match(editor().props.value, /provide separately/);
  assert.ok(!editor().props.value.includes('spaceLines'));
  const custom =
    'My custom prompt\nKeep $x^2$, {brackets}, 中文 and exact whitespace.  ';
  await act(() => editor().props.onChange({ target: { value: custom } }));
  await act(async () => {
    button('Copy prompt').props.onClick();
    await Promise.resolve();
  });
  assert.equal(copied, custom, 'Copy includes only the exact edited prompt');
  const count = root.root
    .findAllByType('input')
    .find((i) => i.props.type === 'number');
  await act(() => count.props.onChange({ target: { value: '48' } }));
  assert.equal(
    editor().props.value,
    custom,
    'Settings cannot overwrite manual edits',
  );
  await act(() => button('Generate from settings').props.onClick());
  assert.equal(editor().props.value, custom, 'Cancel preserves manual edits');
  await act(() => root.unmount());
  await mount();
  assert.equal(editor().props.value, custom, 'Draft survives remount/reload');
  assert.equal(root.root.findAllByType('input')[0].props.value, 48);
  await act(() => setLocale('zh'));
  assert.notEqual(editor().props.value, custom);
  await act(() => editor().props.onChange({ target: { value: '中文草稿' } }));
  await act(() => setLocale('en'));
  assert.equal(
    editor().props.value,
    custom,
    'Language drafts remain independent',
  );
  failStorage = true;
  await act(() =>
    editor().props.onChange({ target: { value: 'Unsaved edit' } }),
  );
  assert.equal(editor().props.value, 'Unsaved edit');
  assert.ok(JSON.stringify(root.toJSON()).includes('Could not save locally'));
  failStorage = false;
  await act(() => button('Save').props.onClick());
  await act(() => root.unmount());
  await mount();
  assert.equal(
    editor().props.value,
    'Unsaved edit',
    'Explicit save retries failed autosave',
  );
  allowReplace = true;
  await act(() => button('Generate from settings').props.onClick());
  assert.match(editor().props.value, /Target 48 separately scored/);
  await act(() => editor().props.onChange({ target: { value: '' } }));
  await act(() => root.unmount());
  await mount();
  assert.equal(
    editor().props.value,
    '',
    'An intentionally empty draft is preserved',
  );
  await act(() => root.unmount());
  console.log(
    'Prompt checks passed: separate copy, edits and options persist, language isolation, protected regeneration, save failure and retry, empty drafts.',
  );
} finally {
  await server.close();
}
