# 硬约束与验证（DEV-REQUIREMENTS）

> 每条硬约束必须能被**一条命令**或**一张截图**验证，否则不算约束，只是愿望。
> 本文件在 M0 建立、每个里程碑复核一次。日期：2026-10-25。

## 一、组织四条不可让步

| # | 约束 | 验证命令 | 期望 | 当前实测 |
| --- | --- | --- | --- | --- |
| R1 | **不做诊断与处置**（禁词：建议治疗 / 可能复发 / 可以停药 / 无需就医 / 治愈率） | `node scripts/check-wording.mjs` | 0 违规 | **0 违规**（扫描 63 个文件，界面 + 文档） |
| R2 | **患者数据本机优先**（原型不联网、不上传） | `grep -cE "fetch\(|XMLHttpRequest|axios" prototypes/v0.1/index.html` | `0` | **0** |
| R3 | **医学内容标来源与版本**，未核实写「未核实」 | `grep -c "src(" prototypes/v0.1/index.html` | ≥ 每个医学断言一处 | **仅 1 处**（见 §三 已知缺口） |
| R4 | **不复制指南临床内容**（只做患者可理解的事实转述 + 出处） | 人工复核 `research/*.md` 与原型文案 | 无整段照搬 | 待人工复核 |

## 二、闸口与工程约束

| # | 约束 | 验证命令 | 期望 | 当前实测 |
| --- | --- | --- | --- | --- |
| G1 | 闸口顺序不可跳（调研→G1→G2→G3） | `for f in docs/RESEARCH-2026-10-25.md docs/HVT-REVIEW.md docs/DIFF-MATRIX.md docs/PROTOTYPE-REVIEW.md docs/SCHEMA.md; do test -f $f \|\| echo MISS $f; done` | 无输出 | **无输出**（五份都在） |
| G2 | 差异化矩阵 ≥3 条 S→F→A | `grep -c "^## D" docs/DIFF-MATRIX.md` | ≥3 | **6** |
| G3 | schema 草案不进 `schema/`、不写冻结合同 | `test -f schema/freeze-contract.md && echo VIOLATION` | 无输出 | **无输出**（草案在 `schema/draft/`） |
| E1 | 版本号首屏可见，且与 `package.json` 同源 | `node scripts/check-version.mjs` | 一致 | **一致 0.1.0**（顶栏 `.vchip` 第 228 行） |
| E2 | 原型无本地持久化（不伪装成已落库） | `grep -c localStorage prototypes/v0.1/index.html` | `0` | **0** |
| E3 | 导航 10 一级 / 34 二级 | `node --test test/*.test.mjs` | 6/6 通过 | **6/6** |
| E4 | 原型自检 | `python3 scripts/verify_prototype.py` | 全通过 | **24/24** |
| E5 | schema 约束探针 | `node scripts/check-schema-draft.mjs` | 全通过 | **24/24**（46 表 · 63 索引 · 35 表带 CHECK） |
| E6 | 一图秀 C1–C12 | `python3 scripts/measure-one-chart.py` | C6 越界 0 / C8 递减 | **C6=0，C8 14→12** |
| E7 | 脚手架合规 | `node scripts/check-conformance.mjs .` | 全通过 | **25/30**（3 项失败均为 M5 运行时代码：`lib/version.js`、`lib/layout.js`、`customFrame`，见 `docs/DEV-PLAN.md` §四） |

## 三、已知缺口（不掩盖）

### GAP-1 医学断言的内联来源只有 1 处

`grep -c "src(" prototypes/v0.1/index.html` = **1**（第 1190 行 WHO 分级口径）。其余医学断言（发音管 115 天、TL-F 持续更重、CPS 可大于 100、放疗后拔牙禁忌）的出处写在 `docs/RESEARCH-2026-10-25.md` 与 `research/*.md`，**没有在界面上逐条标注**。

- 影响：患者读到「发音管平均 115 天」时，界面上看不到这是哪篇文献。
- 处置：M2 原型修订时，把 R3 落成「每条医学断言旁必须有 `src()`」，并把 `src()` 数量纳入 `check-wording.mjs` 的下限断言。**本轮不做**（会改动 34 个页签的文案，需重新走 G2 确认）。

### GAP-2 检查链有 3 项属于 M5 运行时代码

`lib/version.js`、`lib/layout.js`、`customFrame: true` 缺失，导致 `check-conformance` 停在 25/30。这三项**不是文档欠账**，是 M5 才该写的代码，已在 `docs/DEV-PLAN.md` §四如实挂账。

### GAP-3 U 级未核验 6 条

`docs/HVT-REVIEW.md` 的 U1–U6 是「桌面研究无法确认、需真实患者或临床确认」的假设。没有访谈（DESIGN-12：只做桌面研究），因此**永久记为未核实**，不得在文案里写成事实。

## 四、复核节奏

| 时点 | 复核内容 |
| --- | --- |
| 每个里程碑结束 | 本表 §一 §二 全部命令重跑一遍，结果写回「当前实测」列 |
| G2 签认前 | §一 R3 必须从 1 处提升到「每条断言一处」，否则 G2 不签 |
| M6 装机前 | E1 需在**装机后的应用首屏**再验一次（原型可见 ≠ 应用可见） |
