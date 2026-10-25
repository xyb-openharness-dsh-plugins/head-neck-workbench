# 发布与回滚记录

版本/tag/commit：**0.1.5**（`package.json` / `VERSION` / `lib/client.js` 的 `VERSION` / 原型 `.vchip` 四处同源，`check-version.mjs` 通过）／ **tag `v0.1.5` 已推送** ／ Release https://github.com/xyb-openharness-dsh-plugins/head-neck-workbench/releases/tag/v0.1.5 （资产 **3,013,558 字节**，与本地 tgz 一致）。历史 `v0.1.0`（`b610a578…`）、`v0.1.1`（`a2f687d6…`）、`v0.1.2`（`4ea88d34…`）、`v0.1.3`（`eb8209e1…`）、`v0.1.4`（`d8ffb85b…`）的 tag 与 Release 均保留。**0.1.0–0.1.2 装进 Desktop 会激活失败**（businessWidth 0.72 超宿主上限 0.7），0.1.3 起已修，勿再安装前三个版本。
变更的功能 ID：M5 读写闭环、M6 装机、M7 发布（见 `docs/DEV-PLAN.md` 与 `docs/PARITY.csv` P-00…P-20）
用户授权范围：**到 M9**（用户原话 m05978「G2确认，继续完成开发到M9」）。据此完成 M7 中**可撤回**的部分（建私有仓、push、tag、Release）；**市场投稿仍未做**——那是对外公开且不可撤回的动作，等用户显式点头。

家族一致性：`npm run audit` → **31/33 通过 · 0 失败 · 2 待人工**（`schema/freeze-contract.md` 未单独建文件；无 `prototypes/v0.2`，v0.1 即 G2 确认版）。**0 失败，可发布**；2 条 warn 结论见 `docs/ACCEPTANCE.md` ACC-00。
源码检查：`npm run check` 退出码 0（`staticPass: true`、文案红线 64 文件 0 违规、`build-public --check` 同步、schema 24/24、原型 24/24、单测 10/10）
包检查/大小/hash：`release/xyb-community-head-neck-workbench-0.1.5.tgz` ／ **2.87 MB（3,013,558 字节）**（其中 `assets/reference/ctcae/CTCAE_v5.0_Quick_Reference_5x7.pdf` 2.99 MB，按 AGENTS.md 标准原文必须随包分发）／ SHA-256 **`729099bb51191c09664858819da23209ea5e90a8f0fce75ea73f99de96f5bf2a`** ／ 24 文件
实机证据：装机副本探针 `/health` 200、`/ui/` 200（68982 字节）、`/ui/live.js` 200、`/bootstrap` 200，46 表建成；`scripts/verify-live.py` 真 Chrome **8/8**。**Desktop 界面加载未验证**（需用户重启）。
README/许可证/素材来源/运行依赖/更新说明：`README.md` / `NOTICE.md` 已随包；`UNLICENSED`；素材为 CTCAE v5.0 官方 Quick Reference（随包分发一份，符合 `docs/23-METRIC-GRADING-AND-ALERTS.md`）
演示数据清单已清理或明确示例环境：演示数据**明确标注**——`live.js` 在界面顶部插横幅「演示数据 · 内容为虚构示例，不是真实病例。v0.1.0-dev」；导出 Markdown 也标注演示数据
数据库迁移与旧包兼容：`schema/migrations/0001_initial.sql`（冻结，只增不改）；`dsh/store.js` 按目录递增迁移并写 `schema_migrations`；**首次安装无旧库**，向后兼容从 0002 起算
可用备份：安装前已备份 profile 清单到 `/tmp/hn-profile-package.json.bak`

**重装注意**：profile 的 `packageManager` 是 `pnpm@10.34.5`，而 `which pnpm` 可能指向 9.x（会报 store 主版本不匹配）。用 `~/.nvm/versions/node/v22.19.0/bin/pnpm`。同名同版本 tgz 换了内容时 pnpm 会说 `Already up to date`，必须 `pnpm remove -w <pkg>` 再 `add` 才会真正替换。
市场分发来源：**不投稿**（未授权）——手工 tgz 安装，市场目录无条目

若任务要求本机更新：最终已安装版本 **0.1.5** ／ Profile `~/Library/Application Support/dsh-desktop/harness/profiles/web` ／ 装机副本与 tgz `diff -r` **0 差异** ／ `dsh.profile.bundles` **34 项含本包** ／ **打开确认本次修改：未验证（需重启）**。仅安装了包并登记 bundles，未重启 Harness，因此**不能声称界面已加载**。

**装机失败史（必读）**：0.1.0–0.1.2 装进去会让 DSH Desktop 起不来——渲染进程报 `web boot: 1 entry did not activate`，`plugin-recovery` 自动卸载后才恢复（harness.log 2026-10-24T23:58:41Z）。根因是 `businessWidth=0.72` 超出宿主 `register()` 的 `[0.25, 0.7]` 硬区间。0.1.3 已改为 0.68 并新增 `scripts/check-host-contract.mjs` 把宿主 7 条校验接进 `npm run check`。

| 动作 | 目标 | 真实结果/URL/证据 | 状态 |
| --- | --- | --- | --- |
| 本地安装 | Desktop/profile | `pnpm add -w` 装入 `profiles/web`，并写入 `dsh.profile.bundles`（34 项，改前改后一致）；`check-install.mjs` ✓；装机副本 `diff -r` 与 tgz **0 差异**；`probe:restart` **PASS**；`probe:routes` **PASS**（7 组路由） | **已执行，界面待重启验收** |
| Git push | `xyb-openharness-dsh-plugins/head-neck-workbench`（**私有**）/ `main` | 已推；默认分支 `main`（原 `master` 已改名并删远端旧分支） | **已完成** |
| Release/npm | tag `v0.1.2` + Release 附件 tgz | https://github.com/xyb-openharness-dsh-plugins/head-neck-workbench/releases/tag/v0.1.2 ／ 附件 3,534,991 字节 ／ SHA-256 `4ea88d34…` | **已完成** |
| 市场 PR | `dataelement/awesome-dsh-workbench` | — | **未执行（需用户授权）** |
| 上架 | 公开 catalog | — | 不适用 |

市场状态说明：GitHub Release 不会自动成为市场安装来源。本项目**没有**市场目录条目，也未提交 PR，因此不涉及「来源切换」。**不得把「本机已装」称为「已上架」。**

回滚步骤/数据兼容检查/已知限制：
- 回滚包：`pnpm --dir <profile> remove @xyb-community/head-neck-workbench` 并从 `dsh.profile.bundles` 删除该行，重启 Harness。
- 数据兼容：卸载**不删除**业务数据（默认落在 `dshHomePath('head-neck-workbench')` 下的 SQLite 文件）；源码回滚与数据库回滚分开判断，不以清库恢复版本。
- 已知限制：① MinerU 报告解析未接（`docs/18-MINERU-PARSING.md` 只留接口，DESIGN-07 严格停 phase1 的延续）；② 无市场条目，Desktop 市场列表里不会显示「已安装」；③ 有私有远端仓与 Release，但**市场无条目**，不能对外说「已上架」。

## 市场投稿就绪核查（只读，未提交）

按 `docs/10-MARKET-PUBLISHING.md` 第 1 节对**真实 tgz 解包后**逐条查（`tar -xzf` 到临时目录再扫，不查源码树——源码树里有 docs、测试、node_modules，结论不能代表用户拿到的东西）：

| 判据 | 实测 | 结论 |
| --- | --- | --- |
| 包体积 ≤ 8 MiB | 3.37 MiB（27 文件） | ✅ |
| 无个人绝对路径 | `grep -rl "/Users/qinxiaoqiang"` → 0 命中 | ✅ |
| 无数据库文件 | 无 `*.db` / `*.sqlite*` | ✅ |
| 无有效密钥 | `ghp_` / `sk-` / `AKIA` / `BEGIN PRIVATE KEY` / `xox[baprs]-` → 0 命中 | ✅ |
| 无患者个人信息 | 手机号/身份证正则 → 0 命中 | ✅ |
| 素材可公开再分发 | `assets/brand/xyb-logo.png` 的 `manifest.json` **license 字段为空**，而 `assets/README.md` 自己写着「未查到独立素材许可，**不得把本机存在视为已取得公开再分发授权**」 | ❌ **投稿前必须由权利人确认或换掉** |
| 素材来源可追溯 | `assets/manifest.json` 逐条登记 source/purpose/licenseStatus。logo 与膀胱癌/黑色素瘤/甲状腺/胶质瘤**同一文件**（sha256 `e7bf8431…`，124177 字节），`licenseStatus` 写的是 `owner permission must be confirmed before public redistribution`——**这是家族级既有状态，不是本仓新引入的空缺**（我 0.1.2 轮曾误判为「license 为空」，实际字段名是 `licenseStatus`，不是缺字段） | 通过（状态如实，非阻塞） |
| 他癌种参考图不再随包 | `assets/reference/metric-trends/{breast-records,lymphoma-metrics}.png`（1.1 MB）**已移到 `docs/assets/metric-trends/`**——它们只被 `docs/24` 引用、零运行时代码引用，放 `assets/` 会被 `files` 打进患者机器，且与本品无关。0.1.4 起不再随包 | 已修 |

两条待办（都要用户裁定，本轮未擅自改包）：

1. **Logo 授权**：`xyb-logo.png` 是社区品牌参考副本，`license` 为空。公开投稿前必须取得授权或替换为可分发素材。这不是技术问题，我不能自己判定。
2. **1.1 MB 无人引用的他癌种参考图**：`assets/reference/metric-trends/` 两张 PNG 只被不随包分发的 docs 引用。若确认不投稿也不影响使用，可在下次版本把 `package.json` 的 `files` 从 `"assets"` 改成显式子路径（`assets/brand`、`assets/icons`、`assets/reference/ctcae`、`assets/tokens.css`、`assets/tokens.json`、`assets/manifest.json`、`assets/README.md`）——**仍未做**。0.1.1 已发布（修的是导出时间格式与页签崩溃），**没有**夹带这条改动：改 `files` 会改变包内容，而同名同版本换内容正是「`Already up to date` 不等于内容最新」那条教训的反面。要做得发 0.1.2，并且先确认那两张图确实不再需要随包（它们是 `docs/24-METRIC-TREND-TAB-DESIGN.md` 的配图，源码仓里应保留）。

官方指南复核日期/来源：本地离线副本 `reference/official/market-acceptance-captured-2026-10-16.md`（投稿前仍需按指南要求核官网当前版本）。最终安装来源：本地 tgz（市场目录无条目）。用户确认的项目与执行者：**未投稿，不适用**。PR URL/检查结果：**不适用**。市场目录可见与可安装证据：**不适用**。**不把 Git push 当市场发布。**
