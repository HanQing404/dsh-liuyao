/**
 * 六爻解卦 · Host 半：起卦 / 解卦 / 查卦 三个 agent 工具，以及 Web 面板（client.js）所需的静态资源。
 *
 * 引擎（engine/*.js）为纯 JS，同一套规则同时驱动工具与面板，保证「工具里断的和面板里排的是同一卦」。
 */
import { readFileSync } from 'node:fs'

import { buildCalendar, nowCalendar } from './engine/calendar.js'
import { buildHexagram, tossHexagram, analyze, derivePalace } from './engine/hexagram.js'
import { renderHexagram, toModelJson, renderCompact, renderDigest } from './engine/render.js'
import { HEXAGRAMS, HEXAGRAM_BY_NAME, HEXAGRAM_BY_NUMBER } from './engine/core-data.js'

export const name = 'six-yao'
export const inject = ['tools']

/** 解卦专用区的 preset id，与 cordis.patch.yml 里声明的一致 */
const DEDICATED_PRESET = 'liuyao'
const DEDICATED_EFFORT = 'off'

/**
 * 专用区的档位：preset 声明里没有模型/档位字段，所以在会话的 agent 建好时补一刀——
 * 只有 preset 是 liuyao 的会话才会被改，其他会话一律不动。
 */
function applyDedicatedEffort(ctx, payload) {
  try {
    const agent = payload && payload.agent
    if (!agent || !agent.session || !agent.model || typeof agent.model.select !== 'function') return
    const presets = typeof ctx.get === 'function' ? ctx.get('agentPresets') : undefined
    if (!presets || typeof presets.presetForSession !== 'function') return
    if (presets.presetForSession(agent.session) !== DEDICATED_PRESET) return
    const defaults = typeof ctx.get === 'function' ? ctx.get('agentDefaultModel') : undefined
    const base = defaults && typeof defaults.currentSelection === 'function' ? defaults.currentSelection() : undefined
    if (base === undefined) return
    if (typeof base.provider !== 'string' || typeof base.model !== 'string') return
    const outcome = agent.model.select({ provider: base.provider, model: base.model, reasoningEffort: DEDICATED_EFFORT })
    if (outcome && typeof outcome.catch === 'function') {
      outcome.catch((error) => console.error('[six-yao] 设置专用区档位失败', error))
    }
  } catch (error) {
    console.error('[six-yao] 设置专用区档位失败', error)
  }
}

const classics = JSON.parse(readFileSync(new URL('./engine/classics.json', import.meta.url), 'utf8'))
const meanings = JSON.parse(readFileSync(new URL('./engine/hexagram-meanings.json', import.meta.url), 'utf8'))

const CATEGORIES = [
  '综合', '财运', '事业', '婚姻', '感情', '健康', '考试', '学业',
  '出行', '失物', '官讼', '人口', '房产', '求人', '谋划',
]

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  properties: {
    summary: { type: 'string', description: '一句话结论（白话）' },
    data: { type: 'object', additionalProperties: true, description: '结构化卦象数据' },
  },
}

const text = (value) => [{ type: 'text', text: value }]

const DETAIL_PROP = {
  type: 'string',
  enum: ['compact', 'full'],
  description: 'compact=摘要（默认）；full=完整排盘（含六神、伏神、长生、彖象）。',
}

function reportFor(hex, classics, detail) {
  if (detail === 'full') return renderHexagram(hex, classics)
  return renderDigest(hex, classics) + '\n（细看传 detail="full"）'
}

function parseLocalDate(dateArg, timeArg) {
  // dateArg: YYYY-MM-DD，缺省用当前本地时间
  if (!dateArg) {
    const cal = nowCalendar(8)
    return { calendar: cal }
  }
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(dateArg.trim())
  if (!m) throw new Error('日期格式应为 YYYY-MM-DD')
  let hour = 12
  let minute = 0
  if (timeArg) {
    const t = /^(\d{1,2}):(\d{1,2})$/.exec(timeArg.trim())
    if (!t) throw new Error('时间格式应为 HH:MM')
    hour = Number(t[1])
    minute = Number(t[2])
  }
  return { calendar: buildCalendar({ year: Number(m[1]), month: Number(m[2]), day: Number(m[3]), hour, minute }, 8) }
}

function castAndAnalyze(args) {
  const question = String(args.question || '').trim()
  const category = CATEGORIES.includes(args.category) ? args.category : '综合'
  const method = args.method === 'yarrow' ? 'yarrow' : 'coins'
  let lines
  if (Array.isArray(args.lines) && args.lines.length === 6) {
    lines = args.lines.map((v) => {
      const n = Number(v)
      if (![6, 7, 8, 9].includes(n)) throw new Error('爻值只能是 6、7、8、9')
      return { value: n, yin: n === 6 || n === 8, moving: n === 6 || n === 9, label: n === 9 ? '老阳' : n === 8 ? '少阴' : n === 7 ? '少阳' : '老阴' }
    })
  } else {
    lines = tossHexagram(method)
  }
  const { calendar } = parseLocalDate(args.date, args.time)
  const hex = buildHexagram(lines, calendar, { question, category, method })
  return { hex, lines }
}

export function apply(ctx) {
  if (typeof ctx.on === 'function') {
    ctx.on('agent/created', (payload) => applyDedicatedEffort(ctx, payload))
  }
  ctx.tools.register({
    name: 'liuyao_cast',
    description: [
      '六爻纳甲起卦并完成整卦分析（专业排盘 + 白话结论）。',
      '随机摇卦（铜钱法或大衍筮法），自动装卦：八宫世应、纳甲六亲、六神、伏神、旬空、月建日辰、动变（回头生克/进退/反吟伏吟），再以用神旺衰断吉凶、定应期，并引《周易》卦爻辞原文。',
      '默认 compact 摘要省 token；要逐爻细看传 detail="full"。',
      '需要让用户自己摇卦时，请用户按「第1~6爻（自下而上）」报 6/7/8/9，再带 lines 调用。',
    ].join(' '),
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        question: { type: 'string', description: '所问之事，尽量具体（一事一卦）。' },
        category: { type: 'string', enum: CATEGORIES, description: '问题类别，决定用神取法；缺省「综合」（取世爻）。' },
        method: { type: 'string', enum: ['coins', 'yarrow'], description: '起卦法：coins=铜钱（默认），yarrow=大衍筮法。' },
        date: { type: 'string', description: '摇卦日期 YYYY-MM-DD，仅用于复现某次起卦；缺省为当前时间。' },
        time: { type: 'string', description: '摇卦时刻 HH:MM（东八区），缺省 12:00。' },
        detail: DETAIL_PROP,
        lines: {
          type: 'array',
          items: { type: 'integer' },
          description: '自下而上的六爻爻值 6/7/8/9（用户自己摇的卦用这个，不要传 method）。',
        },
      },
      required: ['question'],
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render(args, value) {
        return text(value.summary)
      },
    },
    isConcurrencySafe: () => true,
    presentCall: (args) => ({ card: 'generic', title: `起卦 · ${args.question || ''}（${args.category || '综合'}）`, kind: 'other' }),
    execute(args) {
      const { hex } = castAndAnalyze(args)
      const report = reportFor(hex, classics, args.detail)
      const model = toModelJson(hex, classics)
      return {
        summary: report,
        data: {
          ...model,
          compact: renderCompact(hex),
          linesInput: hex.lines.map((l) => l.value).join(','),
        },
      }
    },
  })

  ctx.tools.register({
    name: 'liuyao_analyze',
    description: [
      '对已经摇出的一卦做完整解读（不再摇卦）：装卦、取用神、判旺衰、断应期、引经传。',
      '用 lines（六爻爻值 6/7/8/9，自下而上）+ 原摇卦的 date/time 复现，结果与当时一致；只给卦名时按静卦解读。',
      '默认 compact 摘要省 token；要逐爻细看传 detail="full"。',
    ].join(' '),
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        question: { type: 'string', description: '所问之事。' },
        category: { type: 'string', enum: CATEGORIES, description: '问题类别，决定用神。' },
        lines: {
          type: 'array',
          items: { type: 'integer' },
          description: '六爻爻值 6/7/8/9，自下而上（用户此前摇出的卦）。',
        },
        date: { type: 'string', description: '原摇卦日期 YYYY-MM-DD；缺省今天。' },
        time: { type: 'string', description: '原摇卦时刻 HH:MM；缺省 12:00。' },
        method: { type: 'string', enum: ['coins', 'yarrow'], description: '仅用于标注起卦方法。' },
        detail: DETAIL_PROP,
      },
      required: ['question'],
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render(args, value) {
        return text(value.summary)
      },
    },
    isConcurrencySafe: () => true,
    presentCall: (args) => ({ card: 'generic', title: `解卦 · ${args.question || ''}`, kind: 'read' }),
    execute(args) {
      if (!Array.isArray(args.lines) || args.lines.length !== 6) {
        throw new Error('缺少 lines：请提供自下而上的六爻爻值（6/7/8/9）。若用户还没摇卦，用 liuyao_cast。')
      }
      const { hex } = castAndAnalyze({ ...args, method: args.method || 'coins' })
      const report = reportFor(hex, classics, args.detail)
      return {
        summary: report,
        data: { ...toModelJson(hex, classics), compact: renderCompact(hex) },
      }
    },
  })

  ctx.tools.register({
    name: 'liuyao_lookup',
    description: [
      '查六十四卦的经传原文、卦义与八宫归属（不含排盘）。',
      '可按卦名、卦序（1-64）或用神类别检索；用于查典、对卦、讲经。',
    ].join(' '),
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string', description: '卦名，如「乾」「屯」「既济」；省略则按 category 或返回八宫概览。' },
        number: { type: 'integer', description: '卦序 1-64。' },
        category: { type: 'string', enum: CATEGORIES, description: '按用神类别列出相关卦（查典用，可选）。' },
      },
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render(args, value) {
        return text(value.summary)
      },
    },
    isConcurrencySafe: () => true,
    presentCall: (args) => ({ card: 'generic', title: `查卦 · ${args.name || args.number || ''}`, kind: 'read' }),
    execute(args) {
      if (args.name || args.number) {
        const hex = args.number
          ? HEXAGRAM_BY_NUMBER.get(Number(args.number))
          : HEXAGRAM_BY_NAME.get(String(args.name).trim())
        if (!hex) throw new Error('没有找到这一卦，请检查卦名或卦序（1-64）')
        const c = classics[hex.number - 1]
        const m = meanings[String(hex.number)]
        const out = [
          `第${hex.number}卦　${hex.name}（${hex.upper}上${hex.lower}下）`,
          m ? `卦义：${m[2]}` : '',
          `卦辞：${c.guaci}`,
          ...c.lines.map((l) => `${l.title}：${l.text}`),
          `彖：${c.tuan}`,
          `象：${c.xiang}`,
        ].filter(Boolean).join('\n')
        return {
          summary: out,
          data: {
            number: hex.number,
            name: hex.name,
            upper: hex.upper,
            lower: hex.lower,
            lines: [...hex.lines].reverse(),
            meaning: m ? m[2] : '',
            guaci: c.guaci,
            tuan: c.tuan,
            xiang: c.xiang,
            yao: c.lines,
          },
        }
      }
      if (args.category) {
        return {
          summary: `「${args.category}」类的用神取法：${
            ({ 财运: '妻财', 事业: '官鬼', 婚姻: '官鬼（女测夫）/妻财（男测妻）', 感情: '世爻为主、应为对方', 健康: '子孙为福神、官鬼为病', 考试: '父母', 学业: '父母', 出行: '世爻', 失物: '妻财', 官讼: '官鬼', 人口: '子孙', 房产: '父母', 求人: '父母', 谋划: '兄弟', 综合: '世爻' }[args.category] || '世爻')
          }。可按卦名或卦序 1-64 查询单卦经传。`,
          data: { category: args.category },
        }
      }
      // 概览：八宫逐宫列出卦序，便于查典
      const PALACES = ['乾', '坎', '艮', '震', '巽', '离', '坤', '兑']
      const groups = [[], [], [], [], [], [], [], []]
      for (const hex of HEXAGRAMS) {
        let info = null
        try {
          info = derivePalace(hex)
        } catch {
          info = null
        }
        const idx = ['乾', '坎', '艮', '震', '巽', '离', '坤', '兑'].indexOf(info ? info.palace : '')
        if (idx >= 0) groups[idx].push({ hex, type: info.type })
      }
      const lines = groups.map((g, i) => `${PALACES[i]}宫：` + g.map((it) => `${it.type}${it.hex.number}${it.hex.name}`).join('　'))
      const summary = [
        '六十四卦八宫表',
        ...lines,
        '',
        '可按卦名、卦序 1-64 查单卦经传；用 liuyao_cast 起卦，liuyao_analyze 解已摇之卦。',
      ].join('\n')
      return { summary, data: { count: HEXAGRAMS.length } }
    },
  })
}
