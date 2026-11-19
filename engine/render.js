/**
 * 呈现层：把装好的卦渲染成「一眼能看懂的白话 → 专业卦盘 → 断语 → 应期 → 经典原文」。
 */

import { TRIGRAMS, SPIRIT_MEANING, BRANCH_DIRECTION, ELEMENT_YINYANG_COLOR } from './core-data.js'
import { analyze, relationOf } from './hexagram.js'

const POS = ['初', '二', '三', '四', '五', '上']
const YAO_TITLE = ['初', '二', '三', '四', '五', '上']

/** 显示宽度：CJK 与全角符号按 2 计 */
export function displayWidth(s) {
  let w = 0
  for (const ch of s) {
    const code = ch.codePointAt(0)
    const wide = (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe4f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x20000 && code <= 0x3fffd)
    w += wide ? 2 : 1
  }
  return w
}

function padDisplay(s, width) {
  const w = displayWidth(s)
  return w >= width ? s : s + ' '.repeat(width - w)
}

export function yaoTitle(line) {
  const diao = line.yin ? '六' : '九'
  if (line.position === 1) return '初' + diao
  if (line.position === 6) return '上' + diao
  return diao + YAO_TITLE[line.position - 1]
}

function symbol(line) {
  if (!line.moving) return line.yin ? '▅▅　▅▅' : '▅▅▅▅▅'
  return line.yin ? '▅▅×▅▅' : '▅▅▅○▅▅'
}

/** 把一卦渲染为固定宽度的盘面文本（供对话与工具结果使用） */
export function renderHexagram(hex, classics, options = {}) {
  const withClassics = options.withClassics !== false
  const a = analyze(hex)
  const lines = hex.lines
  const out = []

  out.push('════════ 六爻排盘 ════════')
  out.push(`问事：${hex.question || '（未填）'}　类别：${hex.category}`)
  out.push(`时间：${hex.created}　${hex.calendar.year}年 ${hex.calendar.month}月 ${hex.calendar.day}日${hex.calendar.hour ? ' ' + hex.calendar.hour + '时' : ''}`)
  out.push(`月建：${hex.month.stem || ''}${hex.month.branch}（${hex.month.element}）　日辰：${hex.day.stem}${hex.day.branch}（${hex.day.element}）　旬空：${hex.kong.join('、') || '无'}`)
  out.push('')

  const title = `${hex.original.name}　（${TRIGRAMS[hex.original.upper].nature}上${TRIGRAMS[hex.original.lower].nature}下）　${hex.original.palace.palace}宫${hex.original.palace.type}`
  out.push(title)
  if (hex.changed) out.push(`变卦：${hex.changed.name}　（${hex.changed.palace.type}）`)
  if (hex.features.length) out.push(`卦体：${hex.features.join('、')}`)
  if (hex.movingPositions.length) out.push(`动爻：${hex.movingPositions.map((p) => '第' + p + '爻').join('、')}`)
  else out.push('动爻：无（静卦，以卦辞、大象断）')
  out.push('')

  // 爻位表（自下而上，一行一爻；列宽按内容自适应，保证等宽字体下对齐）
  const tableRows = []
  for (let i = 5; i >= 0; i -= 1) {
    const l = lines[i]
    const hidden = hex.hidden.filter((h) => h.underPosition === l.position)
    const hiddenText = hidden.map((h) => `${h.relation}${h.ganzhi}`).join(' ') || '—'
    const yao = l.moving ? (l.yin ? '▅▅×▅▅' : '▅▅▅○▅▅') : l.yin ? '▅▅　▅▅' : '▅▅▅▅▅'
    const posName = ['初', '二', '三', '四', '五', '上'][l.position - 1]
    const gang = l.ganzhi + l.element
    const changedText = l.changed ? `${l.changed.ganzhi}${l.changed.element}${l.changed.notes.length ? '·' + l.changed.notes.join('·') : ''}` : '—'
    const tags = []
    if (l.empty) tags.push('空')
    if (l.monthClash) tags.push('破')
    if (l.dayClash && !l.moving) tags.push('冲')
    const tail = `${l.relation}${gang}` + (tags.length ? `[${tags.join('')}]` : '')
    const mark = l.isWorld ? '世' : l.isResponse ? '应' : '　'
    tableRows.push([l.spirit, hiddenText, yao + posName, changedText, tail, mark])
  }
  const headers = ['六神', '伏神', '本卦', '变卦', '六亲纳甲', '世应']
  const widths = headers.map((head, idx) => Math.max(displayWidth(head), ...tableRows.map((row) => displayWidth(row[idx]))))
  const rule = (left, mid, right) => left + widths.map((w) => '─'.repeat(w + 2)).join(mid) + right
  out.push(rule('┌', '┬', '┐'))
  out.push('│ ' + headers.map((head, idx) => padDisplay(head, widths[idx])).join(' │ ') + ' │')
  out.push(rule('├', '┼', '┤'))
  for (const row of tableRows) {
    out.push('│ ' + row.map((cell, idx) => padDisplay(cell, widths[idx])).join(' │ ') + ' │')
  }
  out.push(rule('└', '┴', '┘'))
  out.push('')

  // 旺衰表（旺衰 = 五行对月建日辰的强弱；长生位另列，勿混读）
  out.push('─ 旺衰（月建日辰合参） ─')
  out.push(lines.map((l) => `第${l.position}爻${l.relation}${l.ganzhi}：${l.strength}`).join('　'))
  out.push('─ 长生（本爻地支之十二长生，供细节参考） ─')
  out.push(lines.map((l) => `第${l.position}爻：${l.stage || '—'}`).join('　'))
  out.push('')

  // 用神
  out.push('─ 用神 ─')
  out.push(a.useGod.useNote)
  if (a.useGod.useLine) {
    out.push(`用神：第${a.useGod.useLine.position}爻 ${a.useGod.useLine.relation}${a.useGod.useLine.ganzhi}${a.useGod.useLine.element}（${a.useGod.strength}）${a.useGod.useLine.hidden ? '［伏神］' : ''}`)
  }
  out.push('')

  // 判断依据
  out.push('─ 断卦依据 ─')
  for (const f of a.useGod.findings) {
    const tone = f.tone === 'good' ? '＋' : f.tone === 'bad' ? '－' : '·'
    out.push(`${tone}${f.kind}：${f.text}`)
  }
  out.push(`评分：${a.useGod.score}/10　结论：${a.useGod.verdict}`)
  out.push('')

  // 应期
  out.push('─ 应期 ─')
  for (const t of a.timing) out.push(`· ${t.basis}：${t.text}`)
  out.push('')

  // 白话
  out.push('─ 白话解读 ─')
  out.push(a.plain)
  out.push('')

  // 六神
  if (a.spirits.length) {
    out.push('─ 六神点睛 ─')
    for (const s of a.spirits) out.push('· ' + s)
    out.push('')
  }

  // 趋避
  if (a.tips.length) {
    out.push('─ 趋避建议 ─')
    for (const t of a.tips) out.push('· ' + t)
    out.push('')
  }

  // 经典原文
  if (withClassics && classics) {
    const c = classics[hex.original.number - 1]
    if (c) {
      out.push('─ 本卦经传 ─')
      out.push(`卦辞：${c.guaci}`)
      const moving = lines.filter((l) => l.moving)
      if (moving.length) {
        out.push('动爻（按传统以动爻爻辞为断）：')
        for (const l of moving) {
          const title = yaoTitle(l)
          const item = c.lines.find((x) => x.title === title)
          if (item) out.push(`　${title}：${item.text}`)
        }
      } else {
        out.push('无动爻，以卦辞、大象断。')
      }
      out.push(`彖：${c.tuan}`)
      out.push(`象：${c.xiang}`)
      if (hex.changed) {
        const cc = classics[hex.changed.number - 1]
        if (cc) out.push(`变卦「${hex.changed.name}」卦辞：${cc.guaci}`)
      }
      out.push('')
    }
  }

  out.push('════════════════════════')
  return out.join('\n')
}

/** 摘要版：给 Agent 用的事实清单（不带等宽表、不带彖象全文），约为完整排盘的 1/4 篇幅 */
export function renderDigest(hex, classics) {
  const a = analyze(hex)
  const palace = hex.original.palace
  const out = []

  const head = `${hex.original.name}${hex.changed ? ' 之 ' + hex.changed.name : '（静卦）'}｜${palace.palace}宫${palace.type}`
    + (hex.features.length ? '｜' + hex.features.join('、') : '')
    + (hex.movingPositions.length ? '｜动' + hex.movingPositions.join('、') + '爻' : '')
  out.push(head)
  out.push(`问：${hex.question || '（未填）'}（${hex.category}）　${hex.created}`)
  out.push(`月建${hex.month.stem || ''}${hex.month.branch}　日辰${hex.day.stem}${hex.day.branch}　旬空${hex.kong.join('') || '无'}`)

  const POS_NAMES = ['初', '二', '三', '四', '五', '上']
  const lines = hex.lines.map((l) => {
    const tags = []
    if (l.isWorld) tags.push('世')
    if (l.isResponse) tags.push('应')
    if (l.moving) tags.push('动')
    if (l.empty) tags.push('空')
    if (l.monthClash) tags.push('破')
    if (l.dayClash && !l.moving) tags.push('冲')
    const hidden = hex.hidden.filter((x) => x.underPosition === l.position)
    const hiddenText = hidden.length ? '伏' + hidden.map((x) => x.relation + x.ganzhi).join('、') : ''
    const changed = l.changed
      ? `→${l.changed.ganzhi}${l.changed.element}` + (l.changed.notes.length ? '（' + l.changed.notes.join('、') + '）' : '')
      : ''
    return `${POS_NAMES[l.position - 1]}${l.relation}${l.ganzhi}${l.element}（${l.strength}${tags.length ? '·' + tags.join('') : ''}）${hiddenText}${changed}`
  })
  out.push('爻（自下）：' + lines.join('　'))

  out.push('用神：' + a.useGod.useNote
    + (a.useGod.useLine
      ? `｜第${a.useGod.useLine.position}爻${a.useGod.useLine.relation}${a.useGod.useLine.ganzhi}${a.useGod.useLine.element}（${a.useGod.strength}）${a.useGod.useLine.hidden ? '［伏神］' : ''}`
      : ''))
  if (a.useGod.findings.length) {
    out.push('依据：' + a.useGod.findings
      .map((f) => `${f.tone === 'good' ? '＋' : f.tone === 'bad' ? '－' : '·'}${f.kind}：${f.text}`)
      .join('；'))
  }
  out.push(`评分 ${a.useGod.score}/10　结论 ${a.useGod.verdict}`)
  if (a.timing.length) out.push('应期：' + a.timing.map((t) => t.text).join('；'))
  if (a.tips.length) out.push('趋避：' + a.tips.map((t) => t.replace(/^·\s*/, '').replace(/[。；]$/, '')).join('；'))

  if (classics) {
    const c = classics[hex.original.number - 1]
    if (c) {
      const moving = hex.lines.filter((l) => l.moving)
      const yaoText = moving.length
        ? moving
          .map((l) => {
            const item = c.lines.find((x) => x.title === yaoTitle(l))
            return item ? `${item.title}：${item.text}` : ''
          })
          .filter(Boolean)
          .join('／')
        : ''
      out.push(`卦辞：${c.guaci}${yaoText ? '｜动爻 ' + yaoText : '（无动爻，以卦辞大象断）'}`)
      if (hex.changed) {
        const cc = classics[hex.changed.number - 1]
        if (cc) out.push(`变卦「${hex.changed.name}」卦辞：${cc.guaci}`)
      }
    }
  }

  return out.join('\n')
}

/** 精简版（用于面板卡片、列表） */
export function renderCompact(hex) {
  const a = analyze(hex)
  return {
    name: hex.original.name,
    changed: hex.changed ? hex.changed.name : null,
    palace: hex.original.palace.palace + '宫' + hex.original.palace.type,
    verdict: a.useGod.verdict,
    score: a.useGod.score,
    useGod: a.useGod.useLine ? `${a.useGod.useLine.relation}${a.useGod.useLine.ganzhi}(${a.useGod.strength})` : '不明',
    plain: a.plain,
    timing: a.timing.map((t) => t.text),
    features: hex.features,
  }
}

/** 工具结果用的结构化 JSON（紧凑，不外溢长篇白话） */
export function toModelJson(hex, classics) {
  const a = analyze(hex)
  const c = classics ? classics[hex.original.number - 1] : null
  const moving = hex.lines.filter((l) => l.moving).map((l) => ({
    position: l.position,
    title: yaoTitle(l),
    text: hex.changed ? (c && c.lines.find((x) => x.title === yaoTitle(l))?.text) || '' : '',
  }))
  return {
    question: hex.question,
    category: hex.category,
    created: hex.created,
    calendar: {
      year: hex.calendar.year, month: hex.calendar.month, day: hex.calendar.day,
      hour: hex.calendar.hour, monthBranch: hex.month.branch, dayBranch: hex.day.branch, kong: hex.kong,
    },
    original: {
      name: hex.original.name,
      number: hex.original.number,
      upper: hex.original.upper,
      lower: hex.original.lower,
      palace: hex.original.palace.palace,
      palaceElement: hex.original.palace.palaceElement,
      type: hex.original.palace.type,
      world: hex.world,
      response: hex.response,
      features: hex.features,
    },
    changed: hex.changed ? { name: hex.changed.name, number: hex.changed.number } : null,
    lines: hex.lines.slice().reverse().map((l) => ({
      position: l.position,
      title: yaoTitle(l),
      spirit: l.spirit,
      relation: l.relation,
      ganzhi: l.ganzhi,
      element: l.element,
      moving: l.moving,
      world: l.isWorld,
      response: l.isResponse,
      empty: l.empty,
      strength: l.strength,
      changed: l.changed ? { ganzhi: l.changed.ganzhi, relation: l.changed.relation, notes: l.changed.notes } : null,
      hidden: hex.hidden.filter((h) => h.underPosition === l.position).map((h) => ({ relation: h.relation, ganzhi: h.ganzhi })),
    })),
    useGod: {
      rule: a.useGod.useNote,
      relation: a.useGod.useRelation,
      line: a.useGod.useLine ? {
        position: a.useGod.useLine.position,
        relation: a.useGod.useLine.relation,
        ganzhi: a.useGod.useLine.ganzhi,
        element: a.useGod.useLine.element,
        strength: a.useGod.strength,
        hidden: !!a.useGod.useLine.hidden,
      } : null,
      findings: a.useGod.findings.map((f) => `${f.tone === 'good' ? '＋' : f.tone === 'bad' ? '－' : '·'}${f.kind}：${f.text}`),
      score: a.useGod.score,
      verdict: a.useGod.verdict,
    },
    timing: a.timing.map((t) => ({ basis: t.basis, text: t.text, when: t.when })),
    plain: a.plain,
    spirits: a.spirits,
    advice: a.tips,
    classical: c ? {
      guaci: c.guaci,
      tuan: c.tuan,
      xiang: c.xiang,
      movingLines: moving,
      changedGuaci: hex.changed && classics[hex.changed.number - 1] ? classics[hex.changed.number - 1].guaci : null,
    } : null,
  }
}

export { analyze }
