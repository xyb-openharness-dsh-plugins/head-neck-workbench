# 发布与回滚记录

版本/tag/commit：**0.1.0**（`package.json` / `lib/client.js` 的 `VERSION` / 原型 `.vchip` 三处同源，`check-version.mjs` 通过）／ **tag 未打**（M7 未授权）／ commit `bb294a8`（M5/M6）
变更的功能 ID：M5 读写闭环、M6 装机（见 `docs/DEV-PLAN.md` 与 `docs/PARITY.csv` P-00…P-20）
用户授权范围：**到 M9**（用户原话 m05978「G2确认，继续完成开发到M9」）。**未授权**：Git push、GitHub Release、市场投稿、打 tag。

家族一致性：`npm run audit` → **31/33 通过 · 0 失败 · 2 待人工**（`schema/freeze-contract.md` 未单独建文件；无 `prototypes/v0.2`，v0.1 即 G2 确认版）。**0 失败，可发布**；2 条 warn 结论见 `docs/ACCEPTANCE.md` ACC-00。
源码检查：`npm run check` 退出码 0（`staticPass: true`、文案红线 64 文件 0 违规、`build-public --check` 同步、schema 24/24、原型 24/24、单测 10/10）
包检查/大小/hash：`release/xyb-community-head-neck-workbench-0.1.0.tgz` ／ **3.53 MB（3,534,204 字节）**（其中 `assets/reference/ctcae/CTCAE_v5.0_Quick_Reference_5x7.pdf` 2.99 MB，按 AGENTS.md 标准原文必须随包分发）／ SHA-256 **`cbe0079808098ffb202c9d846c677c24b64e9a611c7fd21ac21ec7fcafd0f0ed`** ／ 27 文件
实机证据：装机副本探针 `/health` 200、`/ui/` 200（68982 字节）、`/ui/live.js` 200、`/bootstrap` 200，46 表建成；`scripts/verify-live.py` 真 Chrome **8/8**。**Desktop 界面加载未验证**（需用户重启）。
README/许可证/素材来源/运行依赖/更新说明：`README.md` / `NOTICE.md` 已随包；`UNLICENSED`；素材为 CTCAE v5.0 官方 Quick Reference（随包分发一份，符合 `docs/23-METRIC-GRADING-AND-ALERTS.md`）
演示数据清单已清理或明确示例环境：演示数据**明确标注**——`live.js` 在界面顶部插横幅「演示数据 · 内容为虚构示例，不是真实病例。v0.1.0-dev」；导出 Markdown 也标注演示数据
数据库迁移与旧包兼容：`schema/migrations/0001_initial.sql`（冻结，只增不改）；`dsh/store.js` 按目录递增迁移并写 `schema_migrations`；**首次安装无旧库**，向后兼容从 0002 起算
可用备份：安装前已备份 profile 清单到 `/tmp/hn-profile-package.json.bak`

**重装注意**：profile 的 `packageManager` 是 `pnpm@10.34.5`，而 `which pnpm` 可能指向 9.x（会报 store 主版本不匹配）。用 `~/.nvm/versions/node/v22.19.0/bin/pnpm`。同名同版本 tgz 换了内容时 pnpm 会说 `Already up to date`，必须 `pnpm remove -w <pkg>` 再 `add` 才会真正替换。
市场分发来源：**不投稿**（未授权）——手工 tgz 安装，市场目录无条目

若任务要求本机更新：最终已安装版本 **0.1.0** ／ Profile `~/Library/Application Support/dsh-desktop/harness/profiles/web` ／ **打开确认本次修改：未验证（需重启）**。仅安装了包并登记 bundles，未重启 Harness，因此**不能声称界面已加载**。

| 动作 | 目标 | 真实结果/URL/证据 | 状态 |
| --- | --- | --- | --- |
| 本地安装 | Desktop/profile | `pnpm add -w` 装入 `profiles/web`，并写入 `dsh.profile.bundles`（34 项，改前改后一致）；`check-install.mjs` ✓；装机副本 `diff -r` 与 tgz **0 差异**；`probe:restart` **PASS**；`probe:routes` **PASS**（7 组路由） | **已执行，界面待重启验收** |
| Git push | 远端/分支/commit | **无 remote**（`git remote -v` 为空），远端仓未建 | 未执行（未授权） |
| Release/npm | tag/产物/hash | tgz 已产出，SHA-256 `cbe00798…`；未打 tag、未建 Release | 未执行（未授权） |
| 市场 PR | 官方目录仓库 | — | 未执行（未授权） |
| 上架 | 公开 catalog | — | 不适用 |

市场状态说明：GitHub Release 不会自动成为市场安装来源。本项目**没有**市场目录条目，也未提交 PR，因此不涉及「来源切换」。**不得把「本机已装」称为「已上架」。**

回滚步骤/数据兼容检查/已知限制：
- 回滚包：`pnpm --dir <profile> remove @xyb-community/head-neck-workbench` 并从 `dsh.profile.bundles` 删除该行，重启 Harness。
- 数据兼容：卸载**不删除**业务数据（默认落在 `dshHomePath('head-neck-workbench')` 下的 SQLite 文件）；源码回滚与数据库回滚分开判断，不以清库恢复版本。
- 已知限制：① MinerU 报告解析未接（`docs/18-MINERU-PARSING.md` 只留接口，DESIGN-07 严格停 phase1 的延续）；② 无市场条目，Desktop 市场列表里不会显示「已安装」；③ 无远端仓，因此没有可分享的安装来源。

工作台市场发布另按 docs/10-MARKET-PUBLISHING.md 执行，附 templates/MARKET-ACCEPTANCE.md 的指定版本手工确认。官方指南复核日期/来源：**未复核**（未进入 M7）。最终安装来源：本地 tgz。用户确认的项目与执行者：**未投稿，不适用**。PR URL/最新提交检查实际执行结果：**不适用**。市场目录可见与可安装证据：**不适用**。未授权投稿，标不适用，不把 Git push 当市场发布。
