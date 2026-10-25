/**
 * 小言宝 · VoicePal 头颈癌工作台 —— 客户端外壳（customFrame）
 *
 * ## 为什么改成 customFrame
 * 0.1.0 骨架用标准分栏（customFrame=false），装进 Desktop 后顶栏没有业务入口、
 * 业务区被拉满、右侧会话不可拖——和 G2 确认过的「中间业务 + 右侧 AI」不是一回事。
 * 改成 customFrame 后宿主把整块画布和**原生会话节点**（`conversation` prop）交给我们：
 *   - 顶栏：左品牌+版本号 / 中一句说明 / 右主操作贴右缘，首个子元素必须是语义 <header>；
 *   - 业务区：iframe 加载 /api/head-neck-workbench/ui/，保持中间主列；
 *   - 会话区：右侧，默认 32%、可拖 25%–45%，带 role="separator" 与 aria-valuenow；
 *   - 窄容器（< 900px）会话改成覆盖式抽屉，不压业务区可操作宽度。
 *
 * ## 视觉 token 不在这里
 * 业务页的配色/字号/圆角全部来自 prototypes/v0.1/tokens.css（G2 确认的视觉合同），
 * 本文件只做外壳，不重复定义一套品牌变量——两处各写一份必然漂移。
 *
 * ## 会话归属（不猜接口）
 * `desktopWorkbenches.currentSession()` / `ownsSession()` 有就用，没有就退回
 * `sessions.list` 快照里找 retainedBy.mainView 的那条。**不能**用 `conversation` prop
 * 判断「已有会话」——它只要面板挂着就为真，ensureSession 永远不会被调用。
 *
 * ## 草稿：只填不发送
 * 开场白与「与 Agent 讨论」的上下文都只调原生 `setDraft`，发送是用户的回车。
 * 草稿先入队并落 localStorage：composer 没就绪就 500ms 后重试，不丢。
 *
 * ## 常量来源
 * 业务区比例、会话区区间、窄屏阈值与 lib/layout.js 同源，由
 * scripts/check-client-constants.mjs 校验字面量一致，防止两处各写一份。
 */
window.__ModuleLoader__.load({
  id: '@xyb-community/head-neck-workbench',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /* ---------------- 常量 ---------------- */

    const metadata = {
      title: '小言宝 · VoicePal 头颈癌工作台',
      panelTitle: '小言宝头颈癌工作台',
      subtitle: '本机数据 · 记录不是诊断',
      description:
        '面向头颈癌患者与家属的本地优先工作台：原发部位决定一切，把手术与放疗的功能代价、气管造口护理、放疗后长期毒性和复诊准备理清楚',
    }

    const API_PREFIX = '/api/head-neck-workbench'
    const UI_ENTRY = '/api/head-neck-workbench/ui/'
    const VERSION = '0.1.2'

    /* ---- 面板参数（与 lib/layout.js 同源） ---- */
    const BUSINESS_SIDE = 'left'
    const BUSINESS_WIDTH = 0.72
    const CUSTOM_FRAME = true
    const AGENT_DEFAULT = 0.32
    const AGENT_MIN = 0.25
    const AGENT_MAX = 0.45
    const AGENT_STEP = 0.02
    const NARROW_BELOW = 900
    const DRAWER_MAX = 420
    const WIDTH_KEY = 'voicepal.head-neck.agent-pane.v1'
    const DRAFT_QUEUE_KEY = 'voicepal.head-neck.initial-drafts.v1'
    const DRAFT_LIMIT = 8000

    const clampWidth = (value) => {
      const n = Number(value)
      if (!Number.isFinite(n)) return AGENT_DEFAULT
      return Math.min(AGENT_MAX, Math.max(AGENT_MIN, n))
    }
    const snapWidth = (value) => clampWidth(Math.round(value / AGENT_STEP) * AGENT_STEP)
    const round4 = (n) => Math.round(n * 10000) / 10000

    function loadWidth() {
      try {
        const saved = JSON.parse(localStorage.getItem(WIDTH_KEY) || 'null')
        return clampWidth(saved && saved.width)
      } catch {
        return AGENT_DEFAULT
      }
    }
    function saveWidth(width) {
      try {
        localStorage.setItem(WIDTH_KEY, JSON.stringify({ width: round4(width) }))
      } catch {
        /* 隐私模式忽略 */
      }
    }

    /* ---------------- 样式（品牌色与业务页同源：深青绿 #22664e / 陶土橙 #b95023） ---------------- */

    const rootStyle = {
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0,
      minWidth: 0,
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      background: '#f7faf8',
      fontFamily: '-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif',
    }
    // 首个子元素必须是语义 <header>：宿主为 macOS 窗口按钮预留 --dsh-frame-leading-clearance。
    const headerStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flex: '0 0 auto',
      flexWrap: 'wrap',
      padding: '6px 12px',
      paddingInlineStart: 'var(--dsh-frame-leading-clearance, 12px)',
      borderBottom: '1px solid #dce7df',
      background: '#f1f6f3',
      fontSize: 12,
    }
    const brandStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      fontWeight: 700,
      color: '#22664e',
      whiteSpace: 'nowrap',
      fontSize: 12.5,
    }
    const verStyle = {
      fontWeight: 500,
      fontSize: 11,
      color: '#6f7d76',
      background: '#e7eeea',
      borderRadius: 999,
      padding: '1px 8px',
      whiteSpace: 'nowrap',
    }
    const hintStyle = { flex: 1, minWidth: 200, color: '#8a978f', fontSize: 11.5 }
    const headerActionsStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      flex: '0 0 auto',
      marginLeft: 'auto',
    }
    const bodyStyle = {
      position: 'relative',
      display: 'flex',
      flex: 1,
      minHeight: 0,
      minWidth: 0,
      overflow: 'hidden',
    }
    const businessStyle = { flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }
    const frameStyle = { flex: '1 1 auto', width: '100%', minHeight: 0, border: 0, display: 'block' }
    const paneStyle = {
      display: 'flex',
      flexDirection: 'column',
      flex: '0 0 auto',
      minWidth: 0,
      minHeight: 0,
      borderLeft: '1px solid #dce7df',
      background: '#fff',
      overflow: 'hidden',
    }
    const drawerStyle = {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      zIndex: 3,
      boxShadow: '-8px 0 24px rgba(34, 102, 78, 0.16)',
    }
    const splitterStyle = {
      flex: '0 0 auto',
      width: 6,
      cursor: 'col-resize',
      background: '#eaf0ec',
      borderLeft: '1px solid #dce7df',
      borderRight: '1px solid #dce7df',
      touchAction: 'none',
    }
    const splitterFocusStyle = { ...splitterStyle, background: '#c3d8cd' }
    const fallbackStyle = { padding: 24, color: '#22664e', fontSize: 14, lineHeight: 1.7 }
    const buttonStyle = {
      border: 0,
      borderRadius: 999,
      padding: '5px 14px',
      whiteSpace: 'nowrap',
      background: '#2f7a5d',
      color: '#fff',
      font: 'inherit',
      fontWeight: 600,
      cursor: 'pointer',
    }
    const ghostStyle = {
      ...buttonStyle,
      background: 'transparent',
      color: '#3f6353',
      border: '1px solid #d8e4dd',
    }
    const padStyle = {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      justifyContent: 'center',
      padding: 20,
      color: '#5b6b63',
      fontSize: 12.5,
      lineHeight: 1.75,
    }
    const noteStyle = { color: '#2f7a5d', fontWeight: 600, maxWidth: 320 }

    function Fallback({ onRetry }) {
      return h(
        'div',
        { style: fallbackStyle },
        h('p', null, `页面没能加载（v${VERSION} · ${UI_ENTRY}）。常见原因是 Harness 刚重启、插件还没加载完。`),
        h('p', null, '本工作台的数据只存在你选择的本机目录里，不会因为这个提示丢失。'),
        h('button', { type: 'button', style: buttonStyle, onClick: onRetry }, '重新加载'),
      )
    }

    /* ---------------- 会话判定（官方 dsh-site-selection 同款） ---------------- */

    let bridge = null
    function currentSession() {
      const service = bridge && bridge.desktopWorkbenches
      if (service && typeof service.currentSession === 'function') return service.currentSession() || null
      const snapshot = bridge && bridge.sessions && bridge.sessions.list && bridge.sessions.list.getSnapshot
        ? bridge.sessions.list.getSnapshot()
        : null
      if (!snapshot) return null
      if (snapshot.current) return snapshot.current
      const byId = snapshot.byId || {}
      return (
        Object.keys(byId).find((id) => ((byId[id] && byId[id].retainedBy && byId[id].retainedBy.mainView) || 0) > 0) ||
        null
      )
    }
    function workbenchOwnsSession(sessionId) {
      if (!sessionId) return false
      const service = bridge && bridge.desktopWorkbenches
      if (service && typeof service.ownsSession === 'function') return service.ownsSession(sessionId)
      return false
    }
    function ownedSession() {
      const id = currentSession()
      return workbenchOwnsSession(id) ? id : null
    }

    /* ---------------- 原生草稿：只填入，不发送 ---------------- */

    function fillDraft(sessionId, prompt) {
      if (!sessionId || ownedSession() !== sessionId) throw new Error('会话已切换，请回到本工作台再操作')
      const actx = bridge.sessions.scope(sessionId)
      const conversation = actx.get('conversation')
      if (!conversation) throw new Error('对话输入不可用')
      const input = conversation.input.for(actx)
      const snapshot = input.state.getSnapshot()
      if ((snapshot.occurrences && snapshot.occurrences.length) || (snapshot.phase && snapshot.phase !== 'plain')) {
        throw new Error('当前草稿含引用或特殊输入，请先在原生会话里处理，再交给小言宝')
      }
      const current = snapshot.draft || ''
      input.setDraft(current.trim() ? `${current}\n\n${prompt}` : prompt)
    }

    let pendingDraft = null
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_QUEUE_KEY) || 'null')
      if (saved && saved.sessionId && saved.prompt) pendingDraft = saved
    } catch {
      /* 隐私模式忽略 */
    }
    function rememberDraft(entry) {
      pendingDraft = entry
      try {
        if (entry) localStorage.setItem(DRAFT_QUEUE_KEY, JSON.stringify(entry))
        else localStorage.removeItem(DRAFT_QUEUE_KEY)
      } catch {
        /* 隐私模式忽略 */
      }
    }
    function flushDraft() {
      if (!pendingDraft) return false
      try {
        fillDraft(pendingDraft.sessionId, pendingDraft.prompt)
        rememberDraft(null)
        return true
      } catch {
        return false
      }
    }

    function onboardingPrompt(dir) {
      return [
        '你正在协助我使用「小言宝 · VoicePal 头颈癌工作台」。它只做本机资料整理，不提供诊疗建议。',
        `资料目录：${dir || '（首次打开时在面板里选择）'}`,
        '里面是我的原发部位与分期、病理与分子检测原文、手术与放疗记录、气管造口护理与耗材、发声与吞咽情况、放疗后长期毒性、复查安排和我想问的问题。',
        '分工：你帮我汇总、找缺漏、把报告里的指标和日期整理成对照表；判断和决定由我和治疗团队做。',
        '我标记为私密的记录不要出现在复诊摘要里，也不要主动带进对话。',
      ].join('\n')
    }

    /* ---------------- 面板 ---------------- */

    function Panel({ conversation }) {
      const [generation, setGeneration] = React.useState(0)
      const [broken, setBroken] = React.useState(false)
      const [note, setNote] = React.useState('')
      const [width, setWidth] = React.useState(loadWidth)
      const [paneOpen, setPaneOpen] = React.useState(true)
      const [connecting, setConnecting] = React.useState(false)
      const [narrow, setNarrow] = React.useState(false)
      const [dragging, setDragging] = React.useState(false)

      const brokenTimer = React.useRef(null)
      const shellRef = React.useRef(null)
      const dragHostRef = React.useRef(null)
      const frameRef = React.useRef(null)

      const hasConversation = Boolean(conversation)
      const canOpenSession = Boolean(bridge && bridge.desktopWorkbenches && typeof bridge.desktopWorkbenches.ensureSession === 'function')

      // 8 秒内没有 onLoad 就当作没起来：宁可给一个能重试的提示，也不留一块白板。
      React.useEffect(() => {
        setBroken(false)
        brokenTimer.current = setTimeout(() => setBroken(true), 8000)
        return () => clearTimeout(brokenTimer.current)
      }, [generation])

      React.useEffect(() => {
        const timer = setInterval(() => {
          if (flushDraft()) setNote('草稿已填入会话，按回车发送')
        }, 500)
        const service = bridge && bridge.desktopWorkbenches
        const unsubscribe = service && service.subscribe ? service.subscribe(() => setNote('')) : null
        return () => {
          clearInterval(timer)
          if (unsubscribe) unsubscribe()
        }
      }, [])

      // 窄屏判定用**容器宽度**而不是窗口宽度（宿主主区宽度 ≠ 窗口宽度）。
      React.useEffect(() => {
        const host = shellRef.current
        if (!host || typeof ResizeObserver !== 'function') return undefined
        const observer = new ResizeObserver((entries) => {
          const w = (entries[0] && entries[0].contentRect && entries[0].contentRect.width) || 0
          setNarrow(w > 0 && w < NARROW_BELOW)
        })
        observer.observe(host)
        return () => observer.disconnect()
      }, [])

      const applyWidth = React.useCallback((next) => {
        const snapped = round4(snapWidth(next))
        setWidth(snapped)
        saveWidth(snapped)
      }, [])

      const stopDrag = React.useCallback(() => {
        dragHostRef.current = null
        setDragging(false)
      }, [])

      React.useEffect(() => {
        if (!dragging) return undefined
        const onMove = (event) => {
          const host = dragHostRef.current
          if (!host) return
          const rect = host.getBoundingClientRect()
          if (!rect.width) return
          // 会话在右侧：指针越靠左，会话越宽
          applyWidth((rect.right - event.clientX) / rect.width)
        }
        document.addEventListener('pointermove', onMove)
        document.addEventListener('pointerup', stopDrag)
        document.addEventListener('pointercancel', stopDrag)
        return () => {
          document.removeEventListener('pointermove', onMove)
          document.removeEventListener('pointerup', stopDrag)
          document.removeEventListener('pointercancel', stopDrag)
        }
      }, [dragging, applyWidth, stopDrag])

      const onSplitterPointerDown = (event) => {
        event.preventDefault()
        dragHostRef.current = shellRef.current
        setDragging(true)
      }

      const onSplitterKeyDown = (event) => {
        const delta = { ArrowLeft: AGENT_STEP, ArrowRight: -AGENT_STEP }[event.key]
        if (delta !== undefined) {
          event.preventDefault()
          applyWidth(width + delta)
          return
        }
        if (event.key === 'Home') {
          event.preventDefault()
          applyWidth(AGENT_MAX)
          return
        }
        if (event.key === 'End') {
          event.preventDefault()
          applyWidth(AGENT_MIN)
        }
      }

      async function openAgent(prompt) {
        setNote('')
        if (!canOpenSession) {
          setNote('当前 Desktop 版本不支持从面板调起会话；请从左侧会话列表新建会话')
          return
        }
        setConnecting(true)
        try {
          let dir = null
          try {
            const res = await fetch(`${API_PREFIX}/health`)
            dir = (await res.json()).dir || null
          } catch {
            /* 拿不到目录也照样调起 */
          }
          const id = await bridge.desktopWorkbenches.ensureSession({ folder: dir })
          rememberDraft({ sessionId: id, prompt: prompt || onboardingPrompt(dir) })
          flushDraft()
          setPaneOpen(true)
          setNote('会话已就绪：草稿已填入右侧输入框，按回车发送')
        } catch (error) {
          setNote(`没能调起会话：${(error && error.message) || error}`)
        } finally {
          setConnecting(false)
        }
      }

      // 收起只是隐藏，不是关闭/删除会话：再点「打开 AI 对话」回到同一个会话。
      function onAgentClick() {
        if (!hasConversation) {
          void openAgent(null)
          return
        }
        setPaneOpen((open) => !open)
        setNote('')
      }

      async function deliverContext(prompt) {
        const id = ownedSession()
        if (id) {
          rememberDraft({ sessionId: id, prompt })
          setPaneOpen(true)
          setNote(
            flushDraft()
              ? '已把这一页的内容填入会话草稿，按回车发送'
              : '会话输入框还没就绪；草稿已暂存，就绪后自动填入',
          )
          return
        }
        setNote('正在为你调起 AI 会话…')
        await openAgent(prompt)
      }

      const deliverRef = React.useRef(null)
      React.useEffect(() => {
        deliverRef.current = deliverContext
      })
      React.useEffect(() => {
        function onMessage(event) {
          const data = event.data
          if (!data || typeof data !== 'object' || data.type !== 'hn:agent-draft') return
          const frame = frameRef.current
          // 不认「谁都能发」的消息：必须来自我们自己的 iframe，且同源。
          if (!frame || event.source !== frame.contentWindow) return
          if (event.origin !== window.location.origin) return
          const prompt = typeof data.prompt === 'string' ? data.prompt.trim() : ''
          if (!prompt) return
          void (deliverRef.current && deliverRef.current(prompt.slice(0, DRAFT_LIMIT)))
        }
        window.addEventListener('message', onMessage)
        return () => window.removeEventListener('message', onMessage)
      }, [])

      const agentLabel = !canOpenSession
        ? 'AI 对话暂不可用'
        : connecting
          ? '正在连接…'
          : !hasConversation
            ? 'AI 对话'
            : paneOpen
              ? '收起 AI 对话'
              : '打开 AI 对话'

      if (broken) return h(Fallback, { onRetry: () => setGeneration((n) => n + 1) })

      const percent = Math.round(width * 100)
      const paneVisible = paneOpen && (hasConversation || connecting)

      return h(
        'div',
        { style: rootStyle },
        h(
          'header',
          { style: headerStyle },
          h('span', { style: brandStyle }, `🗣 ${metadata.title}`),
          h('span', { style: verStyle }, `v${VERSION}`),
          h(
            'span',
            { style: hintStyle },
            hasConversation
              ? '右侧是 DSH 原生会话：可拖中间分隔边调整宽度（25%–45%），收起不会结束会话。'
              : '还没有会话。点右侧「AI 对话」调起原生会话，开场白只填进草稿，不自动发送。',
          ),
          h(
            'div',
            { style: headerActionsStyle },
            h(
              'button',
              {
                type: 'button',
                style: buttonStyle,
                onClick: onAgentClick,
                disabled: connecting || !canOpenSession,
                'aria-label': `AI 对话：${agentLabel}`,
              },
              agentLabel,
            ),
            hasConversation && paneOpen
              ? h(
                  'button',
                  {
                    type: 'button',
                    style: ghostStyle,
                    onClick: () => setPaneOpen(false),
                    'aria-label': '收起 AI 对话面板',
                  },
                  '×',
                )
              : null,
            note ? h('span', { style: noteStyle, role: 'status' }, note) : null,
          ),
        ),
        h(
          'div',
          { ref: shellRef, style: bodyStyle },
          h(
            'div',
            { style: businessStyle },
            h('iframe', {
              key: generation,
              ref: frameRef,
              src: UI_ENTRY,
              title: `${metadata.title} · ${metadata.subtitle}`,
              style: frameStyle,
              sandbox: 'allow-scripts allow-same-origin allow-forms allow-downloads',
              onLoad: () => {
                setBroken(false)
                clearTimeout(brokenTimer.current)
              },
            }),
          ),
          // 原生会话**始终挂载**：卸载会丢掉输入框与草稿状态，所以隐藏走 display，不卸载组件。
          h(
            'aside',
            {
              style: Object.assign(
                {},
                paneStyle,
                narrow ? drawerStyle : null,
                {
                  width: narrow ? `min(92%, ${DRAWER_MAX}px)` : `${percent}%`,
                  display: paneVisible ? 'flex' : 'none',
                },
              ),
              'aria-label': 'AI 对话',
              'aria-hidden': paneVisible ? undefined : 'true',
            },
            conversation ||
              h(
                'div',
                { style: padStyle },
                h('b', null, 'AI 对话还没开始'),
                h('span', null, '点顶栏「AI 对话」调起 DSH 原生会话后，它会固定出现在这一侧。'),
                h('span', null, '没有会话也不影响记录：左侧的资料整理、指标与一图秀照常可用。'),
              ),
          ),
          // splitter 只在宽屏出现：窄屏是覆盖式抽屉，拖宽没有意义
          !narrow && paneVisible
            ? h('div', {
                role: 'separator',
                'aria-orientation': 'vertical',
                'aria-label': '调整 AI 对话面板宽度',
                'aria-valuemin': Math.round(AGENT_MIN * 100),
                'aria-valuemax': Math.round(AGENT_MAX * 100),
                'aria-valuenow': percent,
                tabIndex: 0,
                style: dragging ? splitterFocusStyle : splitterStyle,
                onPointerDown: onSplitterPointerDown,
                onKeyDown: onSplitterKeyDown,
              })
            : null,
        ),
      )
    }

    function apply(ctx) {
      bridge = ctx
      ctx.effect(
        () =>
          ctx.desktopWorkbenches.register(
            {
              title: metadata.title,
              panelTitle: metadata.panelTitle,
              icon: '🗣',
              repository: 'https://github.com/xyb-openharness-dsh-plugins/head-neck-workbench',
              description: metadata.description,
              audience: '头颈癌患者与照护者',
              requirements: '本机数据整理；不做诊断与处置建议，判断由用户与治疗团队做出。',
              initialization: 'empty',
              embedded: true,
              version: VERSION,
              author: '小言宝 VoicePal 社区贡献者',
              layout: { businessSide: BUSINESS_SIDE, businessWidth: BUSINESS_WIDTH },
              customFrame: CUSTOM_FRAME,
            },
            Panel,
          ),
        'head-neck-workbench panel',
      )
    }

    return { apply, inject: ['desktopWorkbenches', 'sessions'] }
  },
})
