import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {indentMore,indentLess,insertNewlineAndIndent,indentWithTab} from '@codemirror/commands';
import {indentUnit} from '@codemirror/language';
import {closeBrackets,insertBracket} from '@codemirror/autocomplete';
import {python} from '@codemirror/lang-python';
import {javascript} from '@codemirror/lang-javascript';
import {normalizeMath} from '../lib/math.ts';
function target(doc,language=python(),anchor=doc.length){const t={state:EditorState.create({doc,selection:{anchor},extensions:[language,indentUnit.of('    '),closeBrackets()]}),dispatch(tr){t.state=tr.state;}};return t;}
test('Tab and Shift+Tab bind indentation commands',()=>{assert.equal(indentWithTab.key,'Tab');assert.equal(indentWithTab.run,indentMore);assert.equal(indentWithTab.shift,indentLess);const t=target('x = 1');indentMore(t);assert.equal(t.state.doc.toString(),'    x = 1');indentLess(t);assert.equal(t.state.doc.toString(),'x = 1');});
test('Python block newline automatically indents four spaces',()=>{const t=target('if True:');insertNewlineAndIndent(t);assert.equal(t.state.doc.toString(),'if True:\n    ');});
test('JavaScript brackets insert a pair and newline lays out both sides',()=>{const t=target('',javascript());const tr=insertBracket(t.state,'{');assert.ok(tr);t.dispatch(tr);assert.equal(t.state.doc.toString(),'{}');assert.equal(t.state.selection.main.head,1);insertNewlineAndIndent(t);assert.equal(t.state.doc.toString(),'{\n    \n}');});
test('Common LaTeX delimiters normalize without rewriting code snippets',()=>{const s=normalizeMath('\\(x^2\\)\n\\[x+1\\]\n`$$code$$`\n```python\nprice = "$$"\n```');assert.match(s,/\$x\^2\$/);assert.match(s,/\$\$\nx\+1\n\$\$/);assert.ok(s.includes('`$$code$$`'));assert.ok(s.includes('price = "$$"'));});
