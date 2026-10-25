# 实施任务与当前交接

规格版本：`docs/SPEC.md` v0.1 草案（未签认）
原型 hash：`0c1c8aca775a4d59b0b0aa95d53f277c3cfb9dabb606f08912a15ac599d910bb`（`prototypes/v0.1/index.html`）
当前分支：`main`（本地）· 远端仓：**未建**

## 里程碑（M0–M7）

| 里程碑 | 内容 | 状态 | 证据 |
| --- | --- | --- | --- |
| M0 | 骨架：脚手架 init、目录与文件体系 | **完成** | `dsh-wb-cli 1.5.0` init 生成 150 文件；`dsh-wb-cli check .` → `staticPass: true` |
| M1 | 调研 + 场景 + SPEC | **完成** | `docs/RESEARCH-2026-10-25.md`（8 条证据 A/B 分级 + 12 维度 + 4 轨道）、`docs/SCENARIOS.md`（10/34/14）、`docs/SOURCES.md`（M01–M08） |
| M2 | HTML 原型 | **完成（G2 已确认）** | `prototypes/v0.1/index.html`（SHA-256 `0c1c8aca…`）；`verify_prototype.py` 24/24；`_shots/` 12 张截图 |
| M3 | 数据模型 | **完成（G3 已冻结）** | `schema/migrations/0001_initial.sql`（46 表 / 63 索引 / 35 表带 CHECK）；`check-schema-draft.mjs` 24/24 |
| M4 | 临床库（本癌种 2026 试验数据） | **不适用** | 场景 L10 裁决「不上临床试验入口」；`web_search` 把 head-and-neck 解析成运动品牌 HEAD，无可信通道 |
| M5 | 开发版（生产业务实现） | **代码完成，待真机验收** | `lib/client.js` customFrame 外壳、`dsh/store.js`（46 表迁移+种子）、`dsh/server.js`（7 组路由）、`public/live.js` 读写闭环；`verify-live.py` 8/8；`npm run check` 全绿 |
| M6 | 装机（实际包/Profile/版本核验） | **已装待验收** | `release/…0.1.0.tgz`（SHA-256 `b610a578…`）；已入 Desktop profile 的 `dsh.profile.bundles`；`check-install.mjs` ✓；装机副本与 tgz `diff -r` 0 差异；`probe:restart` PASS（46 表/种子/写入/重开仍在）；`probe:routes` PASS（7 组路由，含 export 两格式、UI 302、422+field 映射）；**`verify-tabs-on-artifact.py` PASS**——对装机副本本体用真 Chrome 逐个点开 10 一级 / 34 二级，0 异常/0 console error/0 失败请求/无空态/390 宽不溢出 |
| M7 | 发布（tag/包 hash/市场） | **已发布，市场投稿未做** | 远端仓 `xyb-openharness-dsh-plugins/head-neck-workbench`（private，默认 `main`）；tag `v0.1.0`；Release `v0.1.0` 附 tgz（3,534,460 字节）；`CHANGELOG.md` 按实际内容重写；**市场投稿未做**（对外投稿，等用户点头） |
| M8 | 状态回填（组织 BACKLOG） | **完成并已推送** | `~/Downloads/.github` `097dbc0`；第 73 行主表 + 第 199 行 W5 表；顺带把「当前已启动」改为实查口径（远端 24 + 仅本地 3） |
| M9 | 教训回流（脚手架可执行闸门） | **完成（脚手架 1.5.2）** | `serve-artifact.mjs` + `verify-tabs-on-artifact.py` + `pack-contents.test.mjs` 随 init 下发；manifest `probe:artifact`/`probe:tabs`；`check-starter` 必备清单加三件；LESSONS 11/12/13；starter `51348a8`，`npm test` 37/37，新项目 154 文件、`npm test` 4/4 |

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

## M8 状态回填（已完成并推送）

组织 `~/Downloads/.github/BACKLOG.md` 两处按事实更新，推送 commit `097dbc0`：
- 第 73 行主表：`🟡 v0.1.0 脚手架已 init，远端仓待建` → `🔵 v0.1.0 已发布（tag + Release 附 tgz），M0–M7 完成、本机已装待重启验收`
- 第 199 行 W5 表：补 G1/G2/G3 已过、10 一级 / 34 二级原型 + 46 表 SQLite + customFrame 外壳；「需覆盖鼻咽癌」→「已覆盖鼻咽癌独立路径（33 二级）」

**rebase 踩坑**：推送时 origin/main 已被他人推进（肾癌更新 `cd1612a`），本地 3 个 commit 分叉且 `BACKLOG.md` 冲突（「三、总量 / 当前已启动」那一行两边都在猜工作台数量）。**不猜、实查**：`gh repo list` → 28 仓、其中 `*-workbench` **24 个**；本地另有 3 个仅本地存在（biliary-tract-workbench / sarcoma-workbench / cancer-psych-support-workbench）→ 改写为「27 个工作台；远端仓 24 个，另有 3 个仅本地」并注明计数口径（`xyb-workbench` / `xfb-workbench` / `xiaoxinbao-workbench` 为站点工具仓不计入）。

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

- 品牌「小嗓宝 · VoicePal」（DESIGN-02，可随时推翻）
- 喉 + 下咽 + 口腔三者做厚；鼻咽癌独立路径（DESIGN-05 / 07）
- 接受 34 个二级（DESIGN-06）
- 黏膜炎用 WHO 口径（DESIGN-04）
- 失声者走「家属代记 + 打印急救卡」，不做语音输入（DESIGN-08）
- 未授权：推送到远端、公开发布、市场投稿

## 0.1.3 事故复盘与 M9 延伸（脚手架 1.5.4）

| 项 | 结论 |
| --- | --- |
| 现象 | 装 0.1.0–0.1.2 后 DSH Desktop 起不来；日志 `web boot: 1 entry did not activate` + `@xyb-community/head-neck-workbench: failed`，`plugin-recovery` 自动卸载后才恢复 |
| 根因 | 宿主 `desktopWorkbenches.register()` 要求 `0.25 ≤ businessWidth ≤ 0.7`，本项目写 **0.72**（脚手架惯用值）→ `apply` throw → 激活失败 |
| 为什么本地查不出 | 这条校验只在渲染进程；`check-workbench-package` / `check-conformance` / 测试全都不看这个区间 |
| 本项目修法 | `businessWidth` 0.72 → **0.68**（0.68 + 会话 0.32 = 1.00）；新增 `scripts/check-host-contract.mjs` 复刻宿主 7 条校验并接进 `npm run check`（把宽度改回 0.72 会 FAIL 并打印宿主原文） |
| 上游修法（M9 延伸） | starter **1.5.4**：`check-conformance` 上限 0.75 → **0.7**（原来比宿主还宽，等于放行）；`init` 对 `business-first` 也校验宽度；`templates/check-host-contract.mjs` 随 init 下发并接进派生项目的 `check` |
| 双向验证 | 0.68 通过 / 0.72 拦下 / 非 GitHub repository 拦下；starter `npm test` 38/38、`check-starter` 167 文件 pass |
| 仍未验证 | Desktop 重启后界面是否真的加载——**观测到之前不写通过** |
