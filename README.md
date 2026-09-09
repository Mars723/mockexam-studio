# MockExam Studio

中文个人模拟考试工作台。技术栈：React 19 / Vinext、KaTeX、CodeMirror 6、IndexedDB。

## 功能
- 本地 JSON 试卷导入与逐字段验证；14 种题型、共享材料、Markdown / LaTeX。
- 逐题计时考试、题目标记和导航、截止自动提交、可选全屏及切屏记录。
- IndexedDB 自动保存、备份下载/合并恢复、多标签写入互斥。
- 我的试卷可单独删除，保留已有记录和进行中的考试；答题记录可逐条删除（含答案/附件/Flag）。所有删除均需确认。
- 考试页、进行中提示和答题记录均可“结束考试”：提前交卷、停止本次计时并保留作答。原“保存并返回”仍继续计时。
- 选择/多选/判断按 exact / partial 规则自动批改；人工题保留待批状态。
- 代码编辑支持 Tab / Shift+Tab、4 空格缩进、换行自动缩进、括号配对、行号、语法高亮和撤销重做。支持 Python、JavaScript、TypeScript、C/C++、Java、SQL；纯文本作为其他语言后备。编程题默认开启；其他文字解答题可切换。
- 打印 ZIP 含 A4 留白学生卷、教师评分卷、原始试卷及离线数学字体；用浏览器打印/另存 PDF。
- AI 批改 ZIP 保留原题、学生回答、参考答案、所有评分细则与附件。

## 使用
启动后使用内置 8 题示例，或进入「AI 出题规范」，复制完整规范和示例交给 AI 生成试卷。规范事实源：`lib/rules.ts`；验证器：`lib/exam.ts`。

```sh
npm install
npm run dev
npm run build
```

## 验证
```sh
node --experimental-strip-types --test tests/exam.test.mjs tests/editor.test.mjs tests/workspace-actions.test.mjs
node tests/export.test.mjs
npx tsc --noEmit
npm run build
```

验证范围包括分数总和、题型数据、评分细则、答案引用、精确/部分评分与扣分、截止时间边界、提交后不可编辑、备份及附件格式、LaTeX 和安全 Markdown、打印留白/隐藏答案、导出评分数据、编辑器缩进及括号行为。

未进行浏览器交互/截图测试（当前请求未要求）。WebMCP 为渐进增强，提供 `get_exam_library` 与 `stage_exam_import`；没有可用的受支持 WebMCP 验证上下文，因此未验证其实际注册与执行；不影响普通浏览器功能。

## 使用边界
这是本机自测工具，不含账户同步。答题和附件存储在当前浏览器的 IndexedDB；清理站点数据或更换设备前应下载备份。恢复备份时有相同 ID 但不同内容会拒绝覆盖。

全屏可主动退出，无法锁定操作系统；此工具不提供监考防作弊和答案保密。编程答案不执行；口语/作图等需在外部完成后上传。选择题以外由用户自行导出给 AI/教师批改。

纸质包中的 `exam.json` 和 `marking-guide.html` 含答案，不应给学生。学生卷只保留分值和一般计分规则，完整细则在教师卷。

## 双语与交互修复

默认英文，右上角切换简体中文，偏好保存在当前浏览器。已有试卷、历史作答和答案内容不做翻译或迁移。内置示例和完整规范有中英文版本。新增 Exam prompt 页面可设置题量、时间、试卷语言和重点，Prompt 正文可直接编辑、复制和下载，与 AI 出题规范分开。草稿和设置按界面语言独立自动保存在当前浏览器；重新生成需确认替换，调整设置不会覆盖手动编辑。保存失败时会提示，并可点击保存重试。

所有填空标签、选项、匹配项目和表格标题经过统一数学渲染；打印文件同样支持。底栏固定三列布局，保存状态显示延迟消除短暂跳动；题号导航单独 memo，输入不改变完成数量时不重新渲染。

新增验证：`node tests/localization.test.mjs`、`node tests/prompt.test.mjs`（Prompt 编辑、独立复制、本地保存恢复、中英文草稿隔离、覆盖确认、保存失败重试）。使用无浏览器 React renderer 验证连续无关更新不重渲染题号，检查标签公式、英文默认、语言切换、打印语言和 Prompt 比例与约束。
