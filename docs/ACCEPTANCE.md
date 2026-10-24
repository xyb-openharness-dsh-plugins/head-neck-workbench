# 验收记录

代码版本/commit/dirty 状态：`5f720dd`（M5a）+ 本轮未提交改动（M5b–M5d 新增 `dsh/store.js`、`dsh/server.js`、`dsh/seed-demo.js`、`public/`、`schema/migrations/`、`lib/client.js` 重写）
包名称/版本/tgz/SHA-256：`@xyb-community/head-neck-workbench` 0.1.0 ／ `release/xyb-community-head-neck-workbench-0.1.0.tgz` ／ `5207dd1eaeb0764f6215eebe81a1fdd57674cb45c03c5f03ec48be9015b1f001`（27 文件，含 `public/` 与 `schema/migrations/`）
Desktop 版本/OS/架构/Node：DSH Desktop（`/Applications/DeepSeek Harness.app`）／ macOS／ arm64／ Node **v22.19.0**（`node:sqlite` 可用）
安装入口/实际 profile/执行位置：`pnpm add -w` 到 `~/Library/Application Support/dsh-desktop/harness/profiles/web`，并写入该 profile 的 `dsh.profile.bundles`
Agent 是否运行在目标 Desktop 内：**是**——所以本 Agent 不自行关闭/重启该应用，重启与真机界面验收交由用户完成

| ID | 层级 | 操作和预期 | 真实结果 | 证据文件/命令 | 通过/失败/未验证/不适用 |
| --- | --- | --- | --- | --- | --- |
| ACC-00 | 静态 | `dsh-wb-cli audit` 无 fail；warn 逐条给结论 | `check-workbench-package` → `staticPass: true`、`errors: []`；3 条 warn 已逐条归因（见下） | `npm run check` | 通过 |
| ACC-01 | 静态 | 语法/类型/包合同/清单 | `node --check` 通过（`dsh/index.js`、`lib/client.js`）；`check-version` 三处同源 0.1.0；`check-wording` 64 文件 0 违规；`build-public --check` 同步；单测 6/6；conformance 31/33（0 失败 · 2 待人工） | `npm run check` 退出码 0 | 通过 |
| ACC-02 | 集成 | 代表业务链与迁移/主体隔离 | 空库启动 → 自动迁移 **46 表** → `/seed` 写入演示主体（8 指标 / 56 观察）→ PATCH 关切后 sqlite3 直查落盘（`cn-1\|1`）→ `change_log` 3 条；`/bootstrap?subject=` 按主体隔离返回 | `scripts/verify-live.py` 8/8；`node /tmp/hn-installed-probe2.mjs` | 通过 |
| ACC-03 | 包 | 从实际 tgz 安装，版本/hash 一致 | tgz SHA-256 `5207dd1e…`；装机副本 `package.json` 版本 0.1.0；`check-install.mjs` → ✓ 已登记到 Desktop 实际加载的 profile | `node scripts/check-install.mjs` | 通过 |
| ACC-04 | UI | 已安装列表→左侧入口→业务页 | **未验证**：需用户完整退出并重开 Desktop 后才有界面 | — | 未验证（需重启） |
| ACC-05 | UI | 无会话可用，所选布局和原生会话 | **未验证**：同上；外壳代码已就位（`customFrame: true`、`businessWidth: 0.72`） | `lib/client.js` | 未验证（需重启） |
| ACC-06 | UI | 一级/二级页与配置弹窗逐项对照 | 业务页部分**已通过**：原型 10 一级 / 34 二级全渲、无 undefined/NaN、鼻咽档案 33 二级且「手术」隐藏、「放疗」置首；装机后的界面**未验证** | `verify_prototype.py` 24/24 | 部分通过（界面待重启） |
| ACC-07 | UI | 窄容器/大字/翻面/趋势/键盘 | 原型层通过：390 宽无横向溢出、指标卡固定高 276、翻面 `aria-pressed` 单卡布尔、一图秀 C1–C12 实测；装机界面**未验证** | `verify-live.py` 判据 5；`measure-one-chart.py` | 部分通过（界面待重启） |
| ACC-08 | 跨页 | 单一事实新增后各页一致 | 通过：新增关切后首页未问数、关切清单、复诊摘要同源（`verify-live.py` 判据 3 + 判据 4 写回后回拉） | `scripts/verify-live.py` | 通过 |
| ACC-09 | 文件 | 预览/解析/确认/导出真实格式/回顾 | 导出**通过**（`/export?format=md` 生成中文 Markdown）；报告解析**未接通**（`docs/18-MINERU-PARSING.md` 本轮只留接口，DESIGN-07 严格停 phase1 的延续） | `dsh/server.js` `exportMarkdown()` | 部分通过（解析未做） |
| ACC-10 | 外部 | API/MCP/cron 实际链路与失败恢复 | **不适用**：本项目无外部 API/MCP/cron 依赖（M4 试验库不适用，见 `docs/DEV-PLAN.md` §三） | — | 不适用 |

**ACC-00 三条 warn 的结论**：
1. 「Review service caller context and unavailable ownership」→ `lib/client.js` 已按官方 `currentSession()`/`ownsSession()` 双路判定实现，不猜接口；真机才能最终确认。
2. 「UI 挂在子路径且页面使用相对资源引用」→ 已修：`/ui` 无尾斜杠时 302 到 `/ui/`，`rel` 为空串时回退 `index.html`；装机副本探针 `/ui/` 200（68982 字节）、`/ui/live.js` 200。
3. 「Peer ranges / 实际 tgz 内容 / Desktop UI 需单独验证」→ tgz 内容已用 `npm pack --dry-run` 逐项核对（并因此发现 `public/` 与 `schema/migrations/` 漏打包，已修）；Desktop UI 待重启验收。

限制/失败/需要用户完成的重启步骤：**M5/M6 的界面验收被重启阻塞**。请完整退出 DSH Desktop（⌘Q，不是关窗口）再重开，左侧工作台列表应出现「小言宝 · VoicePal 头颈癌工作台」，点进去应看到顶栏品牌+`v0.1.0`+「AI 对话」按钮，中间是业务页，点「AI 对话」右侧出现原生会话且中间分隔边可拖。

## 设计与混合数据补充

| ID | 操作与预期 | 结果/证据 | 状态 |
| --- | --- | --- | --- |
| ACC-11 | UI 确认版本与实际实现对应；关键流程、容器尺寸、异常状态有预览 | 原型 SHA-256 `75deabb7…` 与 `public/index.html` 同源（`build-public --check` 同步）；`_shots/` 12 张 | 通过 |
| ACC-12 | 重启恢复记录；首页/详情/导出/Agent 快照一致 | **打包产物级已验**：解 tgz 到 `/tmp/hn-tgz-probe`，`openStore()` 建 46 表 → `seedIfEmpty()` 灌 8 指标/56 观察 → `insert('concerns')` 写一条 → 关闭连接 → 同一 DB 路径重新 `openStore()` → 关切数 3→4 且能读到刚写那条 → **PASS 重启不丢数据**。顺带证实约束在生效：写入 `kind:'private'` 被 CHECK 拒绝（`kind IN ('担心','要问的问题','生活困难','其他')`）。原型层另有 `verify-live.py` 判据 4 | `node /tmp/probe-restart.mjs` | 通过 |
| ACC-13 | 纠正/删除后旧摘要和缓存失效，主体与工作区隔离 | 删除走 `DELETE /entities/:table/:id`；`/bootstrap?subject=` 按主体取数；无缓存层 | 通过 |
| ACC-14 | 可选记忆服务离线/同步失败仍能操作业务；恢复后幂等追平 | **不适用**：未启用可选记忆服务 | 不适用 |
| ACC-15 | 资料目录/会话双状态独立；无会话、目录故障、owner异常、映射未保存均不显示假绿灯 | 外壳区分「业务页是否加载」（8 秒兜底）与「会话是否就绪」（`hasConversation` + `connecting`）两套状态，不合并成一个绿灯 | 通过（代码层，真机待验） |
| ACC-16 | 快速切换丢弃旧状态，重启重新核验；窄面板/大字下状态可读且不遮公共入口 | `desktopWorkbenches.subscribe` 清空 note；宽度存 `localStorage` 且 `clampWidth` 兜住非法值；窄屏走抽屉不压业务区 | 通过（代码层） |
| ACC-17 | 主任务常显、辅助配置可展开、💡教学可发现；错误不隐藏，关闭/展开不丢输入 | 原型渐进披露；外壳 note 用 `role="status"` 常显；会话面板隐藏只切 `display` 不卸载（输入不丢） | 通过 |
| ACC-18 | 外部字段来源/时效/适用性可追溯；获取失败、过期、冲突不被展示或导出为确定事实 | **部分通过**：`source_refs` 表在 schema 与 `bootstrap` 中都在（可追溯的结构有了）；CTCAE 分级标「对照不是诊断 · 版本 · 区间 · 免责」；**但医学断言的内联来源全文只有 1 处**（`src()` 在 `index.html:540` 定义、仅 `1190` 调用一次）→ 即 **GAP-1**，G2 签认时已记录，尚未补齐 | `grep -c 'src('` = 1 | 部分通过（GAP-1 未清） |
| ACC-19 | 长列表滚到中段/底部后标题与关闭仍可见，工具/提交按需固定；窄窗/大字可操作、选择保留、可从底部关闭并恢复焦点 | **不适用（本轮）**：原型**没有弹窗**——全仓无 `role="dialog"`、无 `aria-modal`、无 Escape 监听、无遮罩层（3 处 `position:fixed` 分别是顶栏、Agent 面板、侧边导航与 toast）。新增关切走**行内表单**（`#cInput` + `#cKind` + 「加一条」，`index.html:1276–1291`），不是弹窗，因此"固定外壳 / 仅内容区滚动 / 从底部关闭"这些判据无对象可验 | `grep -c 'role="dialog"\|aria-modal'` = 0 | 不适用（若 M5 引入弹窗须按固定外壳合同实现并补验） |

未启用可选记忆（ACC-14）标不适用。UI 确认属于设计验收，不替代实际 Desktop 加载与业务验收。

| ID | 操作与预期 | 结果/证据 | 状态 |
| --- | --- | --- | --- |
| ACC-20 | 设置入口可达、目录状态真实、取消无副作用、换目录保护旧资料 | **未验证**：设置页为 `docs/SETTINGS-DESIGN.md` 骨架，本轮未实现 MinerU 设置（DESIGN-07） | 未验证 |
| ACC-21 | 凭据无明文回显；云端按文件授权；本地降级和错误恢复 | **不适用**：无云端凭据、无解析 Token（MinerU 未接） | 不适用 |
| ACC-22 | 临床数据包与患者目录区分，地区/版本/核验状态可见 | **不适用**：M4 试验库不适用，无临床数据包 | 不适用 |
| ACC-23 | 设置草稿保存/取消/失败保持正确，窄窗/键盘可达 | **未验证**：同 ACC-20 | 未验证 |

## 发布范围（仅执行用户明确授权的动作）

| ID | 操作与预期 | 结果/证据 | 状态 |
| --- | --- | --- | --- |
| ACC-24 | 记录本机安装 / Git 推送 / GitHub Release / 市场PR分别完成到哪一步；未授权项为不适用 | 本机安装：**已完成**（profile 已登记）；Git 推送：**未授权**；GitHub Release：**未授权**；市场 PR：**未授权** | 部分完成 |
| ACC-25 | 市场安装来源与条目一致；Release只有在YAML显式tarball时才是所选来源，否则按目录协议使用源码或npm | 手工/native 安装，无市场条目（`check-install.mjs` 已提示「市场里可能不显示已安装」） | 不适用 |
| ACC-26 | 包版本、客户端版本、实际安装副本、tar hash一致；Desktop运行界面加载单独确认 | 包版本 0.1.0 = 客户端 `VERSION` = 装机副本 `package.json`；tar hash `5207dd1e…`；**装机副本与 release tgz 逐文件 `diff -r` 0 差异**；装机副本本体跑 `probe:restart` **PASS**（46 表 → 种子 → 写入 → 重开仍在）；`cordis.patch.yml` 有 `root: !!js dshHomePath('head-neck-workbench')`（真持久目录，非内存库）；profile `package.json` 既在 dependencies（`file:…/release/*.tgz`）又在 `dsh.profile.bundles`；**界面加载仍未验证**（需重启 Desktop；`/api/*` 有全局鉴权，401 无法判断插件是否加载） | `diff -r` + `npm run probe:restart "<装机目录>"` | 部分通过（仅界面加载待验） |
| ACC-27 | 真实市场PR URL、最新检查、合并状态、目录可见和市场可安装分别记录；不得把PR提交称为已上架 | **不适用**：未投稿 | 不适用 |

## DSH 原生 Agent 对话

| ID | 操作和预期 | 结果/证据 | 状态 |
| --- | --- | --- | --- |
| ACC-28 | 全局顶栏 AI 对话入口可发现；状态文案与宿主真实连接状态一致；首次显式点击只创建/复用一个归属正确的原生会话 | 代码层：顶栏按钮五态文案（`AI 对话`/`正在连接…`/`收起 AI 对话`/`打开 AI 对话`/`AI 对话暂不可用`）；`openAgent()` 先 `ensureSession({folder})` 再 `rememberDraft` + `flushDraft`；`hasConversation` 为假才创建（不用 `conversation` prop 判断归属） | 通过（代码层，真机待验） |
| ACC-29 | 隐藏原生面板后可从顶栏重新打开同一会话；页面筛选、表单、滚动位置和原生草稿保留；隐藏不等于结束会话 | 代码层：aside **始终挂载**只切 `display`；收起/打开只改 `paneOpen`，不调关闭接口 | 通过（代码层，真机待验） |
| ACC-30 | 面板宽度按当前宿主形态调整；CustomFrame 鼠标/触控/键盘均可调且受边界约束，split 只使用宿主布局合同；未支持时明确记录限制，不显示假控制 | 代码层：pointer 拖动 + `ArrowLeft/Right/Home/End` 键盘；`clampWidth` 25%–45%；`role="separator"` + `aria-valuemin/max/now`；窄屏不渲染 splitter（不给假控制） | 通过（代码层，真机待验） |
| ACC-31 | 面板开合、调宽、窄窗及重启恢复偏好符合 SPEC；焦点、键盘可达性与主业务区可操作性通过实际验收 | 代码层：宽度存 `localStorage` 并在 `loadWidth` 时 clamp；`ResizeObserver` 观察容器宽度切抽屉 | 通过（代码层，真机待验） |

## 场景验收（S01–S17，对应 docs/SCENARIO-PATHS.md）

> 说明：S 路径的**界面与交互**已在原型层逐条走查（`verify_prototype.py` 24/24 + `verify-live.py` 8/8 覆盖其中的数据来源与写回）；下列「通过」指原型层与读写层已验，「未验证」指需要真机界面或尚未实现的功能。

| ID | 操作与预期 | 结果/证据 | 状态 |
| --- | --- | --- | --- |
| ACC-45 | S01：看板「造口状态」卡 → 气道与造口 › 我的气道；期望写明「唯一呼吸入口、不是伤口」；异常：术式未知显示「不知道」且不阻断 | 原型层：页面文案已写；数据来自 `stoma_care` | 通过（原型层） |
| ACC-46 | S02：看板置顶红条 → 堵管与脱管；期望给出「立刻就医 vs 可等门诊」分界且**不含处置步骤**；异常：不要求先录入即可看到 | 原型层：急救卡常显，不含处置步骤（`check-wording` 禁词 0 违规） | 通过（原型层） |
| ACC-47 | S03：录入置入日期 → 显示距上次 N 天 + 文献均值 115 天（标明均值非预测）；异常：只填月份时显示「仅月份」且不算天数 | 原型层：显示逻辑已实现（EV-04 PMID 42815565，均值 115 天） | 通过（原型层） |
| ACC-48 | S04：记录呛咳（形态/是否咳出）→ 首页出现「近 7 天 N 次」；期望出现沉默性误吸提示；异常：形态选「说不清」仍可保存 | 原型层：`aspirations` 页已实现 | 通过（原型层） |
| ACC-49 | S05：录入放疗结束日期 → 显示「第 N 年」+ 看牙前告知提示；异常：剂量未知留空标「不知道」 | 原型层：`late` 页「放疗后十年」已实现 | 通过（原型层） |
| ACC-50 | S06：录入体重 → 趋势与进食方式同屏；异常：单条记录**不画线**并写「仅一次记录，无法比较」 | 原型层：C2 实测 `paths=0, dots=1`，文案「仅一次记录，无法比较」 | 通过（原型层） |
| ACC-51 | S07：生成急救卡并打印；期望含「不能经口鼻呼吸」「不要只看我的嘴」；异常：联系人不填仍可生成并显示「未填」 | `verify_prototype.py`「急救卡含不能经口鼻呼吸与不要只看我的嘴」PASS | 通过 |
| ACC-52 | S08：照护者清单勾选 → 首页显示本周待办数；期望「本页记录人」与「记录的是谁」是两个独立字段；异常：代录模式不改患者主体 | 原型层：`caregiver` + `tasks` 已实现 | 通过（原型层） |
| ACC-53 | S09：私密感受录入 → **首页无任何变化**，且不进摘要/一图秀/导出；异常：出现自伤念头时给出联系急救/团队，不做危机话术 | 原型层：`viewpoints.is_private DEFAULT 1`（fail-closed）；用户 m05820 确认保留原设计 | 通过（原型层） |
| ACC-54 | S10：新增关切 → 回填「问了没有/医生怎么答」→ 打印复诊摘要；期望首页显示未问问题数；异常：医生未答选「没答上」 | `verify-live.py` 判据 4：点「问过了」→ sqlite3 直查 `c-test-1` 1→0 | 通过 |
| ACC-55 | S11：记录不良反应（症状/起始日/关联方案）；期望只记录不判断因果；异常：不确定时可选「不确定」 | 原型层：`tx › 用药与不良反应` 已实现，文案只记录不判断 | 通过（原型层） |
| ACC-56 | S12：病理原文照录 CPS + 检测方法；期望解释「CPS 可 >100，不等于肿瘤细胞阳性比例」；异常：方法未提及留空标「报告未提及」 | 原型层：EV-07 口径已写入（CPS 可 >100）；用户 m05820 确认该页读完即走、不造「最近变化」 | 通过（原型层） |
| ACC-57 | S13：录入颈清扫分区与副神经 → 三条功能自述；异常：副神经未知留空不推断 | 原型层：`functions` 表三域已实现 | 通过（原型层） |
| ACC-58 | S14：私密社交/外形记录 → 首页无变化且不进 AI 提示词 | 原型层：同 ACC-53；`buildAIPrompt()` 不带私密项 | 通过（原型层） |
| ACC-59 | S15：资料页录入 → 指标卡正面最近值/背面趋势；异常：单位认不出留空不进趋势；换机构/方法拆可比组并断线 | 原型层：`verify_prototype.py`「指标卡固定高度 276」「aria-pressed 翻转」PASS | 通过（原型层） |
| ACC-60 | S16：拖入报告 → 出「待核对草稿」→ 逐项确认才入库；异常：解析失败保留原件与原因，可手工录入 | **未实现**：MinerU 解析按 DESIGN-07 只留接口与设置页骨架，本轮未接 | 未验证（未实现） |
| ACC-61 | S17：录入治疗线（含换线原因原文）→ 旧线标「已结束」不删除；异常：线数不明可选「说不清」 | 原型层：`lines` 页已实现，旧线标已结束不删 | 通过（原型层） |
