# 市场投稿材料与阻塞点

M7 的投稿对象是 `dataelement/awesome-dsh-workbench`（工作台市场目录），不是插件目录。
本文件记录**已准备好的东西**与**卡在哪一步**，不声明已投稿。

## 1. 市场现状（2026-10-25 实测）

| 检查 | 结果 |
| --- | --- |
| 市场目录条目数 | **20** |
| 是否已有 head-neck 条目 | **无**（`data/workbenches/` 下无 `*head-neck*`） |
| 是否有历史/开放 PR | **无**（`gh pr list --search head-neck --state all` 返回 `[]`） |
| 是否会重复投稿 | 不会，本次是首次收录 |

## 2. 已准备好的材料

- **YAML 草稿**：[`market/samqin123__head-neck-workbench.yml`](../market/samqin123__head-neck-workbench.yml)
  按官方目录协议字段：`url` / `workbenchId` / `name` / `nameEn` / `category` / `description.{zh,en}` /
  `screenshots[]` / `tarball`。安装来源选 **GitHub Release tarball**（协议优先级 npm → Release → 源码）。
- **截图 12 张**：[`docs/screenshots/`](screenshots/)，从**已安装的 0.1.4 产物**（不是源码树）用真 Chrome
  在 1440×900 拍下：10 个一级页各一张 + 指标卡翻转态 + 一图秀，JPEG quality 78，合计 908KB。
  画面里带 `v0.1.4` 版本 chip，与市场条目版本一致。
- **包合规自检**（针对 `release/*-0.1.4.tgz` 解包后逐条扫）：

| 判据 | 结果 |
| --- | --- |
| 包体积 < 8 MiB | **2.87 MiB**，通过 |
| 无个人绝对路径（`/Users/<name>`） | 0 处命中，通过 |
| 无有效密钥（`sk-*`/`ghp_*`/`AKIA*`/私钥头） | 0 处命中，通过 |
| 包内版本 = tag = Release 资产 | 0.1.4 / `v0.1.4` / 3,013,532 字节，三者一致 |
| Release 资产 SHA-256 与本地 tgz 一致 | `d8ffb85b4fc93f105da5c5f6c028df37a9b47cf62287ddda53a8c17a29284c38` |

## 3. 阻塞点：仓库是私有的

```
gh repo view xyb-openharness-dsh-plugins/head-neck-workbench --json visibility
→ {"isPrivate":true,"visibility":"PRIVATE"}

curl -sIL .../releases/download/v0.1.4/xyb-community-head-neck-workbench-0.1.4.tgz
→ 404
```

市场条目里的 `screenshots[]` 用 `raw.githubusercontent.com` 公网地址、`tarball` 用 Release 下载地址，
**两者在私有仓库下匿名都取不到**（截图 404、tarball 404）。所以投稿前必须先让仓库公开，
否则条目合进去也是个下载不了的条目。

把仓库改公开是**不可逆的信息披露动作**（历史提交、Issue 讨论、所有截图一并公开），
且属于用户身份的对外发布，需要明确授权：

- 选项 A：仓库转公开 → 提交市场 PR（我会用真实 PR URL 与 `gh pr checks` 回读状态）
- 选项 B：保持私有 → 市场投稿不做，M7 记为「代码/包/Release 已就绪，投稿因仓库私有不做」
- 选项 C：先只把仓库公开但不投稿，等界面验收（M6）通过再决定

## 4. 若走 A，投稿前还差的两步

1. **界面验收**：M6 的「装进 Desktop 后界面真的能用」仍待用户重启确认。官方要求条目对应真实可安装版本，
   未完成宿主验收时应在 PR 描述里写明「包已安装、运行界面待确认」，不能写成已验收。
2. **截图需换成公开可访问地址**：YAML 里的 5 张 raw 链接要等仓库公开后实测返回 200 才能算数
   （现在必然 404，本文件不假装它们可用）。

## 5. PR 描述要点（起草，未提交）

- 来源：GitHub Release `v0.1.4`，包名 `@xyb-community/head-neck-workbench`，commit `c33e739`
- 平台：macOS（DSH Desktop，profile `web`），已本机安装、`diff -r` 0 差异
- 手工确认：**待用户重启后确认**（当前只有自动检查与产物级探针证据）
- 自动检查：`npm run check` 全绿、34 二级页签在产物上全开、差异度审计 0 模板化、
  重启持久化与 7 组路由探针 PASS
- 已知限制：临床试验页不适用（无登记库）；6 条临床提示标「未核实」（原始文献未取得）
