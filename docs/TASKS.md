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
| M6 | 装机（实际包/Profile/版本核验） | **已装待验收** | `release/…0.1.0.tgz`（SHA-256 `cbe00798…`）；已入 Desktop profile 的 `dsh.profile.bundles`；`check-install.mjs` ✓；装机副本探针 4 条路由全 200 |
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

## M8 状态回填（已完成，未推送）

组织 `~/Downloads/.github/BACKLOG.md` 两处按事实更新，本地 commit `a6ef38f`：
- 第 73 行主表：`🟡 v0.1.0 脚手架已 init，远端仓待建` → `🔵 v0.1.0 M0–M6 代码与打包完成、本机已装待真机验收，远端仓未建（未授权推送）`
- 第 199 行 W5 表：补 G1/G2/G3 已过、10 一级 / 34 二级原型 + 46 表 SQLite + customFrame 外壳；「需覆盖鼻咽癌」→「已覆盖鼻咽癌独立路径（33 二级）」

**未 push**：该仓 `main` 领先 `origin/main` 两个 commit（`ed69f11` 认领 + `a6ef38f` 回填），推送需授权。

## M9 教训回流（已完成）

两条教训回流成脚手架 **1.5.1** 的可执行闸门（starter commit `7d5bbdd`）：

1. **规则⑨（`scripts/check-workbench-package.mjs`）**：运行期按**拼出来的路径**读目录（迁移 SQL、模板、标准原文 PDF）也必须随包发出。只扫会随包发出的文件，从 `join()`/`resolve()` 字面量推目录，按「文件所在目录」「包根」两种基准试。实测在本项目报出 `schema/migrations  ← read at runtime by dsh/store.js`——正是原先的盲区。
2. **`templates/test-pack-contents.test.mjs`**：以 `npm pack --dry-run --json` 的真实清单为对象断言，**自适应**跳过项目还没有的目录；生成项目自带 `test` 脚本，`release:check` 串上 `test`。
3. **LESSONS 第 9 类**：「有闸门 ≠ 这类问题有闸门」——判断覆盖率要看**机制**不要看**症状**（import 型能静态查，运行时拼路径型不能）。

验证：starter `npm test` **37/37**；新生成项目 `npm run check` 退出 0、`npm test` **4/4**；`check-starter` 152 文件 pass。

**规则⑨ 自身经过三轮收敛**（starter commit `cc14d9d`），每轮都对应一类真实代码形态：①写调用（`mkdir`/`writeFile`）的目标目录不需要随包发出（attr 的 `prototypes/v0.2` 误报 5 条）；②「在 files 白名单里」≠「运行期会执行」，构建脚本随包发但读 `prototypes/` 是构建期行为，必须只看从 `main`/`exports` 出发的 import 闭包；③同文件同名变量（`writeJs` 与 `applyMigrations` 各有一个 `const dir`），必须就近取该 read 调用之前最后一个声明。

**双向验证**（只验一个方向等于没验）：真缺陷上必响——本项目抽掉 `schema/migrations` 后规则⑨ 报出 `schema/migrations ← read at runtime by dsh/store.js`；全家族 **27 个 `*-workbench` 仓 0 命中**，无误报。

**一条说法被实测推翻并已改正**：先前文档写"缺迁移会静默空库"。2026-10-25 在**打包产物**上实测：本项目 M5d 写了守卫 `if (!files.length) throw`，实际是**开库直接抛错**（`找不到迁移文件：…/schema/migrations`），面板报错而非列表空着。静默空库只在没有守卫的写法（`existsSync(dir) ? readdirSync(dir) : []`）下才发生。已同步修正 `docs/LESSONS.md` 与脚手架 `docs/LESSONS.md`——**运行期守卫只能把"静默"变成"报错"，装不进去这件事必须靠打包时拦住**。

## 下一步具体动作

1. **用户完整退出并重开 DSH Desktop**，验收左侧工作台入口、顶栏 AI 按钮、右侧会话拖拽、业务页读写是否真的可用。
2. 真机通过后 M5/M6 由 🔵 转 ✅。
3. **M7 需要显式授权**：建远端仓、push、打 tag、GitHub Release、市场投稿——对外可见且不可撤回，不自行决定。
4. BACKLOG 两个本地 commit 是否推送，也一并等授权。

## 用户已确认的偏好与授权

- 品牌「小言宝 · VoicePal」（DESIGN-02，可随时推翻）
- 喉 + 下咽 + 口腔三者做厚；鼻咽癌独立路径（DESIGN-05 / 07）
- 接受 34 个二级（DESIGN-06）
- 黏膜炎用 WHO 口径（DESIGN-04）
- 失声者走「家属代记 + 打印急救卡」，不做语音输入（DESIGN-08）
- 未授权：推送到远端、公开发布、市场投稿
