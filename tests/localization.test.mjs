import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom',plugins:[react()],resolve:{alias:{'@':process.cwd()}}});
try{
const {setLocale,t,getLocale}=await server.ssrLoadModule('/lib/i18n.ts');
const {sampleExamEnglish}=await server.ssrLoadModule('/lib/sample-en.ts');
const {validateExam,scoringText}=await server.ssrLoadModule('/lib/exam.ts');
const {AnswerInput}=await server.ssrLoadModule('/components/answer-input.tsx');
const {QuestionPosition}=await server.ssrLoadModule('/components/question-position.tsx');
const {examPrompt}=await server.ssrLoadModule('/lib/prompts.ts');
const {englishRules}=await server.ssrLoadModule('/lib/rules-en.ts');
const {paperHTML}=await server.ssrLoadModule('/lib/export.tsx');
assert.equal(getLocale(),'en');assert.equal(t('考试工作台'),'Exam workspace');assert.equal(t('第 {0} / {1} 题',11,36),'Question 11 / 36');validateExam(sampleExamEnglish);assert.ok(!/[\u3400-\u9fff]/.test(JSON.stringify(sampleExamEnglish)),'English sample has no untranslated content');
const q=structuredClone(sampleExamEnglish.sections[0].questions[2]);q.blanks=[{id:'c',label:'$c$'},{id:'n',label:'Equation after $k$ splits; $n_0$'}];
const input=renderToStaticMarkup(React.createElement(AnswerInput,{q,value:{},onChange:()=>{},onError:()=>{}}));
assert.equal((input.match(/class="katex"/g)||[]).length,3,'Every formula in blank labels is rendered');assert.ok(!input.includes('$c$'));assert.ok(input.includes('Enter your answer'));
const paper=paperHTML({...sampleExamEnglish,sections:[{id:'s',title:'Test',questions:[q]}]});assert.ok(paper.includes('katex'));assert.ok(!paper.includes('$c$'));assert.ok(paper.includes('lang="en"'));assert.ok(paper.includes('Print / Save as PDF'));
assert.match(scoringText(sampleExamEnglish.sections[0].questions[0]),/Full credit/);
for(const count of [6,7,36,41,300]){const w=Math.floor(count/6),c=count-w*2;assert.ok(c>=4*w&&w>=1);const p=examPrompt('en',{count,minutes:90,scope:'Focus on algorithm edge cases',examLanguage:'English'});assert.ok(p.includes(`${c} choice questions`));assert.ok(p.includes('problem-set number'));assert.ok(p.includes('Do not supply solution steps'));assert.ok(p.includes('Focus on algorithm edge cases'));}
assert.match(englishRules,/self-contained/);assert.match(englishRules,/spaceLines/);
setLocale('zh');assert.equal(t('考试工作台'),'考试工作台');assert.match(scoringText(q),/人工/);setLocale('en');
// A renderer-only regression check: the navigator must not rerender when an answer changes without changing completion count.
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {default:TestRenderer,act}=await import('react-test-renderer');
let renders=0;const realPosition=QuestionPosition.type;QuestionPosition.type=(props)=>{renders++;return realPosition(props);};const onOpen=()=>{};const tree=()=>React.createElement(QuestionPosition,{current:11,total:36,answered:8,onOpen});
let root;await act(()=>{root=TestRenderer.create(tree());});const button=root.root.findByType('button');const firstText=JSON.stringify(root.toJSON());const initialRenders=renders;
// Repeated sibling saves / typing pass identical navigator props; React.memo bails out.
const memoType=QuestionPosition;assert.equal(memoType.$$typeof,Symbol.for('react.memo'));
for(let i=0;i<10;i++)await act(()=>root.update(tree()));assert.equal(JSON.stringify(root.toJSON()),firstText);assert.equal(root.root.findByType('button'),button);assert.equal(renders,initialRenders,'No navigator renders during unrelated saves or typing');
await act(()=>root.update(React.createElement(QuestionPosition,{current:11,total:36,answered:9,onOpen})));assert.ok(JSON.stringify(root.toJSON()).includes('9 answered'));
await act(()=>setLocale('zh'));assert.ok(JSON.stringify(root.toJSON()).includes('已答'));await act(()=>root.unmount());QuestionPosition.type=realPosition;setLocale('en');
console.log('Localization/regression checks passed: English default, Chinese switching, translated seed, math in blank labels and print exports, prompt ratios and safeguards, stable navigator updates.');
}finally{await server.close();}
