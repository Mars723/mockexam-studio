'use client';
import { t } from '@/lib/i18n';
import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { indentUnit } from '@codemirror/language';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { sql } from '@codemirror/lang-sql';
const languageOf = (l: string) =>
  ({
    python: python(),
    javascript: javascript(),
    typescript: javascript({ typescript: true }),
    cpp: cpp(),
    java: java(),
    sql: sql(),
  })[l] || [];
export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
}: {
  value: string;
  onChange: (v: string) => void;
  language: string;
  readOnly?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null),
    callback = useRef(onChange),
    lang = useRef(new Compartment()),
    editable = useRef(new Compartment());
  callback.current = onChange;
  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          keymap.of([indentWithTab]),
          indentUnit.of('    '),
          EditorState.tabSize.of(4),
          lang.current.of(languageOf(language)),
          editable.current.of(EditorState.readOnly.of(readOnly)),
          EditorView.contentAttributes.of({
            'aria-label': t('代码答案编辑器'),
            'aria-describedby': 'code-help',
          }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) callback.current(u.state.doc.toString());
          }),
          EditorView.theme({
            '&': {
              fontSize: '14px',
              backgroundColor: '#fcfdfc',
              borderRadius: '8px',
            },
            '.cm-content': {
              fontFamily: 'var(--font-geist-mono), monospace',
              minHeight: '290px',
              padding: '16px 0',
            },
            '.cm-scroller': { overflow: 'auto', maxHeight: '65vh' },
            '.cm-gutters': {
              backgroundColor: '#f2f5f3',
              color: '#92a397',
              border: 'none',
            },
            '.cm-activeLine': { backgroundColor: '#edf4ef' },
            '.cm-activeLineGutter': { backgroundColor: '#e1ece5' },
            '&.cm-focused': { outline: '2px solid #4a9873' },
            '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
              backgroundColor: '#cde5d6',
            },
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, []);
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value)
      v.dispatch({
        changes: { from: 0, to: v.state.doc.length, insert: value },
      });
  }, [value]);
  useEffect(() => {
    view.current?.dispatch({
      effects: lang.current.reconfigure(languageOf(language)),
    });
  }, [language]);
  useEffect(() => {
    view.current?.dispatch({
      effects: editable.current.reconfigure(EditorState.readOnly.of(readOnly)),
    });
  }, [readOnly]);
  return <div className="code-editor" ref={host} />;
}
