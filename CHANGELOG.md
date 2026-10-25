# 变更记录

只增不删；每条写清"改了什么 + 为什么 + 用户可见结果"。版本号与 VERSION、package.json 三处必须一致。

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
