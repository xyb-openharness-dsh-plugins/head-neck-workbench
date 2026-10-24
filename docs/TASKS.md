# 实施任务与当前交接

规格版本：`docs/SPEC.md` v0.1 草案（未签认）
原型 hash：`75deabb76e41d05d4f364c056e40ef4d22d05e66d17e5ffb81ce2895479c124d`（`prototypes/v0.1/index.html`）
当前分支：`main`（本地）· 远端仓：**未建**

## 里程碑（M0–M7）

| 里程碑 | 内容 | 状态 | 证据 |
| --- | --- | --- | --- |
| M0 | 骨架：脚手架 init、目录与文件体系 | **完成** | `dsh-wb-cli 1.5.0` init 生成 150 文件；`dsh-wb-cli check .` → `staticPass: true` |
| M1 | 调研 + 场景 + SPEC | **完成** | `docs/RESEARCH-2026-10-25.md`（8 条证据 A/B 分级 + 12 维度 + 4 轨道）、`docs/SCENARIOS.md`（10/34/14）、`docs/SOURCES.md`（M01–M08） |
| M2 | HTML 原型 | **完成（G2 已确认）** | `prototypes/v0.1/index.html`（SHA-256 `75deabb7…`）；`verify_prototype.py` 24/24；`_shots/` 12 张截图 |
| M3 | 数据模型 | **完成（G3 已冻结）** | `schema/migrations/0001_initial.sql`（46 表 / 63 索引 / 35 表带 CHECK）；`check-schema-draft.mjs` 24/24 |
| M4 | 临床库（本癌种 2026 试验数据） | **不适用** | 场景 L10 裁决「不上临床试验入口」；`web_search` 把 head-and-neck 解析成运动品牌 HEAD，无可信通道 |
| M5 | 开发版（生产业务实现） | **代码完成，待真机验收** | `lib/client.js` customFrame 外壳、`dsh/store.js`（46 表迁移+种子）、`dsh/server.js`（7 组路由）、`public/live.js` 读写闭环；`verify-live.py` 8/8；`npm run check` 全绿 |
| M6 | 装机（实际包/Profile/版本核验） | **已装待验收** | `release/…0.1.0.tgz`（SHA-256 `5207dd1e…`）；已入 Desktop profile 的 `dsh.profile.bundles`；`check-install.mjs` ✓；装机副本探针 4 条路由全 200 |
| M7 | 发布（tag/包 hash/市场） | **未开始** | 未授权 |

## 闸口

| 闸口 | 内容 | 状态 |
| --- | --- | --- |
| G1 | HVT 五层需求审核 | **完成**（B=0、G=1、U=6；`docs/HVT-REVIEW.md`；`docs/DIFF-MATRIX.md` 6 条 S→F→A 五层齐） |
| G2 | HTML 单文件原型用户确认 | **完成**（用户原话 m05978「G2确认，继续完成开发到M9」） |
| G3 | schema 冻结（`schema/draft` → `schema/migrations`） | **完成**（冻结副本头部写明授权来源；`dsh/store.js` 按目录递增迁移） |

## 任务表

| ID | 业务单元 | 前置依赖 | 拥有文件/模块 | 实现/检查要求 | 证据 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | 接入基线 | BRIEF/SPEC | package/patch/entry | 实际包可被目标宿主加载 | `check-install.mjs` ✓ 已登记 | 完成（装机待真机验收） |
| T02 | 数据/API | T01 + 合同 | store/migrations/api | 旧库兼容与读写闭环 | 46 表迁移 + 7 组路由 + `verify-live.py` 8/8 | 完成 |
| T03 | 共享 UI | 原型冻结/API 合同 | components | 翻面/图表/弹窗/状态 | 原型内已实现，`public/` 直接复用 | 完成 |
| T04 | 完整 Tab | T02/T03 | 按页面分配 | 输入→操作→结果→回顾 | 原型 10 一级/34 二级全渲，`live.js` 接库 | 完成 |
| T05 | 跨页/安装验收 | T04 | 集成/发布记录 | 官方自测、实际包/版本 | 包已装；真机界面待用户重启后验收 | 待验收（M6） |
| T06 | 发布与市场 | T05 | `docs/RELEASE.md` | 授权、tag/包/hash、Profile、PR | — | 不适用（未授权） |
| T07 | 原生 Agent 面板 | T01 + 目标 Desktop 合同 | 全局入口、面板状态、布局偏好 | 按 ACC-28–31 | `lib/client.js` customFrame 外壳（顶栏入口/可拖/窄屏抽屉/只填草稿） | 完成（待真机验收） |

## 当前失败/复现

无。`npm run check` 退出码 0：`staticPass: true`、文案红线 0 违规（64 文件）、schema 24/24（46 表 / 63 索引）、原型 24/24、conformance 31/33（0 失败 · 2 待人工：`schema/freeze-contract.md` 未单独建文件、无 `prototypes/v0.2`）。

## 未验证项

- **Desktop 内真机界面**：包已装、profile 已登记，但界面要重启 DSH Desktop 才加载——未验证。
- 版本号与 tag 一致性：`check-version.mjs` 三处同源已过；**tag 未打**（M7 未授权）。
- 真实文件解析（PDF/报告导入）：未接通，`docs/18-MINERU-PARSING.md` 接口与设置页骨架未做。
- 性能（SQLite 查询、图表大数据量）：**未测量**。

## 下一步具体动作

1. **用户完整退出并重开 DSH Desktop**，验收左侧工作台入口、顶栏 AI 按钮、右侧会话拖拽、业务页读写是否真的可用。
2. 真机通过后 M5/M6 由 🔵 转 ✅，进 M7 发布（需用户授权推送与市场投稿）。
3. 未授权项：远端推送、公开发布、市场投稿、tag。

## 用户已确认的偏好与授权

- 品牌「小言宝 · VoicePal」（DESIGN-02，可随时推翻）
- 喉 + 下咽 + 口腔三者做厚；鼻咽癌独立路径（DESIGN-05 / 07）
- 接受 34 个二级（DESIGN-06）
- 黏膜炎用 WHO 口径（DESIGN-04）
- 失声者走「家属代记 + 打印急救卡」，不做语音输入（DESIGN-08）
- 未授权：推送到远端、公开发布、市场投稿
