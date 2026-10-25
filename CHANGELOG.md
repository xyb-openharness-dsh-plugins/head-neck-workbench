## 0.1.6 — 2026-10-25

用户手工验收反馈（m09018）的两条，都是「看起来有、其实没有」：

1. **指标卡翻转后是文字表格，不是趋势** —— 背面原来列「最近 4 次记录」，
   患者翻过去看不到线。现在背面是该指标自己的**完整趋势曲线**
   （全期数据、按本指标 min/max 归一化、末点标值、首末日期、单点只画点不连线），
   卡片高度仍是固定 276px，`preserve-3d` 不变，翻转不撑开页面。
2. **一图秀没有读数** —— 只有图和图例，患者不知道该看什么。现在图下多一个
   「这组数据的读数」：逐条给最近一次原始值与单位、与上一次的差、窗口内点数，
   并对三件事给出文字提示——只有 1 个点看不出趋势、这次变动是否超出该指标自身波动、
   最近两次是否换了检测来源（换了就不能当身体变化读）。**明确写「不是医学判断」**，
   不解读病情、不提示处置；想单独看某个指标的全历史，指向「指标卡片」背面的完整曲线。

原型自检 25 → **31 条**（新增 6 条锁这两件事，含「背面不再是表格」与「单点不连线」反向对照）。

# 变更记录

只增不删；每条写清"改了什么 + 为什么 + 用户可见结果"。版本号与 VERSION、package.json 三处必须一致。

## 0.1.5 — 2026-10-25

把「装进去能不能激活」从**推测**变成**实测**（这是 0.1.0–0.1.2 让 Desktop 起不来的那道坎）。

- 新增 `scripts/smoke-activate.mjs`（`npm run smoke:activate`，已接进 `npm run check`）：
  在 Node 里用桩件喂 `window.__ModuleLoader__` 与 `ctx`，让 `lib/client.js` 的
  `factory(require)` → `apply()` 真的跑一遍，`register()` 按**宿主原文的 7 条规则**逐条校验。
  这是对 `check-host-contract.mjs`（只正则比对字面量）的补强：那个只能证明「常量写了什么」，
  证明不了「`apply()` 走完不抛错、描述符宿主真的收得下」。
- 反向对照是硬要求：把 `businessWidth` 改回 0.72，烟测立刻退出码 1 并打印
  `Workbench business width must be between 0.25 and 0.7（实际 0.72）`。
  正例反例都锁进 `test/activation.test.mjs`（2 条）。
- 顺手扫了家族里 15 个有 `lib/layout.js` 的工作台：14 个是 0.65、本仓 0.68，
  **没有第二处越界**——这次崩的是我们一家，不是家族通病。

**验证**：`npm run check` 全绿（含 17 条测试）；装机副本 `diff -r` 0 差异；
`probe:restart` / `probe:routes` PASS；产物上 34 页签全开；chips 显示 `v0.1.5`。
**Desktop 界面加载仍需重启确认。**

## 0.1.4 — 2026-10-25

清理发布包里与本品无关的内容；修正两条自己写错的素材结论。

- **他癌种参考图不再随包**：`assets/reference/metric-trends/{breast-records,lymphoma-metrics}.png`（1.1 MB）
  只被 `docs/24` 引用、零运行时代码引用，却因 `files: ["assets", …]` 被发到每台患者机器上。
  移到 `docs/assets/metric-trends/`（`docs/` 不随包），引用路径同步更新。
  包体积 **3,534,997 → 3,013,532 字节**，27 → **24 文件**。
- **纠正两条素材结论**（见 `docs/RELEASE.md`）：
  ① logo 的 license 不是「空着」——字段是 `licenseStatus`，值为
  `owner permission must be confirmed before public redistribution`，且与膀胱癌/黑色素瘤/甲状腺/胶质瘤
  **同一文件**（sha256 `e7bf8431…`），属家族级既有状态，不是本仓缺陷；
  ② 参考图「随包但无人用」这一条已在本版修掉，不是遗留。
- 新增 `scripts/audit-tab-diversity.py` 与 `npm run audit:diversity`：对装机产物量 34 个页签的
  正文 bigram 与结构单元相似度，证伪「同一套字段换标题」（实测最高 0.227 / 0.214），明细见 `docs/TAB-DIVERSITY.md`。

**验证**：装机副本 `diff -r` 0 差异；`probe:restart` / `probe:routes` PASS；
产物上 34 页签全开 0 异常 0 垃圾值；差异度审计 34 页签 0 空页签。**Desktop 界面加载仍需重启确认**。

## 0.1.3 — 2026-10-25

修一个**会导致 DSH Desktop 起不来**的装机缺陷；顺应用户裁定改品牌名。

**根因**：`businessWidth` 写了脚手架的默认值 **0.72**，而宿主 `register()` 硬性要求
`0.25 ≤ businessWidth ≤ 0.7`，不合格就 throw → 插件 `apply` 失败 → 渲染进程报
`web boot: 1 entry did not activate`，Desktop 无法启动，靠 `plugin-recovery` 自动卸载才恢复。
宿主日志只写 `failed`、不给原因，所以第一次排查时误判成 pnpm 的问题（见 LESSONS 15 的纠正）。

**修了什么**
- `lib/client.js` 与 `lib/layout.js` 的 `businessWidth`：0.72 → **0.68**（0.68 + 会话默认 0.32 = 1.00）。
- 新增 `scripts/check-host-contract.mjs`：把宿主 `register()` 的 7 条校验（title/Component、
  repository 正则、customFrame 布尔、businessSide 枚举、**businessWidth 区间**、headerLayout 枚举、
  业务区+会话区不超 1）复刻成本地闸门，接进 `npm run check`。反向对照：宽度改回 0.72 立刻 FAIL。
- `ctx.effect(fn, 'label')` 改回 `ctx.effect(fn)`，与家族里能正常加载的插件写法完全一致——不赌未验证的 API。

**品牌**：`小言宝 · VoicePal` → **`小嗓宝 · VoicePal`**（用户裁定：小泉宝是膀胱癌/泌尿族，
头颈癌须另起；「嗓」比「言」更能罩住喉、咽、口腔，同时保留「声音」这个情绪核心）。
包名 `@xyb-community/head-neck-workbench` 不变。

**验证**：装机副本 `diff -r` 0 差异；`probe:restart` / `probe:routes` PASS；
产物上 10 一级 / 34 二级页签全开、0 异常 0 垃圾值；chip 显示 `v0.1.3`。
**Desktop 界面加载：仍待用户重启后确认**（这一次插件应能激活，但未观察到的状态不写成通过）。

## 0.1.2 — 2026-10-25

补内容合规缺口 **GAP-1**：医学断言的内联来源原来全站只有 1 处。

**做了什么**
- `notice()` 支持第三个参数（来源行）；临床提示块与两张卡片说明逐条挂来源。
- **有真来源的挂真来源**：全喉切除的发声结局 → M05（PMID 42859059，n=92，B 级）；发音管使用寿命 → M06（PMID 42815565，n=135，B 级，平均 115 天 / 约 3.15 次/年）。
- **没有来源的明写「未核实」**，不拿相邻疾病或常识外推：沉默性误吸识别与发生率、失声后社会隔离的量化、吞咽安全与液体稠度、放疗后牙科风险（放射性骨坏死）、牙关紧闭发生率、造口急救处置细节——这 6 条都补了「原始文献未取得，未核实」。
- 新增断言锁住回退：`verify_prototype.py` 要求 `notice` 带来源 ≥6、直接 `src()` ≥2、「未核实」≥4；实测 6 / 2 / 6，**25/25 通过**。

**未做的**（说明边界，不假装补齐）：`docs/SOURCES.md` 列为「未取得」的 NCCN、CSCO、造口居家护理共识、ORN/牙关紧闭原始文献、颈清扫肩臂功能量化、中国流行病学——本轮只在这些断言上标了未核实，**没有**伪造引用。

**装机遇到的真问题**：`pnpm remove` 会把 `dsh.profile.bundles` 里的登记一并删掉，而 `add` 只装文件、**不会补回登记**——结果是包在盘上、版本也对，但宿主不会加载。已补回（34 项含本包），并把这条写进 `docs/LESSONS.md`。

## 0.1.1 — 2026-10-25

补丁版本。装到本机后才会看见的两处修正，外加把验收闸门本身加硬。

**修正**
- **导出摘要里的时间不再是裸 ISO**：任务完成时间原写作 `2026-10-24T10:00:00.000Z`，急症发生时间同理。同一张表里 `due_on` 是 `2026-11-20`，两种格式并存等于让读的人先解析一遍。现按本机时区写成 `2026-10-24 18:00`，并有测试锁住「导出不得含裸 ISO」。
- **装机产物上「手术与切除范围」页签不再整页崩**：`Cannot read properties of null (reading 'side')`。两处根因——`public/live.js` 把 `neck` 硬编码成 `null` 从不读 `children.neck_dissections`；原型直接写 `g.neck.side` 无空值保护。没做过颈清扫的档案（鼻咽癌路径常见）现在显示「本档案还没有颈清扫记录」。这个缺陷只在接上数据库后暴露，单文件原型永远走不到。

**验收闸门加硬**
- `verify-tabs-on-artifact.py` 加垃圾值断言：`undefined` / `NaN` / `null` / `[object Object]`。只断言「页签不空」不够——映射漏字段的典型症状是**渲染成功但内容是 undefined**，比整页崩溃更危险。
- 反向对照：向产物注入 `'undefined'` 后闸门必须 FAIL 并点名页签（实测点名 `tx/放疗`）。只报绿不报红的闸门等于没有闸门。

**产物级证据**（全部对装机副本本体跑）
- `probe:restart` PASS（解 tgz 两轮开库，46 表 → 写入 → 重开仍在）
- `probe:routes` PASS（7 组路由）
- `verify-tabs-on-artifact.py` PASS（10 一级 / 34 二级，0 异常、0 console error、0 失败请求、0 空态、0 垃圾值、390 宽不溢出）
- 装机副本与 tgz `diff -r` **0 差异**；装机版本 0.1.1，`dsh.profile.bundles` 34 项仍含本包

## 0.1.0 — 2026-10-25

首个可用版本。M0–M6 落地，M7 发布、M8 组织回填、M9 教训回流同步完成。

**业务面（10 一级 / 34 二级页签）**
- 两条不可通约的线分开走：HPV+ 口咽与烟酒相关口腔癌不是一种病；喉/下咽按「保喉 vs 全喉切除」分野。
- 原发部位决定一切：口腔 / 口咽 / 喉 / 下咽 / 鼻咽 / 唾液腺，鼻咽癌有独立路径（33 二级，「手术」隐藏、「放疗」置首）。
- 四条轨道（A 肿瘤学 / B 气道发声 / C 吞咽营养 / D 放疗晚期毒性）页面上写明「永远不相加」。
- 气管造口按「气道」做，不是普通造口的变体：急救卡写明「不能经口鼻呼吸」「请看我的造口，不要只看我的嘴」。
- 发音管单独记「取出原因」（平均 115 天、约 3.15 次/年，EV-04 PMID 42815565）。
- 放疗十年毒性：口干 / 吞咽 / 张口受限（张口度 mm 可折线）/ ORN / 放疗后拔牙禁忌。
- 颈清扫后肩臂功能：副神经是否保留单独记，副神经未保留 → 抬手梳头受影响。

**数据与接口**
- 本机 SQLite，46 表 + 增量迁移；`dshHomePath('head-neck-workbench')` 真持久目录，重启不丢数据。
- 7 组路由：health / bootstrap / subjects 增改 / entities 增改删 / export（json + 中文 md）/ UI 静态 / 前缀归一化。
- 约束失败翻成 **422 + `field`**（此前漏成 500 并把表名列名漏给前端）。
- 私密项 `viewpoints.is_private DEFAULT 1` fail-closed，默认不进摘要与导出。
- 报告解析（MinerU）本轮只留接口与设置页骨架，未接通。

**界面**
- 单文件 HTML 原型即视觉合同，`public/index.html` 由 `scripts/build-public.mjs` 从原型生成，只多一行 `live.js`。
- 演示数据全程标注「内容为虚构示例，不是真实病例」。
- 390 宽不横向溢出；指标卡固定高 276 翻转不撑开；一图秀 C1–C12 实测通过。

**验证**
- `npm run check`：15 tests、conformance 31/33（2 项待人工）、原型 24/24，退出码 0。
- 装机产物层：`probe:restart` PASS（重启不丢数据）、`probe:routes` PASS（7 组路由）、`verify-live.py` 8/8（点一次写回磁盘）、`verify-tabs-on-artifact.py` PASS（34 二级全可打开、0 异常）。
- 宿主外壳内界面加载**未验证**：插件装机晚于宿主启动，需完整退出重开 Desktop。
