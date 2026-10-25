# 开发计划与里程碑（DEV-PLAN）

> **本文件是里程碑状态的唯一权威来源。** 截图、脚本通过、提交记录都只是证据，不能自行宣布里程碑完成。
> 签认只认**用户原话**；Agent 自评不算签认。
> 三类状态必须分开写：**✅ 已完成（有证据）** ／ **🔵 已执行未验证** ／ **⬜ 未开始**。

日期：2026-10-25 ｜ 项目：头颈癌工作台（小嗓宝 · VoicePal）｜ 包名：`@xyb-community/head-neck-workbench`

## 一、里程碑总表

| 里程碑 | 名称 | 状态 | 证据 | 缺什么 |
| --- | --- | --- | --- | --- |
| **M0** | 骨架 | ✅ 完成 | `dsh-wb-cli 1.5.0` init 生成 150 文件；`dsh-wb-cli check .` → `staticPass: true`；提交 `f85a3b9` | — |
| **M1** | 调研 + SPEC | ✅ 完成 | `docs/RESEARCH-2026-10-25.md`（8 条证据 A/B 分级 + 12 维度 + 4 轨道 + 8 缺口）、`docs/SOURCES.md`（M01–M08）、`research/` 三份事实提取 | — |
| **G1** | HVT 五层审核 | ✅ 完成 | `docs/HVT-REVIEW.md`（B=0、G=1、U=6）、`docs/DIFF-MATRIX.md`（6 条 S→F→A 五层齐）、`docs/SCENARIO-PATHS.md`（S01–S17） | U 级 6 条待核验（不阻塞 G1） |
| **M2** | 原型 | ✅ 完成 | `prototypes/v0.1/index.html`（10 一级 / 34 二级，SHA-256 `0c1c8aca775a4d59b0b0aa95d53f277c3cfb9dabb606f08912a15ac599d910bb`）；`scripts/verify_prototype.py` **24/24**；`_shots/` 12 张截图 | — |
| **G2** | 原型确认 | ✅ 完成 | 用户原话（m05978）：「G2确认，继续完成开发到M9」；此前 m05820「确认，继续」确认 S09/S12/S14 保留原设计 | — |
| **M3** | 数据模型 | ✅ 完成 | `docs/SCHEMA.md` + `schema/draft/0001_initial.sql`（**46 表 · 63 索引 · 35 表带 CHECK**）；`scripts/check-schema-draft.mjs` **24/24** | — |
| **G3** | schema 冻结 | ✅ 完成 | `schema/migrations/0001_initial.sql`（冻结副本，头部写明「G3 由用户 m05978 授权进入实施」）；`dsh/store.js` 启动即按目录内 `.sql` 递增迁移 | — |
| **M4** | 临床库 | **不适用（待用户裁定）** | `docs/SCENARIOS.md` L10 决定「试验不上」；本项目无试验登记库需求 | 见 §三 |
| **M5** | 开发版 | 🔵 **已执行未验证** | `lib/version.js`、`lib/layout.js`（含 `customFrame: true`）、`lib/client.js`（customFrame 外壳）、`dsh/store.js`（46 表迁移 + 演示种子）、`dsh/server.js`（health/bootstrap/seed/export/entities CRUD/静态 UI）、`public/live.js`（读写闭环）；`scripts/verify-live.py` **8/8**；`npm run check` 全绿（`staticPass: true`、文案 0 违规、schema 24/24、原型 24/24、单测 **16/16**、conformance **31/33**·0 失败·2 待人工） | Desktop 内真机验收（需用户重启后做） |
| **M6** | 装机 | 🔵 **激活失败已修复（0.1.4 已装），界面待重启验收** | **曾整机起不来**：`businessWidth=0.72` 超宿主硬上限 0.7 → `register()` 抛错 → `web boot: 1 entry did not activate`，`plugin-recovery` 自动卸载后恢复（harness.log 2026-10-24T23:58:41Z 有原文）。0.1.3 改为 0.68 并加 `scripts/check-host-contract.mjs` 复刻宿主 7 条校验接进 `npm run check`（反向对照：改回 0.72 立刻 FAIL，打印宿主原文）。当前装的是 **0.1.4**：`release/xyb-community-head-neck-workbench-0.1.4.tgz`（SHA-256 `d8ffb85b…`，3,013,532 字节，24 文件），装机副本 `diff -r` 0 差异，`dsh.profile.bundles` 34 项含本包，`probe:restart`/`probe:routes` PASS，产物上 34 二级页签全开、差异度审计 0 模板化。**界面加载仍需用户重启确认** |
| **M7** | 发布 | 🔵 **代码/包/Release 已发布，市场投稿被仓库私有卡住（需授权）** | 远端仓 `xyb-openharness-dsh-plugins/head-neck-workbench`（**private**，默认分支 `main`）；tag `v0.1.0`…`v0.1.4`，最新 Release `v0.1.4` 附 `xyb-community-head-neck-workbench-0.1.4.tgz`（3,013,532 字节，SHA-256 `d8ffb85b…`，资产大小已回读一致）。**市场投稿材料已备齐**（`market/samqin123__head-neck-workbench.yml` + 0.1.4 产物真机截图 12 张 + 包合规自检：2.87MiB < 8MiB、无个人绝对路径、无密钥），但 **Release 资产匿名下载 404、raw 截图同样取不到**——私有仓库下市场条目合进去也装不上。转公开是不可逆的信息披露动作，需用户明确授权（A 公开并投稿 / B 保持私有不投稿 / C 先公开后决定）。详见 `docs/MARKET-SUBMISSION.md` |
| **M8** | 状态回填 | ✅ **完成并已推送** | 组织 `BACKLOG.md` 两处（第 73 行主表、第 199 行 W5 表）改为「v0.1.0 已发布（tag + Release 附 tgz），M0–M7 完成、本机已装待重启验收」；顺带把「当前已启动」口径改成**实查数字**：远端 24 个 `*-workbench` + 3 个仅本地（胆道癌/软组织肉瘤/跨病种心理支持）。rebase 到 `origin/main` 后推送 `097dbc0` | `~/Downloads/.github` `git log 097dbc0`；`gh repo list` 实查 24 |
| **M9** | 回流 | ✅ **完成（1.5.2 追加三条）** | 头颈癌这轮又回流三条，都做成了**随 init 下发的可执行件**而不是散文：①`project-template/scripts/serve-artifact.mjs`——对**装机副本**起服务；②`project-template/scripts/verify-tabs-on-artifact.py`——真 Chrome 逐个点开所有页签，判据含空态与窄屏；③`project-template/test/pack-contents.test.mjs`——以 `npm pack` 真实清单为对象、自适应跳过未长出目录。manifest 加 `probe:artifact`/`probe:tabs`，`check-starter` 必备清单加三件（starter `51348a8`，1.5.2，实测新项目 154 文件、`npm test` 4/4）。前次两条教训回流成脚手架 1.5.1 的可执行闸门：①**规则⑨**——运行期按拼出来的路径读目录必须随包发出（⑥ 管 import、⑦ 管 public，这一类是盲区）；②**`templates/test-pack-contents.test.mjs`**——以 `npm pack` 真实清单为对象断言，自适应跳过项目还没有的目录，生成项目自带 `test` 脚本且 `release:check` 串上 test。另写 LESSONS 第 9 类「判断闸门覆盖率要看机制不要看症状」 | starter commit `7d5bbdd`；`npm test` 37/37；新生成项目 `npm run check` 退出 0、`npm test` 4/4 |

**一句话现状**：M0–M3、G2、G3、M5、M6、M7、M8、M9 的**代码、打包、发布与回流**都已落地；M5/M6 停在 🔵，因为「装进 Desktop 后界面真的能用」必须由用户在重启后的真机上确认——Agent 自测不等于装机可用。M4 不适用。**M7 已发布到 0.1.4**（远端仓 + tag + Release 附 tgz，装机副本与 tgz 0 差异），**市场投稿材料已备齐但被「仓库私有」卡住**，需用户授权公开；**M8 已回填并推送**；**M9 已回流到脚手架 1.5.4/1.5.5**（宿主合同闸门 + 参考图不再随包）。

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

## 四、M5 缺口的关闭情况（原 25/30 → 现 31/33）

M5 开工前的三项代码欠账已全部关闭：`lib/version.js`（构建注入版本）、`lib/layout.js`（面板参数唯一来源，含 `customFrame: true`、`businessSide`）、写入闭环（`dsh/store.js` + `dsh/server.js` + `public/live.js`）。`lib/client.js` 同时从骨架的 health 状态卡重写成 customFrame 外壳（三段式顶栏 + 业务 iframe + 右侧原生会话 + 可拖分隔边 + 窄屏抽屉 + 8 秒兜底重试 + 只填草稿不发送）。

新增 `scripts/check-client-constants.mjs`：把 `lib/client.js` 里的宽度/区间/阈值字面量与 `lib/layout.js` 对账。两边各写一份、改一处忘一处，表现是「顶栏说有 AI 按钮、面板其实没开」这种只能靠肉眼发现的错，所以用命令锁住。

**打包时发现并修掉的两个真 bug**（不修则装进去是空壳）：
1. `package.json` 的 `files` 缺 `public/` → tgz 里没有 UI，装机后 `/ui/` 全 404。
2. `files` 缺 `schema/migrations/` → `dsh/store.js` 运行时按目录读迁移 SQL，装进去一张表都建不出来。
两个都靠 `npm pack --dry-run` 的实际清单发现，不是靠读代码猜。

**2 项待人工**：`data/冻结合同`（conformance 找 `schema/freeze-contract.md`，本项目冻结记录写在迁移文件头部与本节，未单独建文件）、`ui/原型基线`（无 `prototypes/v0.2`，v0.1 即 G2 确认版）。

## 五、状态更新规则

1. 每次状态变化，改**本文件**的表格，再改 `docs/TASKS.md` 与 `docs/PROTOTYPE-REVIEW.md`。
2. 状态从 ⬜ → 🔵 需要「已执行」的证据（命令输出、截图）；从 🔵 → ✅ 需要**用户原话**。
3. `push` / `tag` / 装进 Desktop / 市场上架是**四件事**，不能互相代替。
4. 未观察到的状态写「未验证」，不写「应该没问题」。
