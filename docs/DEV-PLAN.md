# 开发计划与里程碑（DEV-PLAN）

> **本文件是里程碑状态的唯一权威来源。** 截图、脚本通过、提交记录都只是证据，不能自行宣布里程碑完成。
> 签认只认**用户原话**；Agent 自评不算签认。
> 三类状态必须分开写：**✅ 已完成（有证据）** ／ **🔵 已执行未验证** ／ **⬜ 未开始**。

日期：2026-10-25 ｜ 项目：头颈癌工作台（小言宝 · VoicePal）｜ 包名：`@xyb-community/head-neck-workbench`

## 一、里程碑总表

| 里程碑 | 名称 | 状态 | 证据 | 缺什么 |
| --- | --- | --- | --- | --- |
| **M0** | 骨架 | ✅ 完成 | `dsh-wb-cli 1.5.0` init 生成 150 文件；`dsh-wb-cli check .` → `staticPass: true`；提交 `f85a3b9` | — |
| **M1** | 调研 + SPEC | ✅ 完成 | `docs/RESEARCH-2026-10-25.md`（8 条证据 A/B 分级 + 12 维度 + 4 轨道 + 8 缺口）、`docs/SOURCES.md`（M01–M08）、`research/` 三份事实提取 | — |
| **G1** | HVT 五层审核 | ✅ 完成 | `docs/HVT-REVIEW.md`（B=0、G=1、U=6）、`docs/DIFF-MATRIX.md`（6 条 S→F→A 五层齐）、`docs/SCENARIO-PATHS.md`（S01–S17） | U 级 6 条待核验（不阻塞 G1） |
| **M2** | 原型 | ✅ 完成 | `prototypes/v0.1/index.html`（10 一级 / 34 二级，SHA-256 `75deabb7…`）；`scripts/verify_prototype.py` **24/24**；`_shots/` 12 张截图 | — |
| **G2** | 原型确认 | ⬜ **未开始** | `docs/PROTOTYPE-REVIEW.md` §八：**仅确认 S09/S12/S14 三条「回首页无变化」保留原设计**（2026-10-25，用户原话「确认，继续」），**不构成 G2 签认** | 其余 14 条路径 + 34 个二级页签逐条确认 |
| **M3** | 数据模型 | ✅ 完成（草案） | `docs/SCHEMA.md` + `schema/draft/0001_initial.sql`（**46 表 · 63 索引 · 35 表带 CHECK**）；`scripts/check-schema-draft.mjs` **24/24** | — |
| **G3** | schema 冻结 | ⬜ **未开始** | 草案在 `schema/draft/`，**不进** `schema/`、不写 `freeze-contract.md` | 用户签认 M3 草案 |
| **M4** | 临床库 | **不适用（待用户裁定）** | `docs/SCENARIOS.md` L10 决定「试验不上」；本项目无试验登记库需求 | 见 §三 |
| **M5** | 开发版 | ⬜ **未开始** | 无 `lib/version.js`、无 `lib/layout.js`、无写入闭环 | 见 §四 |
| **M6** | 装机 | ⬜ **未开始** | 无 remote 仓、未打包 | 见 §四 |
| **M7** | 发布 | ⬜ **未开始** | — | — |
| **M8** | 状态回填 | ⬜ **未开始** | 需回填组织 `BACKLOG.md` 对应行 | — |
| **M9** | 回流 | ⬜ **未开始** | 教训需变成脚手架可执行闸门 | — |

**一句话现状**：M0–M3 完成（含 G1），**卡在 G2**。原型能看能点，但没有任何写入能力，且用户尚未逐条确认。

## 二、闸口顺序（不可跳）

```
M1 调研 ─→ G1 HVT ─→ M2 原型 ─→ G2 原型确认 ─→ M3 schema ─→ G3 冻结 ─→ M5 开发版 ─→ M6 装机 ─→ M7 发布
```

- **G2 未过不得写业务代码**（`docs/14-HTML-AND-DATA-CONTRACT.md`）。
- **G3 未过不得进 `schema/`**，也不写冻结合同。
- 已有确认按范围继承；新增或重大交互变更需重新展示。

## 三、M4 为什么是「不适用」

膀胱癌做 M4 是因为它的患者会问「有什么临床试验可以进」，且组织有 CT.gov 采集通道。头颈癌的情况不同：

1. `docs/SCENARIOS.md` 的 L10（临床试验）判定为**不上**——桌面研究阶段没有找到可用的中文头颈癌试验聚合源，`web_search` 通道又把 "head and neck" 解析成运动品牌 HEAD（见 `docs/SOURCES.md` 通道实测）。
2. 强行做一个只有 3–5 条演示数据的「临床试验」页，会让患者以为这里有真实可及的机会——**这比没有更糟**。

**处置**：M4 记为不适用，`docs/SCENARIOS.md` L10 保持「不上」。若用户后续要求补，需先解决数据源问题（CT.gov API v2 可按 condition 拉，但需重新评估中文化成本）。

## 四、M5 开工前的真实缺口（不是文档欠账，是代码欠账）

`node scripts/check-conformance.mjs .` 当前 **25/30 通过 · 3 失败 · 2 待人工**（本轮从 17/30 修到 25/30）。逐条归因：

| 失败项 | 性质 | 何时处理 |
| --- | --- | --- |
| 缺 `lib/version.js` | 运行时代码（生成物，供客户端显示版本） | M5 |
| 缺 `lib/layout.js` | 运行时代码（面板参数唯一来源） | M5 |
| `lib/layout.js` 无 `customFrame: true` | 运行时代码（决定顶栏 AI 按钮与可拖分栏） | M5 |
| ~~检查链缺「单测 / 版本一致 / schema / 文案红线」~~ | `package.json` scripts | ✅ **本轮已补**（`check-version.mjs` / `check-wording.mjs` / `--test` / `check-schema-draft.mjs`） |
| ~~`test/` 下无 `*.test.mjs`~~ | 测试 | ✅ **本轮已补**（`test/smoke.test.mjs` 6 条） |
| ~~缺 `docs/DIFF-MATRIX.md`~~ | 文档（G1 门槛） | ✅ **本轮已补**（6 条 S→F→A） |
| ~~缺 `docs/DEV-PLAN.md`~~ | 文档（本文件） | ✅ **本轮已补** |
| ~~缺 `docs/DEV-REQUIREMENTS-<日期>.md`~~ | 文档 | ✅ **本轮已补** |

**关键结论**：剩余 **3 项失败全是 M5 的运行时代码**（`version.js`、`layout.js`、`customFrame`），不是 phase1 该交的东西。phase1 的文档与检查链已补齐。

**2 项待人工**：`data/冻结合同`（G3 未签，按闸口不该有）、`ui/原型基线`（无 v0.2，正常）。

## 五、状态更新规则

1. 每次状态变化，改**本文件**的表格，再改 `docs/TASKS.md` 与 `docs/PROTOTYPE-REVIEW.md`。
2. 状态从 ⬜ → 🔵 需要「已执行」的证据（命令输出、截图）；从 🔵 → ✅ 需要**用户原话**。
3. `push` / `tag` / 装进 Desktop / 市场上架是**四件事**，不能互相代替。
4. 未观察到的状态写「未验证」，不写「应该没问题」。
