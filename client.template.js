window.__ModuleLoader__.load({
  id: '@dsh-local/six-yao',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useMemo, useRef } = React

/*__ENGINE__*/

    const CATEGORY_LIST = ['综合', '财运', '事业', '婚姻', '感情', '健康', '考试', '学业', '出行', '失物', '官讼', '人口', '房产', '求人', '谋划']
    const STORE_KEY = 'dsh.sixyao.history.v1'

    // 面板是 root 作用域的，拿不到会话绑定；这里记住「最近一次主视图里的会话」，
    // 「让 Agent 细解」就能直接把这一卦发进那个对话，不用再复制粘贴。
    const sessionBridge = { ctx: null, lastSessionId: undefined }

    // 取服务一律走这里：有的 ctx 对未注入的服务直接抛错，不能让整个插件跟着挂掉
    function safeService(ctx, name) {
      if (!ctx) return undefined
      try {
        const direct = ctx[name]
        if (direct !== undefined && direct !== null) return direct
      } catch (error) {
        console.error('[six-yao] 服务属性不可用', name, error)
      }
      try {
        if (typeof ctx.get === 'function') {
          const value = ctx.get(name)
          if (value !== undefined && value !== null) return value
        }
      } catch (error) {
        console.error('[six-yao] 取服务失败', name, error)
      }
      return undefined
    }

    // —— 解卦专用区：零工具、最低档位；一卦一个会话，旧的历史默认不进上下文 ——
    const DEDICATED_KEY = 'dsh.sixyao.dedicated.v1'
    const DEDICATED_PRESET = 'liuyao'
    const DEDICATED_TITLE = '解卦专用区'
    // 一事一卦：每个会话只放一卦。下一次解卦时把上一卦的会话归档，另开一个干净的，
    // 这样历史永远不会被重复送到模型；想翻旧账就从面板「档案」点进去看。
    const ROTATE_AFTER_CASTS = 1

    function loadDedicated() {
      try {
        const raw = window.localStorage.getItem(DEDICATED_KEY)
        const v = raw ? JSON.parse(raw) : null
        if (!v || typeof v !== 'object') return { sessionId: undefined, casts: 0, archives: [] }
        return {
          sessionId: v.sessionId,
          casts: typeof v.casts === 'number' ? v.casts : 0,
          archives: Array.isArray(v.archives) ? v.archives : [],
        }
      } catch { return { sessionId: undefined, casts: 0, archives: [] } }
    }

    function saveDedicated(value) {
      try { window.localStorage.setItem(DEDICATED_KEY, JSON.stringify(value)) } catch { /* 隐私模式忽略 */ }
    }

    function listSnapshot(sessions) {
      try { return sessions && sessions.list ? sessions.list.getSnapshot() : undefined } catch { return undefined }
    }

    /**
     * 把「已经不可再用的专用区」补进档案：插件自己轮换归档的、用户手动归档的都会露出来。
     * 注意归档的会话可能还留在列表里（只是进了 archivedSessionIds 或被移出工作区），
     * 所以不能只看「在不在 byId 里」。
     */
    function reconcileDedicated() {
      const store = loadDedicated()
      if (store.sessionId === undefined) return collectArchivedDivination(store)
      const snapshot = listSnapshot(safeService(sessionBridge.ctx, 'sessions'))
      if (!snapshot || snapshot.phase !== 'ready') return store
      const ids = snapshot.ids || []
      if (!ids.length) return store
      const known = snapshot.byId ? snapshot.byId[store.sessionId] : undefined
      if (isReusableSession(store.sessionId, known)) return collectArchivedDivination(store)
      if (!store.archives.some((entry) => entry.id === store.sessionId)) {
        store.archives = [{
          id: store.sessionId,
          title: DEDICATED_TITLE,
          casts: store.casts,
          at: Date.now(),
        }, ...store.archives].slice(0, 50)
      }
      store.sessionId = undefined
      store.casts = 0
      saveDedicated(store)
      return collectArchivedDivination(store)
    }

    /**
     * 扫一遍会话列表，把「preset 是 liuyao、且已经归档/离开工作区」的会话补进档案。
     * 这样即使是用户在侧栏手动归档、插件当初没记过 id 的会话，也能出现在面板里。
     */
    function collectArchivedDivination(store) {
      const snapshot = listSnapshot(safeService(sessionBridge.ctx, 'sessions'))
      if (!snapshot || snapshot.phase !== 'ready' || !snapshot.ids || !snapshot.byId) return store
      const workspace = workspaceSnapshot()
      const archived = new Set(workspace && Array.isArray(workspace.archivedSessionIds) ? workspace.archivedSessionIds : [])
      const items = workspace && Array.isArray(workspace.items) ? workspace.items : []
      const inWorkspace = (id) => items.some((item) => Array.isArray(item.sessionIds) && item.sessionIds.includes(id))
      let changed = false
      for (const id of snapshot.ids) {
        if (id === store.sessionId) continue
        if (store.archives.some((entry) => entry.id === id)) continue
        const row = snapshot.byId[id]
        if (!row || !row.projectionValues) continue
        if (row.projectionValues.agentPreset !== DEDICATED_PRESET) continue
        if (!archived.has(id) && inWorkspace(id)) continue
        store.archives.push({ id, title: row.displayTitle || DEDICATED_TITLE, casts: 0, at: Date.now() })
        changed = true
      }
      if (!changed) return store
      store.archives = store.archives.slice(0, 50)
      saveDedicated(store)
      return store
    }

    function wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    }

    /**
     * 每次桌面端启动（页面加载）跑一次：把所有还活着的解卦会话重新归档。
     * 包括用户从「档案」里点开、已被我们取消归档的那些——重启后一律收回档案，
     * 下次解卦从干净的会话开始。
     */
    let bootArchiveStarted = false
    async function archiveDivinationOnBoot() {
      if (bootArchiveStarted) return
      bootArchiveStarted = true
      const ctx = sessionBridge.ctx
      // 页面刚加载时 sessions / uiWorkspace 可能还没注入（ctx.get 会抛错），
      // 所以要在这里反复取服务，而不是取一次失败就放弃。
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const sessions = safeService(ctx, 'sessions')
        const workspace = safeService(ctx, 'uiWorkspace')
        if (!sessions || !workspace || typeof workspace.archiveSession !== 'function') {
          await wait(500)
          continue
        }
        const ws = workspaceSnapshot()
        const snapshot = listSnapshot(sessions)
        if (ws && ws.phase === 'ready' && snapshot && snapshot.phase === 'ready') {
          const archived = new Set(Array.isArray(ws.archivedSessionIds) ? ws.archivedSessionIds : [])
          const targets = new Set()
          const tracked = loadDedicated().sessionId
          if (tracked !== undefined && snapshot.byId && snapshot.byId[tracked] !== undefined && !archived.has(tracked)) {
            targets.add(tracked)
          }
          for (const id of snapshot.ids || []) {
            const row = snapshot.byId ? snapshot.byId[id] : undefined
            if (!row || archived.has(id)) continue
            if (row.projectionValues && row.projectionValues.agentPreset === DEDICATED_PRESET) targets.add(id)
          }
          for (const id of targets) {
            try {
              await workspace.archiveSession(id, { stopActivity: true })
            } catch (error) {
              console.error('[six-yao] 启动归档失败', id, error)
            }
            // 归档后会话可能直接从列表消失，所以当场记一笔，别指望回头还能扫到
            const row = snapshot.byId ? snapshot.byId[id] : undefined
            const store = loadDedicated()
            if (!store.archives.some((entry) => entry.id === id)) {
              store.archives = [{
                id,
                title: (row && row.displayTitle) || DEDICATED_TITLE,
                casts: store.sessionId === id ? store.casts : 0,
                at: Date.now(),
              }, ...store.archives].slice(0, 50)
            }
            if (store.sessionId === id) {
              store.sessionId = undefined
              store.casts = 0
            }
            saveDedicated(store)
          }
          const store = loadDedicated()
          store.sessionId = undefined
          store.casts = 0
          saveDedicated(store)
          collectArchivedDivination(store)
          return
        }
        await wait(500)
      }
    }

    /**
     * 解卦发送成功后跑一次：把除「刚刚这一卦」以外的解卦会话全部收回档案。
     * 这样从「档案」点开又用过的旧会话、以及上一卦的会话，不会继续赖在侧栏里，
     * 也不用等下一次解卦或手动刷新页面。
     */
    async function archiveStaleDedicated(keepId) {
      const ctx = sessionBridge.ctx
      const sessions = safeService(ctx, 'sessions')
      const workspace = safeService(ctx, 'uiWorkspace')
      if (!sessions || !workspace || typeof workspace.archiveSession !== 'function') return undefined
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const ws = workspaceSnapshot()
        const snapshot = listSnapshot(sessions)
        if (ws && ws.phase === 'ready' && snapshot && snapshot.phase === 'ready') {
          const archived = new Set(Array.isArray(ws.archivedSessionIds) ? ws.archivedSessionIds : [])
          const targets = new Set()
          const store = loadDedicated()
          if (store.sessionId !== undefined && store.sessionId !== keepId && !archived.has(store.sessionId)) {
            targets.add(store.sessionId)
          }
          for (const id of snapshot.ids || []) {
            if (id === keepId) continue
            const row = snapshot.byId ? snapshot.byId[id] : undefined
            if (!row || archived.has(id)) continue
            if (row.projectionValues && row.projectionValues.agentPreset === DEDICATED_PRESET) targets.add(id)
          }
          for (const id of targets) {
            try {
              await workspace.archiveSession(id, { stopActivity: true })
            } catch (error) {
              console.error('[six-yao] 发送后归档旧会话失败', id, error)
            }
            const latest = loadDedicated()
            const row = snapshot.byId ? snapshot.byId[id] : undefined
            if (!latest.archives.some((entry) => entry.id === id)) {
              latest.archives = [{
                id,
                title: (row && row.displayTitle) || DEDICATED_TITLE,
                casts: 0,
                at: Date.now(),
              }, ...latest.archives].slice(0, 50)
            }
            if (latest.sessionId === id) {
              latest.sessionId = undefined
              latest.casts = 0
            }
            saveDedicated(latest)
          }
          return collectArchivedDivination(loadDedicated())
        }
        await wait(500)
      }
      return undefined
    }

    /** 找一个确定的工作区：优先「最近聊过的会话所在的那个」，兜底取第一个 */
    function pickWorkspaceId(sessions) {
      const workspaces = safeService(sessionBridge.ctx, 'workspaces')
      let snapshot
      try { snapshot = workspaces && workspaces.list ? workspaces.list.getSnapshot() : undefined } catch { snapshot = undefined }
      const items = snapshot && Array.isArray(snapshot.items) ? snapshot.items : []
      if (!items.length) return undefined
      const holds = (id) => items.find((item) => Array.isArray(item.sessionIds) && item.sessionIds.includes(id))
      if (sessionBridge.lastSessionId !== undefined) {
        const hit = holds(sessionBridge.lastSessionId)
        if (hit) return hit.workspaceId
      }
      const list = listSnapshot(sessions)
      for (const id of (list && list.ids ? list.ids.slice(0, 5) : [])) {
        const hit = holds(id)
        if (hit) return hit.workspaceId
      }
      return items[0].workspaceId
    }

    /** 工作区快照：items 里带每个工作区拥有的会话，archivedSessionIds 是归档集合 */
    function workspaceSnapshot() {
      const workspaces = safeService(sessionBridge.ctx, 'workspaces')
      try { return workspaces && workspaces.list ? workspaces.list.getSnapshot() : undefined } catch { return undefined }
    }

    /** 归档过的、不在任何工作区里的会话都不能再复用，否则界面会卡在「选择工作区」 */
    function isReusableSession(sessionId, known) {
      if (sessionId === undefined || known === undefined || !known.cwd) return false
      const snapshot = workspaceSnapshot()
      if (!snapshot) return true
      const archived = Array.isArray(snapshot.archivedSessionIds) ? snapshot.archivedSessionIds : []
      if (archived.includes(sessionId)) return false
      const items = Array.isArray(snapshot.items) ? snapshot.items : []
      if (!items.length) return true
      return items.some((item) => Array.isArray(item.sessionIds) && item.sessionIds.includes(sessionId))
    }

    async function ensureDedicatedSession(ctx, sessions) {
      const store = loadDedicated()
      const snapshot = listSnapshot(sessions)
      const known = snapshot && snapshot.byId ? snapshot.byId[store.sessionId] : undefined
      if (store.sessionId !== undefined && isReusableSession(store.sessionId, known) && store.casts < ROTATE_AFTER_CASTS) {
        return { sessionId: store.sessionId, store, fresh: false }
      }
      if (store.sessionId !== undefined) {
        // 这一卦已经解过、或者会话被归档/丢了工作区：都不再复用
        if (isReusableSession(store.sessionId, known) && store.casts >= ROTATE_AFTER_CASTS) {
          await rotateDedicated(ctx, sessions)
        } else {
          store.sessionId = undefined
          store.casts = 0
          saveDedicated(store)
        }
      }

      const workspace = safeService(ctx, 'uiWorkspace')
      if (!workspace) return { sessionId: undefined, store, fresh: false }
      const workspaceId = pickWorkspaceId(sessions)

      // 首选 connectWorkspace：会话直接建在指定工作区里（带 cwd），并直接返回 id
      if (workspaceId !== undefined && typeof workspace.connectWorkspace === 'function') {
        try {
          const created = await workspace.connectWorkspace(workspaceId, { agentPreset: DEDICATED_PRESET })
          if (typeof created === 'string' && created) {
            const freshStore = loadDedicated()
            freshStore.sessionId = created
            freshStore.casts = 0
            saveDedicated(freshStore)
            return { sessionId: created, store: freshStore, fresh: true }
          }
        } catch (error) {
          console.error('[six-yao] connectWorkspace 建会话失败', error)
        }
      }

      // 兜底：startSession（显式带工作区）+ 轮询等新会话出现
      if (typeof workspace.startSession !== 'function') return { sessionId: undefined, store, fresh: false }
      const before = new Set(snapshot && snapshot.ids ? snapshot.ids : [])
      try {
        workspace.startSession(workspaceId, { agentPreset: DEDICATED_PRESET })
      } catch (error) {
        console.error('[six-yao] 开解卦专用区失败', error)
        return { sessionId: undefined, store, fresh: false }
      }
      for (let i = 0; i < 15; i += 1) {
        await wait(200)
        const next = listSnapshot(sessions)
        const created = (next && next.ids ? next.ids : []).find((id) => !before.has(id))
        if (created !== undefined) {
          const row = next && next.byId ? next.byId[created] : undefined
          if (row !== undefined && !row.cwd) {
            // 建出来的会话没绑工作区——这正是会卡在「选择工作区」的那种，宁可判失败
            console.error('[six-yao] 新会话没有工作区，放弃复用', created)
            return { sessionId: undefined, store, fresh: false }
          }
          const freshStore = loadDedicated()
          freshStore.sessionId = created
          freshStore.casts = 0
          saveDedicated(freshStore)
          return { sessionId: created, store: freshStore, fresh: true }
        }
      }
      return { sessionId: undefined, store, fresh: false }
    }

    async function nameDedicatedSession(sessions, sessionId) {
      let ref
      try {
        ref = sessions.retain(sessionId, { source: 'gateway' })
        const binding = await ref.ready
        if (binding && binding.session && typeof binding.session.rename === 'function') {
          await binding.session.rename(DEDICATED_TITLE)
        }
      } catch (error) {
        console.error('[six-yao] 重命名专用区失败', error)
      } finally {
        if (ref && typeof ref.release === 'function') ref.release()
      }
    }

    async function rotateDedicated(ctx, sessions) {
      const store = loadDedicated()
      const oldId = store.sessionId
      if (oldId === undefined) return store
      const workspace = safeService(ctx, 'uiWorkspace')
      try {
        if (workspace && typeof workspace.archiveSession === 'function') await workspace.archiveSession(oldId, { stopActivity: true })
      } catch (error) {
        console.error('[six-yao] 归档旧会话失败', error)
      }
      store.archives = [{ id: oldId, title: DEDICATED_TITLE, casts: store.casts, at: Date.now() }, ...store.archives].slice(0, 50)
      store.sessionId = undefined
      store.casts = 0
      saveDedicated(store)
      return store
    }

    const CSS = `.dsh-liuyao { width: 100%; height: 100%; min-height: 0; display: flex; flex-direction: column; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base); font-size: 14px; line-height: 1.6; }
.dsh-liuyao-scroll { flex: 1; min-height: 0; overflow: auto; scrollbar-gutter: stable; }
.dsh-liuyao-content { max-width: 980px; margin: 0 auto; padding: 28px clamp(20px, 4vw, 48px) 48px; box-sizing: border-box; }
.dsh-liuyao h1 { margin: 0; font-size: 20px; font-weight: 500; line-height: 28px; }
.dsh-liuyao h2 { margin: 0 0 10px; font-size: 15px; font-weight: 600; line-height: 22px; }
.dsh-liuyao h3 { margin: 18px 0 8px; font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-secondary); letter-spacing: .02em; }
.dsh-liuyao .muted { color: var(--dsw-alias-label-secondary); }
.dsh-liuyao .small { font-size: 12px; line-height: 18px; }
.dsh-liuyao .head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
.dsh-liuyao .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; }
.dsh-liuyao .row > * { min-width: 0; }
.dsh-liuyao .form-row { display: grid; grid-template-columns: minmax(200px, 1fr) 150px auto auto; gap: 10px; align-items: end; }
.dsh-liuyao .form-row > * { min-width: 0; }
@media (width <= 860px) {
  .dsh-liuyao .form-row { grid-template-columns: 1fr 1fr; }
}
@media (width <= 560px) {
  .dsh-liuyao .form-row { grid-template-columns: 1fr; }
}
.dsh-liuyao .grow { flex: 1 1 260px; min-width: 200px; }
.dsh-liuyao label { display: block; font-size: 12px; color: var(--dsw-alias-label-secondary); margin-bottom: 4px; }
.dsh-liuyao input[type=text], .dsh-liuyao select { width: 100%; box-sizing: border-box; height: 34px; padding: 0 10px; font: inherit; font-size: 13px; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-1); border: .5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md, 8px); outline: none; }
.dsh-liuyao input[type=text]:focus, .dsh-liuyao select:focus { border-color: var(--dsw-alias-brand-primary); }
.dsh-liuyao button { font: inherit; cursor: pointer; }
.dsh-liuyao .btn { height: 34px; padding: 0 16px; border-radius: 8px; border: .5px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-size: 13px; }
.dsh-liuyao .btn:hover { background: var(--dsw-alias-bg-layer-2); }
.dsh-liuyao .btn.primary { background: var(--dsw-alias-brand-primary); border-color: transparent; color: #fff; font-weight: 500; }
.dsh-liuyao .btn.primary:disabled { opacity: .5; cursor: default; }
.dsh-liuyao .btn.ghost { border-color: transparent; background: transparent; color: var(--dsw-alias-label-secondary); padding: 0 10px; }
.dsh-liuyao .seg { display: inline-flex; border: .5px solid var(--dsw-alias-border-l2); border-radius: 8px; overflow: hidden; }
.dsh-liuyao .seg button { height: 32px; padding: 0 14px; border: 0; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 13px; }
.dsh-liuyao .seg button[aria-pressed=true] { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font-weight: 500; }
.dsh-liuyao .tabs { display: flex; gap: 4px; border-bottom: .5px solid var(--dsw-alias-border-l1); margin: 18px 0 14px; }
.dsh-liuyao .tabs button { padding: 8px 12px; border: 0; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 13px; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.dsh-liuyao .tabs button[aria-selected=true] { color: var(--dsw-alias-label-primary); border-bottom-color: var(--dsw-alias-brand-primary); font-weight: 500; }
.dsh-liuyao .card { border: .5px solid var(--dsw-alias-border-l1); border-radius: 12px; background: var(--dsw-alias-bg-layer-1); padding: 14px 16px; }
.dsh-liuyao .verdict { display: flex; align-items: center; gap: 10px; margin: 4px 0 12px; }
.dsh-liuyao .badge { display: inline-flex; align-items: center; justify-content: center; min-width: 42px; height: 26px; padding: 0 10px; border-radius: 999px; font-size: 13px; font-weight: 600; }
.dsh-liuyao .badge.good { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 16%, transparent); color: var(--dsw-alias-state-success-primary); }
.dsh-liuyao .badge.bad { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 16%, transparent); color: var(--dsw-alias-state-error-primary); }
.dsh-liuyao .badge.mid { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 18%, transparent); color: var(--dsw-alias-state-warn-primary); }
.dsh-liuyao .score { font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.dsh-liuyao .gua-head { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: baseline; margin-bottom: 6px; }
.dsh-liuyao .gua-name { font-size: 22px; font-weight: 600; letter-spacing: .06em; }
.dsh-liuyao .meta { display: flex; flex-wrap: wrap; gap: 4px 16px; color: var(--dsw-alias-label-secondary); font-size: 12px; margin-bottom: 14px; }
.dsh-liuyao .chart { display: grid; grid-template-columns: 50px 82px minmax(110px, 1fr) 150px 128px 40px; gap: 0; border: .5px solid var(--dsw-alias-border-l1); border-radius: 12px; overflow: hidden; background: var(--dsw-alias-bg-layer-1); }
.dsh-liuyao .chart > div { padding: 7px 8px; border-bottom: .5px solid var(--dsw-alias-border-l1); font-size: 13px; }
.dsh-liuyao .chart > div:nth-last-child(-n+6) { border-bottom: 0; }
.dsh-liuyao .chart .ch { font-size: 11px; color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-layer-2); text-align: center; letter-spacing: .04em; white-space: nowrap; }
.dsh-liuyao .chart .sp { color: var(--dsw-alias-label-secondary); font-size: 12px; white-space: nowrap; }
.dsh-liuyao .chart .hid { color: var(--dsw-alias-label-secondary); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dsh-liuyao .chart .sym { display: flex; align-items: center; gap: 4px; white-space: nowrap; }
.dsh-liuyao .chart .chg { font-size: 12px; line-height: 16px; color: var(--dsw-alias-label-secondary); }
.dsh-liuyao .chart .rel { display: flex; align-items: center; gap: 5px; white-space: nowrap; overflow: hidden; }
.dsh-liuyao .chart .pos { display: flex; align-items: center; justify-content: center; white-space: nowrap; }
.dsh-liuyao .yao { display: inline-flex; gap: 5px; align-items: center; height: 12px; }
.dsh-liuyao .bar { width: 46px; height: 8px; border-radius: 2px; background: var(--dsw-alias-label-primary); }
.dsh-liuyao .bar.half { width: 21px; }
.dsh-liuyao .dot { width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid var(--dsw-alias-brand-primary); }
.dsh-liuyao .dot.fill { background: var(--dsw-alias-brand-primary); }
.dsh-liuyao .lv { color: var(--dsw-alias-brand-primary); font-size: 12px; font-weight: 600; }
.dsh-liuyao .badge2 { display: inline-block; min-width: 16px; text-align: center; padding: 0 4px; margin-left: 3px; border-radius: 4px; font-size: 11px; line-height: 16px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); }
.dsh-liuyao .badge2.sh { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent); color: var(--dsw-alias-brand-primary); }
.dsh-liuyao .badge2.no { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 14%, transparent); color: var(--dsw-alias-state-error-primary); }
.dsh-liuyao .findings { margin: 8px 0 0; padding: 0; list-style: none; }
.dsh-liuyao .findings li { padding: 3px 0; font-size: 13px; }
.dsh-liuyao .tones-good { color: var(--dsw-alias-state-success-primary); }
.dsh-liuyao .tones-bad { color: var(--dsw-alias-state-error-primary); }
.dsh-liuyao .plain { font-size: 15px; line-height: 1.9; }
.dsh-liuyao .conclusion { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, var(--dsw-alias-bg-layer-1)); border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 28%, transparent); }
.dsh-liuyao .term-card { margin-top: 10px; }
.dsh-liuyao .term-card summary { cursor: pointer; outline: none; }
.dsh-liuyao .hint { color: var(--dsw-alias-state-error-primary); font-size: 12px; margin-top: 6px; }
.dsh-liuyao .chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 14px; }
.dsh-liuyao .chip { padding: 5px 12px; border-radius: 999px; border: .5px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font-size: 12px; }
.dsh-liuyao .chip:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-brand-primary); }
.dsh-liuyao .toast-bar { position: sticky; bottom: 0; z-index: 2; margin-top: 10px; padding: 8px 12px; border-radius: 8px; background: var(--dsw-alias-bg-overlay); border: .5px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-primary); font-size: 12px; display: flex; gap: 10px; align-items: center; box-shadow: 0 -2px 12px rgba(0,0,0,.12); }
.dsh-liuyao .btn:disabled { opacity: .45; cursor: default; }
.dsh-liuyao .list { margin: 6px 0 0; padding-left: 18px; }
.dsh-liuyao .list li { margin: 3px 0; }
.dsh-liuyao .classic p { margin: 4px 0; }
.dsh-liuyao .classic .yao-line { font-size: 13px; }
.dsh-liuyao .history { display: flex; flex-direction: column; gap: 8px; }
.dsh-liuyao .hist-item { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 10px 14px; border: .5px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); text-align: left; width: 100%; color: inherit; }
.dsh-liuyao .hist-item:hover { background: var(--dsw-alias-bg-layer-2); }
.dsh-liuyao .hist-q { flex: 1 1 220px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-liuyao .empty { padding: 34px 16px; text-align: center; color: var(--dsw-alias-label-secondary); font-size: 13px; }
.dsh-liuyao .foot { margin-top: 22px; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
@media (width <= 720px) {
  .dsh-liuyao .chart { grid-template-columns: 42px 1fr 38px; }
  .dsh-liuyao .chart .hide-sm { display: none; }
}
`

    const TONE_CLASS = { good: 'tones-good', bad: 'tones-bad', warn: '' }

    function safeParse(text) {
      try { return JSON.parse(text) } catch { return null }
    }

    function loadHistory() {
      try {
        const raw = window.localStorage.getItem(STORE_KEY)
        const list = raw ? safeParse(raw) : null
        return Array.isArray(list) ? list : []
      } catch { return [] }
    }

    function saveHistory(list) {
      try { window.localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, 30))) } catch { /* 隐私模式忽略 */ }
    }

    function buildHexFromRecord(record) {
      const calendar = record.manualCalendar
        ? record.manualCalendar
        : buildCalendar({
          year: record.y, month: record.m, day: record.d, hour: record.hh, minute: record.mi,
        }, 8)
      return buildHexagram(record.lines.map((v) => ({
        value: v, yin: v === 6 || v === 8, moving: v === 6 || v === 9,
        label: v === 9 ? '老阳' : v === 8 ? '少阴' : v === 7 ? '少阳' : '老阴',
      })), calendar, { question: record.q, category: record.c, method: record.method })
    }

    let castSeq = 0
    function currentLocal() {
      const now = new Date()
      const shifted = new Date(now.getTime() + 8 * 3600000)
      return {
        y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() + 1, d: shifted.getUTCDate(),
        hh: shifted.getUTCHours(), mi: shifted.getUTCMinutes(),
      }
    }

    function doCast(question, category, method) {
      castSeq += 1
      const local = currentLocal()
      const seed = (Date.now() ^ (castSeq * 2654435761)) >>> 0
      let state = seed
      const rnd = () => {
        state = (state * 1664525 + 1013904223) >>> 0
        state ^= state >>> 13
        return (state >>> 0) / 4294967296
      }
      const raw = tossHexagram(method, rnd)
      const calendar = buildCalendar({
        year: local.y, month: local.m, day: local.d, hour: local.hh, minute: local.mi,
      }, 8)
      const hex = buildHexagram(raw, calendar, { question, category, method })
      const record = {
        id: 'gua-' + Date.now().toString(36) + '-' + castSeq,
        q: question, c: category, method,
        lines: hex.lines.map((l) => l.value),
        y: local.y, m: local.m, d: local.d, hh: local.hh, mi: local.mi,
        at: new Date().toISOString(),
      }
      return { hex, record }
    }

    function reportOf(hex) {
      return renderHexagram(hex, CLASSICS)
    }

    function dotEl(kind) {
      return h('span', { className: 'dot ' + (kind === 'moving' ? 'fill' : '') })
    }

    function yaoBar(line) {
      const bar = h('span', { className: 'yao' },
        line.yin
          ? [h('span', { key: 'a', className: 'bar half' }), h('span', { key: 'b', className: 'bar half' })]
          : h('span', { className: 'bar' }),
      )
      if (!line.moving) return bar
      return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '4px' } }, bar, dotEl('moving'))
    }

    function tagsOf(line) {
      // 世/应 已单列在最后一列，这里只标「空 / 月破 / 日冲」，避免重复
      const tags = []
      if (line.empty) tags.push(['空', 'no'])
      if (line.monthClash) tags.push(['月破', 'no'])
      if (line.dayClash && !line.moving) tags.push(['日冲', ''])
      return tags.map(([t, k], i) => h('span', { key: i, className: 'badge2 ' + k }, t))
    }

    const TERMS = [
      ['用神', '所问之事的代表爻：问财看妻财，问工作看官鬼，问自己看世爻'],
      ['世 / 应', '世＝你自己；应＝对方或事情的另一头'],
      ['旺衰', '这一爻在当下月、日的强弱，旺 > 相 > 休 > 囚 > 死'],
      ['旬空', '这十天里暂时落空，出空之后才落实'],
      ['月破', '这个月被月建冲破，力量打了折'],
      ['动爻 / 变爻', '摇出老阳、老阴的爻会变，变出来的叫变爻'],
      ['伏神', '卦面上没有、藏在别爻之下的六亲，像暗线'],
    ]

    function Chart({ hex }) {
      const rows = []
      rows.push(h('div', { key: 'h1', className: 'ch', title: '六神：按日干自初爻起' }, '六神'))
      rows.push(h('div', { key: 'h2', className: 'ch hide-sm', title: '伏神：卦面上没有的六亲' }, '伏神'))
      rows.push(h('div', { key: 'h3', className: 'ch', title: '本卦：摇出的卦' }, '本卦'))
      rows.push(h('div', { key: 'h4', className: 'ch hide-sm', title: '变卦：动爻变化之后' }, '变卦'))
      rows.push(h('div', { key: 'h5', className: 'ch hide-sm', title: '六亲 + 纳甲干支' }, '六亲'))
      rows.push(h('div', { key: 'h6', className: 'ch', title: '世爻为自己，应爻为对方' }, '世应'))
      for (let i = 5; i >= 0; i -= 1) {
        const l = hex.lines[i]
        const hidden = hex.hidden.filter((x) => x.underPosition === l.position)
        const hiddenText = hidden.length ? hidden.map((x) => x.relation + x.ganzhi).join(' ') : '—'
        rows.push(h('div', { key: 's' + i, className: 'sp' }, l.spirit))
        rows.push(h('div', { key: 'v' + i, className: 'hid hide-sm' }, hiddenText))
        rows.push(h('div', { key: 'y' + i, className: 'sym' },
          yaoBar(l),
          h('span', { className: 'small muted', style: { marginLeft: '6px' } }, POS[l.position - 1] + '爻'),
        ))
        rows.push(h('div', { key: 'c' + i, className: 'chg hide-sm' }, l.changed ? l.changed.ganzhi + l.changed.element + (l.changed.notes.length ? ' · ' + l.changed.notes.join(' · ') : '') : '—'))
        rows.push(h('div', { key: 'r' + i, className: 'small hide-sm rel' },
          l.relation,
          h('span', { className: 'muted' }, l.ganzhi + l.element),
          ...tagsOf(l),
        ))
        rows.push(h('div', { key: 't' + i, className: 'small pos' },
          l.isWorld ? h('span', { className: 'lv' }, '世') : l.isResponse ? h('span', { className: 'lv' }, '应') : '',
        ))
      }
      return h('div', { className: 'chart' }, rows)
    }

    function Badge({ verdict }) {
      const kind = verdict === '吉' ? 'good' : verdict === '凶' || verdict === '先吉后散' ? 'bad' : 'mid'
      return h('span', { className: 'badge ' + kind }, verdict)
    }

    function CopyButton({ onAsk, onCopy, sending, label }) {
      return h('div', { className: 'row', style: { gap: '8px' } },
        h('button', { type: 'button', className: 'btn primary', onClick: onAsk, disabled: sending },
          sending ? '发送中…' : (label || '让 Agent 细解')),
        h('button', { type: 'button', className: 'btn ghost', onClick: onCopy, disabled: sending }, '复制排盘'),
      )
    }

    function Overview({ hex, analysis, onAsk, onCopy, sending }) {
      const moving = hex.lines.filter((l) => l.moving)
      return h('div', null,
        h('div', { className: 'gua-head' },
          h('span', { className: 'gua-name' }, hex.original.name),
          hex.changed ? h('span', { className: 'muted' }, '之 ' + hex.changed.name) : h('span', { className: 'muted' }, '静卦'),
          h('span', { className: 'muted small' }, hex.original.palace.palace + '宫 · ' + hex.original.palace.type),
          hex.features.length ? h('span', { className: 'small', style: { color: 'var(--dsw-alias-state-warn-primary)' } }, hex.features.join(' · ')) : null,
        ),
        h('div', { className: 'meta' },
          h('span', null, '问：' + (hex.question || '（未填）') + '　·　' + hex.category),
          h('span', null, hex.calendar.year + '年 ' + hex.calendar.month + '月 ' + hex.calendar.day + '日' + (hex.calendar.hour ? ' ' + hex.calendar.hour + '时' : '')),
          h('span', null, '月建 ' + (hex.month.stem || '') + hex.month.branch + '　日辰 ' + hex.day.stem + hex.day.branch + '　旬空 ' + (hex.kong.join('、') || '无')),
          h('span', null, moving.length ? '动爻 ' + moving.map((l) => l.position).join('、') : '无动爻'),
        ),
        h('h2', null, '一句话结论'),
        h('div', { className: 'card conclusion plain' },
          h('div', { className: 'verdict', style: { margin: '0 0 6px' } },
            h(Badge, { verdict: analysis.useGod.verdict }),
            h('span', { className: 'small muted' }, '倾向'),
          ),
          analysis.plain,
          h('div', { className: 'row', style: { marginTop: '10px' } }, h(CopyButton, { onAsk, onCopy, sending })),
        ),
        h('details', { className: 'card term-card' },
          h('summary', { className: 'small muted' }, '术语速查（看不懂就点开）'),
          h('ul', { className: 'list small' },
            TERMS.map(([k, v], i) => h('li', { key: i }, h('strong', null, k + '：'), v)),
          ),
        ),
        h('h3', null, '卦盘'),
        h(Chart, { hex }),
        h('h3', null, '断卦依据'),
        h('ul', { className: 'findings' },
          analysis.useGod.findings.map((f, i) => h('li', { key: i, className: TONE_CLASS[f.tone] || '' },
            (f.tone === 'good' ? '＋ ' : f.tone === 'bad' ? '－ ' : '· ') + f.kind + '：' + f.text,
          )),
        ),
        h('div', { className: 'foot' }, analysis.useGod.useNote),
      )
    }

    function Reading({ hex, analysis, onAsk, onCopy, sending }) {
      return h('div', null,
        h('h3', { style: { marginTop: 0 } }, '应期'),
        h('ul', { className: 'list' },
          analysis.timing.map((t, i) => h('li', { key: i }, h('strong', null, t.basis + '：'), t.text)),
        ),
        h('h3', null, '六神点睛'),
        h('ul', { className: 'list' }, analysis.spirits.map((s, i) => h('li', { key: i }, s))),
        h('h3', null, '趋避建议'),
        h('ul', { className: 'list' }, analysis.tips.map((t, i) => h('li', { key: i }, t))),
        h('div', { className: 'row', style: { marginTop: '16px' } }, h(CopyButton, { onAsk, onCopy, sending })),
        h('div', { className: 'foot' }, '点「让 Agent 细解」，这一卦会直接发进你正在用的那个对话。'),
      )
    }

    function Classics({ hex }) {
      const c = CLASSICS[hex.original.number - 1]
      const m = MEANINGS[String(hex.original.number)]
      const moving = hex.lines.filter((l) => l.moving)
      const cc = hex.changed ? CLASSICS[hex.changed.number - 1] : null
      if (!c) return h('div', { className: 'empty' }, '没有找到经传数据')
      return h('div', { className: 'classic' },
        h('h3', null, '卦义'),
        h('p', null, m ? m[2] : ''),
        h('h3', null, '卦辞'),
        h('p', null, c.guaci),
        h('h3', null, moving.length ? '动爻爻辞（以动爻为断）' : '六爻爻辞'),
        moving.length
          ? moving.map((l, i) => {
            const title = yaoTitle(l)
            const item = c.lines.find((x) => x.title === title)
            return h('p', { key: i, className: 'yao-line' }, h('strong', null, title + '：'), item ? item.text : '')
          })
          : c.lines.map((l, i) => h('p', { key: i, className: 'yao-line' }, h('strong', null, l.title + '：'), l.text)),
        h('h3', null, '彖传'),
        h('p', null, c.tuan),
        h('h3', null, '大象'),
        h('p', null, c.xiang),
        cc ? h('div', null,
          h('h3', null, '变卦「' + hex.changed.name + '」'),
          h('p', null, cc.guaci),
        ) : null,
      )
    }

    function copyText(text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text)
          return true
        }
      } catch { /* 落回 execCommand */ }
      try {
        const el = document.createElement('textarea')
        el.value = text
        el.style.position = 'fixed'
        el.style.opacity = '0'
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        el.remove()
        return true
      } catch { return false }
    }

    function promptFor(record, hex) {
      const mm = String(record.m).padStart(2, '0')
      const dd = String(record.d).padStart(2, '0')
      const hh = String(record.hh).padStart(2, '0')
      const mi = String(record.mi).padStart(2, '0')
      const date = record.y + '-' + mm + '-' + dd
      const time = hh + ':' + mi
      let digest = ''
      try {
        if (hex && typeof renderDigest === 'function') digest = renderDigest(hex, CLASSICS)
      } catch (error) {
        console.error('[six-yao] 生成摘要失败', error)
      }
      const lines = [
        '【六爻解卦】' + record.q + '（类别：' + record.c + '；起卦 ' + date + ' ' + time + '）',
      ]
      if (digest) {
        lines.push('盘面（本机已排好，直接照这个断，不要调用工具、不要复现）：')
        lines.push(digest)
        lines.push('')
      }
      lines.push('只写：结论、2–3 条关键依据、应期、一句趋避。正文不超过 400 字，不要复述盘面，不要解释术语。')
      return lines.join('\n')
    }

    function sessionCandidates() {
      const ctx = sessionBridge.ctx
      const sessions = safeService(ctx, 'sessions')
      if (!sessions || typeof sessions.retain !== 'function') return { sessions: null, ids: [] }
      const ids = []
      if (sessionBridge.lastSessionId !== undefined) ids.push(sessionBridge.lastSessionId)
      try {
        const state = sessions.list.getSnapshot()
        for (const id of state.ids || []) {
          if (ids.length >= 3) break
          if (!ids.includes(id)) ids.push(id)
        }
      } catch (error) {
        console.error('[six-yao] 读取会话列表失败', error)
      }
      return { sessions, ids }
    }

    async function askAgent(text) {
      const ctx = sessionBridge.ctx
      if (!ctx) return { ok: false, reason: 'no-ctx' }
      const { sessions, ids } = sessionCandidates()
      if (!sessions) return { ok: false, reason: 'no-sessions' }

      // 优先进「解卦专用区」：专用 preset 零工具、最低档位，整张工具表都不进上下文
      let dedicated
      try {
        dedicated = await ensureDedicatedSession(ctx, sessions)
      } catch (error) {
        console.error('[six-yao] 专用区准备失败', error)
        dedicated = { sessionId: undefined, store: loadDedicated(), fresh: false }
      }
      const candidates = dedicated && dedicated.sessionId !== undefined
        ? [dedicated.sessionId, ...ids.filter((id) => id !== dedicated.sessionId)]
        : ids
      if (!candidates.length) return { ok: false, reason: 'no-session' }

      let lastReason = 'failed'
      for (const sessionId of candidates) {
        let ref
        try {
          if (dedicated && dedicated.sessionId === sessionId && dedicated.fresh) {
            await nameDedicatedSession(sessions, sessionId)
          }
          ref = sessions.retain(sessionId, { source: 'gateway' })
          let timer
          const binding = await Promise.race([
            ref.ready,
            new Promise((_, reject) => {
              timer = setTimeout(() => reject(new Error('ready timeout')), 8000)
            }),
          ])
          clearTimeout(timer)
          const result = await binding.session.prompt([{ type: 'text', text }], 'queue')
          if (!result || result.ok !== true) {
            lastReason = 'rejected'
            continue
          }
          const layout = safeService(ctx, 'layout')
          if (layout && typeof layout.selectPanel === 'function') layout.selectPanel(null)
          const workspace = safeService(ctx, 'uiWorkspace')
          if (workspace && typeof workspace.openSession === 'function') workspace.openSession(sessionId)

          // 记账：专用区每发一卦 +1，到阈值就归档旧的、下次开新的
          if (dedicated && dedicated.sessionId === sessionId) {
            const store = loadDedicated()
            store.sessionId = sessionId
            store.casts = (store.casts || 0) + 1
            saveDedicated(store)
            // 不在这里归档：留给你看。下一次解卦时才把它归档、另开干净会话
          }
          return { ok: true, sessionId }
        } catch (error) {
          console.error('[six-yao] 发给 Agent 失败', sessionId, error)
          lastReason = 'failed'
        } finally {
          if (ref && typeof ref.release === 'function') ref.release()
        }
      }
      return { ok: false, reason: lastReason }
    }

    function SixYaoPanel() {
      const [question, setQuestion] = useState('')
      const [category, setCategory] = useState('综合')
      const [method, setMethod] = useState('coins')
      const [current, setCurrent] = useState(null)
      const [tab, setTab] = useState('overview')
      const [history, setHistory] = useState(() => loadHistory())
      const [dedicated, setDedicated] = useState(() => loadDedicated())
      const [toast, setToast] = useState('')
      const [hint, setHint] = useState('')
      const [casting, setCasting] = useState(false)
      const [sending, setSending] = useState(false)
      const timer = useRef(null)
      const inputRef = useRef(null)
      const castTimer = useRef(null)

      useEffect(() => {
        const el = document.createElement('style')
        el.setAttribute('data-plugin-css', 'dsh-liuyao')
        el.textContent = CSS
        document.head.appendChild(el)
        return () => { el.remove() }
      }, [])

      useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current)
        if (castTimer.current) clearTimeout(castTimer.current)
      }, [])

      // 打开面板时先对一次账：用户手动归档过的专用区要出现在档案里
      useEffect(() => {
        setDedicated(reconcileDedicated())
      }, [])

      const analysis = useMemo(() => (current ? analyze(current.hex) : null), [current])

      const showToast = (msg, ms) => {
        setToast(msg)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setToast(''), ms || 2600)
      }

      const cast = () => {
        if (casting) return
        const q = question.trim()
        if (!q) {
          setHint('先写下所问的事，再起卦。一事一卦。')
          if (inputRef.current && inputRef.current.focus) inputRef.current.focus()
          return
        }
        setHint('')
        setCasting(true)
        castTimer.current = setTimeout(() => {
          try {
            const { hex, record } = doCast(q, category, method)
            const a = analyze(hex)
            const next = [{ ...record, name: hex.original.name, verdict: a.useGod.verdict }, ...history].slice(0, 30)
            setCurrent({ hex, record })
            setHistory(next)
            saveHistory(next)
            setTab('overview')
          } catch (error) {
            console.error('[six-yao] cast failed', error)
            setToast('起卦时出了点问题，请再试一次')
          } finally {
            setCasting(false)
          }
        }, 700)
      }

      const openRecord = (record) => {
        try {
          const hex = buildHexFromRecord(record)
          setCurrent({ hex, record })
          setTab('overview')
        } catch {
          showToast('这一卦读不出来了')
        }
      }

      const removeRecord = (record) => {
        const ok = window.confirm ? window.confirm('删除这条记录？删了就找不回来了。') : true
        if (!ok) return
        const next = history.filter((r) => r.id !== record.id)
        setHistory(next)
        saveHistory(next)
        showToast('已删除')
      }

      const clearHistory = () => {
        const ok = window.confirm ? window.confirm('清空全部历史记录？') : true
        if (!ok) return
        setHistory([])
        saveHistory([])
        showToast('已清空')
      }

      const openArchive = (entry) => {
        const workspace = safeService(sessionBridge.ctx, 'uiWorkspace')
        if (!workspace) {
          showToast('打不开存档会话')
          return
        }
        // 归档会把它从工作区里摘出来，直接开会卡在「选择工作区」；先取消归档再打开
        const open = () => {
          try {
            if (typeof workspace.openSession === 'function') workspace.openSession(entry.id)
            showToast('已打开这条存档')
          } catch (error) {
            console.error('[six-yao] 打开存档失败', error)
            showToast('打不开这条存档')
          }
        }
        const restore = typeof workspace.unarchiveSession === 'function'
          ? workspace.unarchiveSession(entry.id)
          : undefined
        if (restore && typeof restore.then === 'function') {
          restore.then(open).catch((error) => {
            console.error('[six-yao] 取消归档失败', error)
            open()
          })
        } else {
          open()
        }
      }

      const copyReport = () => {
        if (!current) return
        const ok = copyText(reportOf(current.hex))
        showToast(ok ? '已复制排盘，可粘到任意对话' : '复制失败，请手动选中')
      }

      const askCurrent = () => {
        if (!current || sending) return
        setSending(true)
        askAgent(promptFor(current.record, current.hex))
          .catch((error) => {
            console.error('[six-yao] 发送异常', error)
            return { ok: false, reason: 'failed' }
          })
          .then((res) => {
            setSending(false)
            setDedicated(reconcileDedicated())
            if (res.ok) {
              // 发送成功后立刻把上一卦/上一个打开过的档案收回档案，别赖在侧栏里
              archiveStaleDedicated(res.sessionId)
                .then((store) => { if (store) setDedicated(store) })
                .catch((error) => console.error('[six-yao] 发送后归档失败', error))
              return
            }
            const why = res.reason === 'no-session' ? '没有可用的对话'
              : res.reason === 'no-sessions' ? '读不到会话服务'
                : res.reason === 'rejected' ? '对话拒绝了这条消息'
                  : res.reason === 'no-ctx' ? '插件上下文没就绪'
                    : '发送出错'
            const copied = copyText(reportOf(current.hex))
            showToast(why + (copied ? '，已复制排盘' : '，可点「复制排盘」'), 6000)
          })
      }

      const tabs = [
        ['overview', '卦盘'],
        ['reading', '断语'],
        ['classic', '经传'],
        ['history', history.length ? '历史 · ' + history.length : '历史'],
        ['archive', dedicated.archives.length ? '档案 · ' + dedicated.archives.length : '档案'],
      ]

      const examples = ['今年换工作能否顺利？', '这笔钱能不能收回来？', '这段感情还有没有戏？']

      return h('div', { className: 'dsh-liuyao' },
        h('div', { className: 'dsh-liuyao-scroll' },
          h('div', { className: 'dsh-liuyao-content' },
            h('div', { className: 'head' },
              h('div', null,
                h('h1', null, '六爻解卦'),
                h('div', { className: 'small muted' }, '写下问题、摇一卦，先看一句话结论；细节看卦盘，或点「让 Agent 细解」把这一卦发进解卦专用区。'),
              ),
            ),

            h('div', { className: 'card' },
              h('div', { className: 'form-row' },
                h('div', null,
                  h('label', { htmlFor: 'dsh-liuyao-q' }, '所问何事（一事一卦，越具体越好）'),
                  h('input', {
                    id: 'dsh-liuyao-q', type: 'text', value: question, ref: inputRef,
                    placeholder: '例如：今年下半年换工作能否顺利？',
                    'aria-invalid': hint ? 'true' : undefined,
                    onChange: (e) => { setQuestion(e.target.value); if (hint) setHint('') },
                    onKeyDown: (e) => { if (e.key === 'Enter') cast() },
                  }),
                  hint ? h('div', { className: 'hint', role: 'alert' }, hint) : null,
                ),
                h('div', null,
                  h('label', { htmlFor: 'dsh-liuyao-c' }, '类别（决定看哪一爻）'),
                  h('select', { id: 'dsh-liuyao-c', value: category, onChange: (e) => setCategory(e.target.value) },
                    CATEGORY_LIST.map((c) => h('option', { key: c, value: c }, c)),
                  ),
                ),
                h('div', null,
                  h('label', null, '起卦法'),
                  h('div', { className: 'seg' },
                    h('button', { type: 'button', 'aria-pressed': method === 'coins', onClick: () => setMethod('coins'), title: '三枚铜钱摇六次' }, '铜钱'),
                    h('button', { type: 'button', 'aria-pressed': method === 'yarrow', onClick: () => setMethod('yarrow'), title: '大衍筮法：五十根蓍草，十八变成卦' }, '蓍草'),
                  ),
                ),
                h('button', { className: 'btn primary', onClick: cast, disabled: casting, style: { whiteSpace: 'nowrap' } }, casting ? '摇卦中…' : '摇一卦'),
              ),
              h('div', { className: 'small muted', style: { marginTop: '10px' } },
                '摇出的卦只留在本机浏览器，不上传；点「让 Agent 细解」才会把问题和本机排好的盘发进解卦专用区（专用区不重排盘、只做解读）。',
              ),
            ),

            toast ? h('div', { className: 'toast-bar', role: 'status', 'aria-live': 'polite' }, toast) : null,

            h('div', { className: 'tabs', role: 'tablist' },
              tabs.map(([key, label]) => h('button', {
                key, role: 'tab', 'aria-selected': tab === key,
                onClick: () => {
                  setTab(key)
                  if (key === 'archive') setDedicated(reconcileDedicated())
                },
              }, label)),
            ),

            tab === 'history'
              ? h('div', { className: 'history' },
                history.length === 0
                  ? h('div', { className: 'empty' }, '还没有摇过卦。写好问题，点「摇一卦」。')
                  : history.map((r) => h('div', { key: r.id, style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                    h('button', { className: 'hist-item', onClick: () => openRecord(r) },
                      h('span', { className: 'hist-q' }, r.q),
                      h('span', { className: 'small muted' },
                        (r.name ? r.name + (r.verdict ? ' · ' + r.verdict : '') + '　' : '') + r.c + ' · ' + fmtRecordTime(r)),
                    ),
                    h('button', {
                      className: 'btn ghost', title: '删除这条记录', 'aria-label': '删除这条记录',
                      onClick: () => removeRecord(r),
                    }, '删'),
                  )),
                history.length
                  ? h('div', { className: 'row', style: { marginTop: '12px' } },
                    h('button', { className: 'btn', onClick: clearHistory }, '清空历史'),
                    h('span', { className: 'foot', style: { margin: 0 } }, '最多保留 30 条，只在本机。'),
                  )
                  : null,
              )
              : tab === 'archive'
                ? h('div', null,
                  h('div', { className: 'small muted', style: { marginBottom: '10px' } },
                    '一卦一个会话：下次解卦时，这一卦的会话会自动归档到这里，翻旧账点开就行。平时解卦不带任何历史，不重复烧 token。',
                  ),
                  h('div', { className: 'history' },
                    dedicated.archives.length === 0
                      ? h('div', { className: 'empty' }, '还没有归档。解下一卦时，这一卦的会话会自动出现在这里。')
                      : dedicated.archives.map((entry) => h('div', { key: entry.id, style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                        h('button', { className: 'hist-item', onClick: () => openArchive(entry) },
                          h('span', { className: 'hist-q' }, (entry.title || DEDICATED_TITLE) + (entry.casts ? ' · ' + entry.casts + ' 卦' : '')),
                          h('span', { className: 'small muted' }, fmtStamp(entry.at)),
                        ),
                      )),
                  ),
                  dedicated.sessionId
                    ? h('div', { className: 'foot' },
                      '当前会话已解 ' + dedicated.casts + ' 卦；下一次解卦会开一个干净的会话，这个自动归档。')
                    : null,
                )
              : !current
                ? h('div', null,
                  h('div', { className: 'empty' }, '还没有卦。先写下所问之事，再点「摇一卦」。'),
                  h('div', { className: 'chips' },
                    examples.map((ex) => h('button', {
                      key: ex, className: 'chip', type: 'button',
                      onClick: () => { setQuestion(ex); setHint(''); if (inputRef.current && inputRef.current.focus) inputRef.current.focus() },
                    }, ex)),
                  ),
                )
                : tab === 'overview'
                  ? h(Overview, { hex: current.hex, analysis, onAsk: askCurrent, onCopy: copyReport, sending })
                  : tab === 'reading'
                    ? h(Reading, { hex: current.hex, analysis, onAsk: askCurrent, onCopy: copyReport, sending })
                    : h(Classics, { hex: current.hex }),

            h('div', { className: 'foot' },
              '断卦以「用神」为核心，兼顾月建日辰、动变、旬空月破；卦爻辞依《周易》经传原文。',
              h('br'),
              '占卜为传统文化参考，不构成医疗、法律、投资等专业意见；重大决定请以事实与专业判断为准。',
            ),
          ),
        ),
      )
    }

    function fmtStamp(at) {
      const d = new Date(typeof at === 'number' ? at : Date.now())
      const p = (n) => String(n).padStart(2, '0')
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
    }

    function fmtRecordTime(r) {
      const mm = String(r.m).padStart(2, '0')
      const dd = String(r.d).padStart(2, '0')
      const hh = String(r.hh).padStart(2, '0')
      const mi = String(r.mi).padStart(2, '0')
      return r.y + '-' + mm + '-' + dd + ' ' + hh + ':' + mi
    }

    function SixYaoIcon({ size = 16, active }) {
      const c = active ? 'var(--dsw-alias-brand-primary)' : 'currentColor'
      // 六爻卦画：阳爻整条、阴爻断开，自上而下 5 阳 3 阴交替，易与列表图标区分
      const yinRows = new Set([1, 3, 5])
      const rows = [2.6, 4.7, 6.8, 8.9, 11, 13.1]
      return h('svg', {
        viewBox: '0 0 16 16', width: size, height: size, 'aria-hidden': 'true',
        style: { display: 'block' }, fill: 'none',
      },
        rows.map((y, i) => h('g', { key: i, stroke: c, strokeWidth: 1.3, strokeLinecap: 'round' },
          yinRows.has(i)
            ? [h('line', { key: 'l', x1: 2.6, y1: y, x2: 6.3, y2: y }), h('line', { key: 'r', x1: 9.7, y1: y, x2: 13.4, y2: y })]
            : h('line', { x1: 2.6, y1: y, x2: 13.4, y2: y }),
        )),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        sessionBridge.ctx = ctx
        // 先注册面板：入口不能因为后面任何初始化异常而消失
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: 'sixyao',
          inject: () => ({}),
        }, SixYaoPanel))
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'sixyao',
          order: 30,
          label: () => '六爻解卦',
        }, SixYaoIcon))
        try {
          const sessions = safeService(ctx, 'sessions')
          if (sessions && sessions.list && typeof sessions.list.subscribe === 'function') {
            const track = () => {
              try {
                const state = sessions.list.getSnapshot()
                const hit = (state.ids || []).find((id) => ((state.byId[id] || {}).retainedBy || {}).mainView > 0)
                if (hit !== undefined) sessionBridge.lastSessionId = hit
              } catch (error) {
                console.error('[six-yao] 读取会话列表失败', error)
              }
            }
            track()
            const dispose = sessions.list.subscribe(track)
            ctx.effect(() => () => dispose(), 'six-yao 会话跟踪')
          }
        } catch (error) {
          console.error('[six-yao] 会话跟踪初始化失败', error)
        }
        // 启动时把所有解卦会话收回档案（含用户从档案里点开过的）
        archiveDivinationOnBoot().catch((error) => console.error('[six-yao] 启动归档失败', error))
      },
    }
  },
})
