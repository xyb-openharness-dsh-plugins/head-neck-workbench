/**
 * 生成物 —— 与 VERSION / package.json 同源。
 *
 * 不要手改这个文件里的版本号：改 `VERSION`（以及 package.json）后运行
 * `node scripts/check-version.mjs`，它会同时校验 package.json、原型顶栏
 * `.vchip` 与本文件三处一致。
 *
 * 客户端为什么需要它：面板顶栏的版本 chip 必须与装机后的包版本同源，
 * 不能写死在 HTML 或 CSS 里，否则发版后会显示旧版本。
 */
export const version = '0.1.7'

/** 读模型/API 的版本号。破坏性变更时才递增，与包版本解耦。 */
export const apiVersion = 'v1'
