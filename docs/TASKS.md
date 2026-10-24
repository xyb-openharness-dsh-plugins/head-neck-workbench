# 实施任务与当前交接

规格版本：`docs/SPEC.md` v0.1 草案（未签认）
原型 hash：`a395b41755b3b37232201ac1d887b009d713118b71471667b24e48062c26d0f5`（`prototypes/v0.1/index.html`）
当前分支：`main`（本地）· 远端仓：**未建**

## 里程碑（M0–M7）

| 里程碑 | 内容 | 状态 | 证据 |
| --- | --- | --- | --- |
| M0 | 骨架：脚手架 init、目录与文件体系 | **完成** | 137 文件；`dsh-wb-cli check` staticPass |
| M1 | 调研 + 场景 + SPEC | **基本完成** | `docs/RESEARCH-2026-10-25.md`（含 12 条事实与来源等级）、`docs/SCENARIOS.md`（10/34/14，五项裁决已落）、`docs/SPEC.md`（草案，未签认） |
| M2 | HTML 原型 | **完成，待确认** | `prototypes/v0.1/index.html`；22/22 自检；12 张截图 |
| M3 | 数据模型 | **完成草案** | `schema/draft/0001_initial.sql`（46 表 / 63 索引）；24/24 约束探针；`docs/SCHEMA.md` |
| M4 | 临床库（本癌种 2026 试验数据） | **不适用（待用户改口径）** | 场景 L10 裁决「不上临床试验入口」；若改口径需重开本里程碑 |
| M5 | 开发版（生产业务实现） | **未开始** | 前置：G1 HVT 签认 + G2 HTML 确认 + G3 schema 冻结 |
| M6 | 装机（实际包/Profile/版本核验） | **未开始** | — |
| M7 | 发布（tag/包 hash/市场） | **未开始** | 未授权 |

## 闸口

| 闸口 | 内容 | 状态 |
| --- | --- | --- |
| G1 | HVT 五层需求审核 | **未跑**（`docs/HVT-REVIEW.md` 仍有 20 处占位） |
| G2 | HTML 单文件原型用户确认 | **待用户确认**（见 `docs/PROTOTYPE-REVIEW.md` §8） |
| G3 | schema 冻结（`schema/draft` → `schema/`） | **未开始** |

## 任务表

| ID | 业务单元 | 前置依赖 | 拥有文件/模块 | 实现/检查要求 | 证据 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | 接入基线 | BRIEF/SPEC | package/patch/entry | 实际包可被目标宿主加载 | — | 待开始（M5） |
| T02 | 数据/API | T01 + 合同 | store/migrations/api | 旧库兼容与读写闭环 | schema 草案 | 待开始（M5） |
| T03 | 共享 UI | 原型冻结/API 合同 | components | 翻面/图表/弹窗/状态 | 原型内已实现 | 待开始（M5） |
| T04 | 完整 Tab | T02/T03 | 按页面分配 | 输入→操作→结果→回顾 | 原型内已走查 | 待开始（M5） |
| T05 | 跨页/安装验收 | T04 | 集成/发布记录 | 官方自测、实际包/版本 | — | 待开始（M6） |
| T06 | 发布与市场 | T05 | `docs/RELEASE.md` | 授权、tag/包/hash、Profile、PR | — | 不适用（未授权） |
| T07 | 原生 Agent 面板 | T01 + 目标 Desktop 合同 | 全局入口、面板状态、布局偏好 | 按 ACC-28–31 | 原型内为外壳 | 待开始（M5） |

## 当前失败/复现

无。三套自检全绿：`verify_prototype.py` 22/22、`check_schema_draft.py` 24/24（若存在 node 版见 `scripts/`）。

## 未验证项

- 版本号与 `package.json`/tag 一致性：未验证（M5）
- 真实文件解析、导出文件、AI 会话：未接通
- 性能（SQLite 查询、图表大数据量）：**未测量**

## 下一步具体动作

1. 跑 G1：HVT 五层需求审核，填 `docs/HVT-REVIEW.md`，B 级项清零。
2. 请用户按 `docs/PROTOTYPE-REVIEW.md` §8 确认 HTML 版本与范围（G2）。
3. G1+G2 通过后复核 schema 并冻结（G3），再进 M5。

## 用户已确认的偏好与授权

- 品牌「小言宝 · VoicePal」（DESIGN-02，可随时推翻）
- 喉 + 下咽 + 口腔三者做厚；鼻咽癌独立路径（DESIGN-05 / 07）
- 接受 34 个二级（DESIGN-06）
- 黏膜炎用 WHO 口径（DESIGN-04）
- 失声者走「家属代记 + 打印急救卡」，不做语音输入（DESIGN-08）
- 未授权：推送到远端、公开发布、市场投稿
