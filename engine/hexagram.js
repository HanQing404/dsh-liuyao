/**
 * 六爻核心：摇卦 → 装卦（纳甲、六亲、六神、世应、伏神、旬空、动变）→ 用神旺衰 → 断语与应期。
 * 纯函数、确定性（随机数可注入），Host 与浏览器共用。
 */

import {
  TRIGRAMS, TRIGRAM_BY_KEY, HEXAGRAM_BY_LINES, HEXAGRAM_BY_NAME, HEXAGRAM_BY_NUMBER,
  STEMS, BRANCHES, BRANCH_ELEMENT, BRANCH_YINYANG, BRANCH_CLASH, BRANCH_COMBINE, BRANCH_DIRECTION,
  GENERATES, CONTROLS, GENERATED_BY, CONTROLLED_BY, ELEMENT_TOMB, NAJIA, SPIRITS, SPIRIT_MEANING,
  PURE_HEXAGRAMS, TRIPLE_COMBINE, TWELVE_STAGES, STAGE_START, ELEMENT_YINYANG_COLOR,
} from './core-data.js'

/* ------------------------------------------------------------------ *
 * 一、起卦
 * ------------------------------------------------------------------ */

/** 铜钱摇卦：3 枚铜钱一爻。一背二字的概率分布等价于元亨利贞四象。 */
export function tossCoinLine(random = Math.random) {
  let heads = 0
  if (random() < 0.5) heads += 1
  if (random() < 0.5) heads += 1
  if (random() < 0.5) heads += 1
  // 三字 = 老阳(9) 动；二字一背 = 少阴(8)；一字二背 = 少阳(7)；三背 = 老阴(6) 动；
  // 概率：老阳 1/8、少阴 3/8、少阳 3/8、老阴 1/8。
  if (heads === 3) return { value: 9, yin: false, moving: true, label: '老阳', coin: '三字' }
  if (heads === 2) return { value: 8, yin: true, moving: false, label: '少阴', coin: '二字一背' }
  if (heads === 1) return { value: 7, yin: false, moving: false, label: '少阳', coin: '一字二背' }
  return { value: 6, yin: true, moving: true, label: '老阴', coin: '三背' }
}

/** 大衍筮法（蓍草）：三变成一爻。49 策起，每变「分二、挂一、揲四、归奇」。 */
export function tossYarrowLine(random = Math.random) {
  let total = 49
  for (let round = 0; round < 3; round += 1) {
    // 随机分成左右两堆：左手 1..total-1
    let left = 1 + Math.floor(random() * (total - 1))
    if (left >= total) left = total - 1
    const right = total - left
    // 右堆取 1 策挂于指间，再四四数之；余数取 1-4（整除时取 4）
    const rightAfterTake = right - 1
    const leftRem = left % 4 === 0 ? 4 : left % 4
    const rightRem = rightAfterTake % 4 === 0 ? 4 : rightAfterTake % 4
    // 本变归奇之数：左余 + 右余 + 挂一（必为 4 或 8）
    total = total - (leftRem + rightRem + 1)
  }
  // 三变后余策 36 → 老阳(9)，32 → 少阴(8)，28 → 少阳(7)，24 → 老阴(6)
  const map = {
    36: { value: 9, yin: false, moving: true, label: '老阳' },
    32: { value: 8, yin: true, moving: false, label: '少阴' },
    28: { value: 7, yin: false, moving: false, label: '少阳' },
    24: { value: 6, yin: true, moving: true, label: '老阴' },
  }
  const out = map[total]
  if (out) return { ...out, yarrow: total }
  // 兜底（理论不会出现）
  return { value: 7, yin: false, moving: false, label: '少阳', yarrow: total }
}

export function tossHexagram(method = 'coins', random = Math.random) {
  const lines = []
  for (let i = 0; i < 6; i += 1) {
    lines.push(method === 'yarrow' ? tossYarrowLine(random) : tossCoinLine(random))
  }
  return lines
}

/* ------------------------------------------------------------------ *
 * 二、八宫、世应、纳甲
 * ------------------------------------------------------------------ */

/** 八宫 + 世次推导：由本卦逐爻变出 一世…五世、游魂、归魂，落在哪个纯卦即知宫位。 */
export function derivePalace(hex) {
  const binary = hex.lines.slice()
  const primary = binary.join('')
  // 纯卦本身
  const pure = HEXAGRAM_BY_LINES.get(primary)
  if (PURE_HEXAGRAMS.includes(pure.name)) {
    return { palace: pure.name, palaceElement: TRIGRAMS[pure.name].element, type: '八纯', generation: 6, world: 6, response: 3, pureName: pure.name }
  }
  const getVariant = (changed) => {
    const lines = binary.slice()
    for (const pos of changed) lines[pos] = lines[pos] === 1 ? 0 : 1
    return HEXAGRAM_BY_LINES.get(lines.join(''))
  }
  const sequence = []
  // 一世…五世：自初爻起依次变
  const flip = [0, 1, 2, 3, 4]
  for (let n = 1; n <= 5; n += 1) {
    sequence.push({ type: `${['一', '二', '三', '四', '五'][n - 1]}世`, generation: n, world: n, response: ((n + 2) % 6) + 1, hex: getVariant(flip.slice(0, n)) })
  }
  // 游魂：五世之后再变四爻（即再变回四爻）
  sequence.push({ type: '游魂', generation: 4, world: 4, response: 1, hex: getVariant([0, 1, 2, 4]) })
  // 归魂：游魂再复归内卦（下三爻回到本卦），即自上爻看只保留上卦之变
  const youhun = getVariant([0, 1, 2, 4])
  if (youhun) {
    const lines = youhun.lines.slice()
    lines[0] = binary[0]
    lines[1] = binary[1]
    lines[2] = binary[2]
    sequence.push({ type: '归魂', generation: 3, world: 3, response: 6, hex: HEXAGRAM_BY_LINES.get(lines.join('')) })
  }
  for (const step of sequence) {
    if (!step.hex) continue
    if (PURE_HEXAGRAMS.includes(step.hex.name)) {
      return {
        palace: step.hex.name,
        palaceElement: TRIGRAMS[step.hex.name].element,
        type: step.type,
        generation: step.generation,
        world: step.world,
        response: step.response,
        pureName: step.hex.name,
      }
    }
  }
  // 理论不可达
  return { palace: '乾', palaceElement: '金', type: '未知', generation: 1, world: 1, response: 4 }
}

/** 六亲：以宫五行为「我」 */
export function relationOf(palaceElement, element) {
  if (element === palaceElement) return '兄弟'
  if (GENERATES[palaceElement] === element) return '子孙'
  if (GENERATES[element] === palaceElement) return '父母'
  if (CONTROLS[palaceElement] === element) return '妻财'
  if (CONTROLS[element] === palaceElement) return '官鬼'
  return '兄弟'
}

/** 纳甲：本卦六爻的干支（下卦取前三爻、上卦取后三爻） */
export function najiaOf(hex) {
  const lower = NAJIA[hex.lower]
  const upper = NAJIA[hex.upper]
  const stems = [...lower.stems.slice(0, 3), ...upper.stems.slice(3, 6)]
  const branches = [...lower.branches.slice(0, 3), ...upper.branches.slice(3, 6)]
  return branches.map((branch, i) => ({
    position: i + 1,
    stem: stems[i],
    branch,
    element: BRANCH_ELEMENT[branch],
    ganzhi: stems[i] + branch,
  }))
}

/**
 * 六神：按日干起，自初爻向上依次安放（《增删卜易·起六神诀》：
 * 甲乙起青龙，丙丁起朱雀，戊日起勾陈，己日起螣蛇，庚辛起白虎，壬癸起玄武，俱从下起至上）。
 */
const SPIRIT_START = { 甲: 0, 乙: 0, 丙: 1, 丁: 1, 戊: 2, 己: 3, 庚: 4, 辛: 4, 壬: 5, 癸: 5 }
export function spiritsOf(dayStem) {
  const start = SPIRIT_START[dayStem] ?? 0
  return Array.from({ length: 6 }, (_, i) => SPIRITS[(start + i) % 6])
}

/** 单源旺衰：以月建（或日辰）为参照的五行强弱 */
export function sourceStrength(lineElement, refElement) {
  if (lineElement === refElement) return '旺'
  if (GENERATES[refElement] === lineElement) return '相'
  if (GENERATES[lineElement] === refElement) return '休'
  if (CONTROLS[lineElement] === refElement) return '囚'
  if (CONTROLS[refElement] === lineElement) return '死'
  return '休'
}

const SOURCE_RANK = { 旺: 4, 相: 3, 休: 2, 囚: 1, 死: 0 }

/** 月建与日辰合参：月建权重 2、日辰权重 1；临月建/日建各加半分 */
export function strengthScore(lineElement, monthElement, dayElement, sameAsMonthBranch, sameAsDayBranch) {
  const monthRank = SOURCE_RANK[sourceStrength(lineElement, monthElement)]
  const dayRank = SOURCE_RANK[sourceStrength(lineElement, dayElement)]
  return (monthRank * 2 + dayRank) / 3 + (sameAsMonthBranch ? 0.5 : 0) + (sameAsDayBranch ? 0.5 : 0)
}

export function scoreToLevel(s) {
  if (s >= 3.6) return '旺'
  if (s >= 2.6) return '相'
  if (s >= 1.6) return '休'
  if (s >= 0.6) return '囚'
  return '死'
}

/** 旺衰：月建为主、日辰为辅的合参结果 */
export function strengthLevel(lineElement, monthElement, dayElement) {
  if (dayElement === undefined) return sourceStrength(lineElement, monthElement)
  return scoreToLevel(strengthScore(lineElement, monthElement, dayElement, false, false))
}

const STRENGTH_RANK = { 旺: 4, 相: 3, 休: 2, 囚: 1, 死: 0 }

/** 十二长生阶段 */
export function twelveStage(element, branch, yinYang) {
  const conf = STAGE_START[element]
  if (!conf) return null
  const startBranch = conf[yinYang]
  const startIdx = BRANCHES.indexOf(startBranch)
  const idx = BRANCHES.indexOf(branch)
  const offset = yinYang === '阳' ? (idx - startIdx + 12) % 12 : (startIdx - idx + 12) % 12
  return TWELVE_STAGES[offset]
}

/* ------------------------------------------------------------------ *
 * 三、装卦
 * ------------------------------------------------------------------ */

/**
 * 由摇出的六爻（自下而上）与干支历装成一卦。
 * @param {Array<{value:number,yin:boolean,moving:boolean,label:string}>} lines
 * @param {object} calendar buildCalendar 的结果
 * @param {object} options { question, category, method }
 */
export function buildHexagram(lines, calendar, options = {}) {
  const sixLines = lines.map((l) => ({ ...l }))
  const originalLines = sixLines.map((l) => (l.yin ? 0 : 1))
  const changedLines = sixLines.map((l) => (l.moving ? (l.yin ? 1 : 0) : (l.yin ? 0 : 1)))
  const original = HEXAGRAM_BY_LINES.get(originalLines.join(''))
  const changed = changedLines.join('') === originalLines.join('') ? null : HEXAGRAM_BY_LINES.get(changedLines.join(''))

  const palace = derivePalace(original)
  const changedPalace = changed ? derivePalace(changed) : null
  const najia = najiaOf(original)
  const changedNajia = changed ? najiaOf(changed) : null
  const spirits = spiritsOf(calendar.dayStem)
  const monthBranch = calendar.monthBranch || BRANCHES[2]
  const monthElement = BRANCH_ELEMENT[monthBranch]
  const dayBranch = calendar.dayBranch
  const dayElement = BRANCH_ELEMENT[dayBranch]
  const kong = calendar.kong || []
  const world = palace.world
  const response = palace.response
  const movingPositions = sixLines.map((l, i) => (l.moving ? i + 1 : 0)).filter(Boolean)

  const rows = sixLines.map((l, i) => {
    const pos = i + 1
    const base = najia[i]
    const isWorld = pos === world
    const isResponse = pos === response
    const relation = relationOf(palace.palaceElement, base.element)
    const score = strengthScore(base.element, monthElement, dayElement, base.branch === monthBranch, base.branch === dayBranch)
    const line = {
      position: pos,
      yin: l.yin,
      moving: l.moving,
      value: l.value,
      label: l.label,
      spirit: spirits[i],
      stem: base.stem,
      branch: base.branch,
      ganzhi: base.ganzhi,
      element: base.element,
      relation,
      isWorld,
      isResponse,
      empty: kong.includes(base.branch),
      monthClash: BRANCH_CLASH[base.branch] === monthBranch,
      dayClash: BRANCH_CLASH[base.branch] === dayBranch,
      monthCombine: BRANCH_COMBINE[base.branch] === monthBranch,
      dayCombine: BRANCH_COMBINE[base.branch] === dayBranch,
      strengthScore: score,
      strength: scoreToLevel(score),
      stage: twelveStage(base.element, base.branch, BRANCH_YINYANG[base.branch]),
      changed: null,
    }
    if (l.moving && changed) {
      const cb = changedNajia[i]
      const changedElement = cb.element
      const changedRelation = relationOf(palace.palaceElement, changedElement)
      const chScore = strengthScore(changedElement, monthElement, dayElement, cb.branch === monthBranch, cb.branch === dayBranch)
      const transform = {
        branch: cb.branch,
        stem: cb.stem,
        ganzhi: cb.ganzhi,
        element: changedElement,
        relation: changedRelation,
        yin: !l.yin,
        empty: kong.includes(cb.branch),
        strength: scoreToLevel(chScore),
      }      // 动变关系
      const notes = []
      if (changedElement === base.element) {
        const order = ['亥', '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌']
        // 进神：亥→子、寅→卯、巳→午、申→酉、丑→辰、辰→未、未→戌、戌→丑
        const FORWARD = { 亥: '子', 寅: '卯', 巳: '午', 申: '酉', 丑: '辰', 辰: '未', 未: '戌', 戌: '丑' }
        const BACKWARD = { 子: '亥', 卯: '寅', 午: '巳', 酉: '申', 辰: '丑', 未: '辰', 戌: '未', 丑: '戌' }
        if (FORWARD[base.branch] === cb.branch) notes.push('化进神')
        else if (BACKWARD[base.branch] === cb.branch) notes.push('化退神')
        else if (base.branch === cb.branch) notes.push('化伏吟')
      }
      if (GENERATES[changedElement] === base.element) notes.push('化回头生')
      if (CONTROLS[changedElement] === base.element) notes.push('化回头克')
      if (GENERATES[base.element] === changedElement) notes.push('化泄气')
      if (CONTROLS[base.element] === changedElement) notes.push('化耗身')
      if (kong.includes(cb.branch)) notes.push('化空')
      if (ELEMENT_TOMB[changedElement] === cb.branch) notes.push('化入库')
      if (twelveStage(changedElement, cb.branch, BRANCH_YINYANG[cb.branch]) === '绝') notes.push('化绝')
      transform.notes = notes
      transform.reverses = notes.includes('化回头克')
      transform.helps = notes.includes('化回头生') || notes.includes('化进神')
      line.changed = transform
    }
    return line
  })

  // 伏神：本卦六亲不全时，从同宫纯卦中取缺的六亲作伏神
  const present = new Set(rows.map((r) => r.relation))
  const missing = ['父母', '兄弟', '子孙', '妻财', '官鬼'].filter((r) => !present.has(r))
  const hidden = []
  if (missing.length > 0) {
    const pure = HEXAGRAM_BY_NAME.get(palace.pureName || palace.palace)
    const pureNajia = najiaOf(pure)
    for (const rel of missing) {
      for (const item of pureNajia) {
        if (relationOf(palace.palaceElement, item.element) === rel) {
          hidden.push({
            ...item,
            relation: rel,
            underPosition: item.position,
            flying: rows[item.position - 1] ? {
              branch: rows[item.position - 1].branch,
              element: rows[item.position - 1].element,
              relation: rows[item.position - 1].relation,
              strength: rows[item.position - 1].strength,
            } : null,
          })
        }
      }
    }
  }

  // 卦体特征
  const pairClash = (a, b) => BRANCH_CLASH[a] === b || BRANCH_CLASH[b] === a
  const pairCombine = (a, b) => BRANCH_COMBINE[a] === b || BRANCH_COMBINE[b] === a
  const allClash = rows.every((row) => {
    const other = rows.find((r) => r.position === ((row.position + 2) % 6) + 1)
    return other && pairClash(row.branch, other.branch)
  })
  const allCombine = rows.every((row) => {
    const other = rows.find((r) => r.position === ((row.position + 2) % 6) + 1)
    return other && pairCombine(row.branch, other.branch)
  })
  const features = []
  if (allClash) features.push('六冲卦')
  if (allCombine) features.push('六合卦')
  if (changed) {
    const oe = palace.palaceElement
    const ce = changedPalace.palaceElement
    // 京房反吟：之卦与本卦分属相克之宫（金→火、木→金……）
    if (CONTROLS[oe] === ce || CONTROLS[ce] === oe) features.push('反吟')
    // 伏吟：之卦同宫（含八纯互变、内外卦反复）
    if (oe === ce && palace.palace === changedPalace.palace) features.push('伏吟')
  }
  // 六冲卦化六冲：先吉后散之象，单独标注
  if (changed && !allClash) {
    const pairClashCheck = (a2, b2) => BRANCH_CLASH[a2] === b2 || BRANCH_CLASH[b2] === a2
    const chLines = changedNajia.map((x) => x.branch)
    const changedClash = chLines.every((br, idx) => {
      const otherIdx = ((idx + 2) % 6)
      return pairClashCheck(br, chLines[otherIdx])
    })
    if (changedClash) features.push('变六冲')
  }

  return {
    created: calendar.date,
    calendar,
    question: options.question || '',
    category: options.category || '综合',
    method: options.method || 'coins',
    original: { ...original, palace, najia },
    changed: changed ? { ...changed, palace: changedPalace, najia: changedNajia } : null,
    movingPositions,
    lines: rows,
    hidden,
    spirits,
    world,
    response,
    features,
    month: { branch: monthBranch, element: monthElement, stem: calendar.month ? calendar.month[0] : null },
    day: { branch: dayBranch, element: dayElement, stem: calendar.dayStem },
    kong,
  }
}

/* ------------------------------------------------------------------ *
 * 四、用神与旺衰断法
 * ------------------------------------------------------------------ */

/** 问题分类 → 用神取法 */
export const USE_GOD_RULES = {
  综合: { relation: '世爻', why: '泛问自身处境，以世爻为我' },
  财运: { relation: '妻财', why: '财以妻财为用神' },
  事业: { relation: '官鬼', why: '官鬼主官职、事业、功名' },
  婚姻: { relation: '官鬼', why: '女测夫以官鬼，男测妻以妻财；此处按「对象/成家」取官鬼（男测可改看妻财）' },
  感情: { relation: '世爻', why: '感情双方，以世（自己）应为对方' },
  健康: { relation: '子孙', why: '子孙为医药、福神，测病吉神；鬼为病' },
  考试: { relation: '父母', why: '父母主文书、成绩、学业' },
  学业: { relation: '父母', why: '父母主文书、学业' },
  出行: { relation: '世爻', why: '出行以世为行人，应为目的地' },
  失物: { relation: '妻财', why: '失物以妻财为财物' },
  官讼: { relation: '官鬼', why: '官讼以官鬼为对方/官府' },
  人口: { relation: '子孙', why: '问子女以子孙' },
  房产: { relation: '父母', why: '父母主房屋田土' },
  求人: { relation: '父母', why: '父母主文书、引荐' },
  谋划: { relation: '兄弟', why: '兄弟主同辈、合作、伙伴' },
}

const BENIGN = '吉'
const OMEN = '凶'

/** 用神旺衰 + 动变 + 生克冲合综合分析 */
export function analyzeUseGod(hex) {
  const rule = USE_GOD_RULES[hex.category] || USE_GOD_RULES['综合']
  let useRelation = rule.relation
  let useLine = null
  let useNote = rule.why

  if (useRelation === '世爻') {
    useLine = hex.lines.find((l) => l.isWorld)
    useNote = '用神取世爻（代表求测人自身）'
  } else {
    const candidates = hex.lines.filter((l) => l.relation === useRelation)
    if (candidates.length === 0) {
      // 伏神
      const hidden = hex.hidden.find((h) => h.relation === useRelation)
      if (hidden) {
        useLine = { ...hidden, hidden: true, position: hidden.underPosition }
        useNote = `${rule.why}；本卦不上卦，取伏神（伏于第${hidden.underPosition}爻下）`
      }
    } else if (candidates.length === 1) {
      useLine = candidates[0]
      useNote = rule.why
    } else {
      // 多现：取动者、取旺者、取临世应者
      const moving = candidates.filter((l) => l.moving)
      if (moving.length === 1) {
        useLine = moving[0]
        useNote = `${rule.why}；用神多现，取动者`
      } else {
        const pool = moving.length > 1 ? moving : candidates
        const rank = (l) => STRENGTH_RANK[l.strength] + (l.isWorld ? 0.5 : 0) + (l.isResponse ? 0.3 : 0) + (l.empty ? -1 : 0)
        useLine = pool.slice().sort((a, b) => rank(b) - rank(a))[0]
        useNote = `${rule.why}；用神多现，取旺相/临世应者`
      }
    }
  }

  if (!useLine) {
    return { rule, useRelation, useLine: null, useNote: `${rule.why}；卦中与伏神俱无该六亲，需看世应及卦名再断` }
  }

  const useElement = useLine.element
  const strength = useLine.strength || scoreToLevel(useLine.strengthScore ?? 0)
  useLine.strength = strength
  const score = [0]
  const findings = []

  findings.push({
    kind: '旺衰',
    text: `用神${useLine.relation}${useLine.hidden ? '（伏神）' : ''}${useLine.ganzhi}${useElement}，${strength}（月建${hex.month.branch}·日辰${hex.day.branch}）`,
    score: STRENGTH_RANK[strength] - 2,
  })
  score[0] += STRENGTH_RANK[strength] - 2
  if (strength === '旺' || strength === '相') findings[findings.length - 1].tone = 'good'
  if (strength === '死' || strength === '囚') findings[findings.length - 1].tone = 'bad'

  // 日辰生克（旺衰分已计，这里只补「临日建」这一强调）
  if (hex.day.branch === useLine.branch) {
    findings.push({ kind: '日辰', text: `用神临日建（与日辰同支），当下得气`, score: 0, tone: 'good' })
  } else if (GENERATES[hex.day.element] === useElement) {
    findings.push({ kind: '日辰', text: `日辰${hex.day.stem}${hex.day.branch}${hex.day.element}生用神`, score: 0, tone: 'good' })
  } else if (CONTROLS[hex.day.element] === useElement) {
    findings.push({ kind: '日辰', text: `日辰${hex.day.stem}${hex.day.branch}${hex.day.element}克用神`, score: 0, tone: 'bad' })
  }

  // 月破
  if (BRANCH_CLASH[useLine.branch] === hex.month.branch) {
    score[0] -= 2
    findings.push({ kind: '月破', text: `用神${useLine.branch}被月建${hex.month.branch}冲破（月破），破则难用`, score: -2, tone: 'bad' })
  }
  // 旬空
  if (useLine.empty) {
    const strong = STRENGTH_RANK[strength] >= 3
    score[0] -= strong ? 0.5 : 1.5
    findings.push({
      kind: '旬空',
      text: strong ? `用神旬空（${hex.kong.join('、')}空），旺而空者暂空，出空/填实可用` : `用神旬空（${hex.kong.join('、')}空）而休囚，真空难成`,
      score: strong ? -0.5 : -1.5,
      tone: strong ? 'warn' : 'bad',
    })
  }
  // 入墓
  if (ELEMENT_TOMB[useElement] === hex.day.branch) {
    score[0] -= 1
    findings.push({ kind: '入墓', text: `用神入日墓（${hex.day.branch}为${useElement}库），受困待冲开`, score: -1, tone: 'bad' })
  }
  // 伏神
  if (useLine.hidden) {
    const flying = useLine.flying
    if (flying) {
      if (GENERATES[flying.element] === useElement) {
        score[0] += 0.5
        findings.push({ kind: '伏神', text: `伏神得飞神（${flying.relation}${flying.branch}）生扶，伏而可出`, score: 0.5, tone: 'good' })
      } else if (CONTROLS[flying.element] === useElement) {
        score[0] -= 1
        findings.push({ kind: '伏神', text: `飞神（${flying.relation}${flying.branch}）克伏神，伏而难出`, score: -1, tone: 'bad' })
      } else {
        findings.push({ kind: '伏神', text: `伏神藏于飞神（${flying.relation}${flying.branch}）之下，需待伏神值日/冲飞`, score: 0, tone: 'warn' })
      }
    }
  }

  // 动爻
  for (const line of hex.lines) {
    if (!line.moving) continue
    if (line.position === useLine.position && !useLine.hidden) continue
    const rel = line.relation
    if (GENERATES[line.element] === useElement) {
      score[0] += 1.5
      findings.push({ kind: '动爻', text: `第${line.position}爻${rel}${line.ganzhi}${line.element}动而生用神`, score: 1.5, tone: 'good' })
    } else if (CONTROLS[line.element] === useElement) {
      score[0] -= 1.5
      findings.push({ kind: '动爻', text: `第${line.position}爻${rel}${line.ganzhi}${line.element}动而克用神`, score: -1.5, tone: 'bad' })
    }
    if (line.dayClash) {
      findings.push({ kind: '暗动', text: `第${line.position}爻${rel}${line.ganzhi}被日辰冲为暗动`, score: 0, tone: 'warn' })
    }
  }

  // 用神自身动变
  if (!useLine.hidden) {
    const line = hex.lines[useLine.position - 1]
    if (line.moving) {
      if (line.changed) {
        const ch = line.changed
        if (ch.notes.includes('化回头生') || ch.notes.includes('化进神')) {
          score[0] += 1.5
          findings.push({ kind: '动变', text: `用神动化${ch.ganzhi}${ch.element}（${ch.notes.join('、')}）`, score: 1.5, tone: 'good' })
        } else if (ch.notes.includes('化回头克')) {
          score[0] -= 2
          findings.push({ kind: '动变', text: `用神动化${ch.ganzhi}${ch.element}回头克，得而复失`, score: -2, tone: 'bad' })
        } else if (ch.notes.includes('化退神')) {
          score[0] -= 1.5
          findings.push({ kind: '动变', text: `用神化退神${ch.ganzhi}，事渐退`, score: -1.5, tone: 'bad' })
        } else if (ch.notes.includes('化空') || ch.notes.includes('化入库') || ch.notes.includes('化绝')) {
          score[0] -= 1
          findings.push({ kind: '动变', text: `用神动化${ch.ganzhi}（${ch.notes.join('、')}）`, score: -1, tone: 'bad' })
        } else {
          findings.push({ kind: '动变', text: `用神动化${ch.ganzhi}${ch.element}`, score: 0, tone: 'warn' })
        }
      }
    } else {
      // 静而不动：日辰冲之为暗动
      if (line.dayClash) {
        findings.push({ kind: '暗动', text: `第${line.position}爻${line.relation}${line.ganzhi}静而逢日冲，为暗动，暗中有变`, score: 0, tone: 'warn' })
      }
      const hasSupport = hex.lines.some((l) => l.moving && GENERATES[l.element] === useElement)
      if (!hasSupport && strength === '死') {
        findings.push({ kind: '动静', text: '用神安静而休囚，无动爻生扶，事难自起', score: 0, tone: 'warn' })
      }
    }
  }

  // 用忌神：用神所喜（生用神者）与被克（克用神者）
  const useGeneratingElement = GENERATED_BY[useElement]
  const useControlElement = CONTROLLED_BY[useElement]
  const favorable = hex.lines.filter((l) => l.element === useGeneratingElement).map((l) => `第${l.position}爻${l.relation}${l.ganzhi}`)
  const hostile = hex.lines.filter((l) => l.element === useControlElement).map((l) => `第${l.position}爻${l.relation}${l.ganzhi}`)

  const total = Math.max(0, Math.min(10, Math.round((score[0] + 5) * 10) / 10))
  let verdict
  if (total >= 6.5) verdict = '吉'
  else if (total >= 4) verdict = '平'
  else verdict = '凶'
  if (hex.features.includes('六冲卦') && verdict === '吉') {
    verdict = '先吉后散'
    findings.push({ kind: '卦体', text: '六冲卦主散、主急，吉事难久', score: 0, tone: 'warn' })
  }
  if (hex.features.includes('六合卦') && verdict === '凶') verdict = '迟滞未散'

  return {
    rule,
    useRelation,
    useLine,
    useNote,
    strength,
    score: total,
    verdict,
    findings,
    favorable: [...new Set(favorable)],
    hostile: [...new Set(hostile)],
  }
}

/* ------------------------------------------------------------------ *
 * 五、应期
 * ------------------------------------------------------------------ */

function branchOf(a) { return BRANCHES.indexOf(a) }
function nextBranch(fromBranch, toBranch) {
  return (branchOf(toBranch) - branchOf(fromBranch) + 12) % 12
}

/** 地支组合 → 估计应验时间（以摇卦日为基准） */
export function estimateTiming(hex, analysis) {
  const out = []
  const dayBranch = hex.day.branch
  const use = analysis.useLine
  if (!use) {
    return [{ basis: '卦体', text: '用神不明，应期难定；可看世应之动与卦数', when: '视事而定' }]
  }
  const baseBranch = use.branch
  const isMoving = !use.hidden && use.moving
  if (use.hidden) {
    out.push({ basis: '伏神', text: `用神伏藏，待伏神值日（${baseBranch}）或冲飞神之日而现`, when: `${baseBranch}日`, days: nextBranch(dayBranch, baseBranch) })
  }
  if (use.empty) {
    out.push({ basis: '旬空', text: `用神旬空，出旬填实（${baseBranch}）或冲空之日应`, when: `${baseBranch}日`, days: nextBranch(dayBranch, baseBranch) })
    out.push({ basis: '冲空', text: `冲空之日亦可应（${BRANCH_CLASH[baseBranch]}日）`, when: `${BRANCH_CLASH[baseBranch]}日`, days: nextBranch(dayBranch, BRANCH_CLASH[baseBranch]) })
  }
  if (BRANCH_CLASH[baseBranch] === hex.month.branch) {
    out.push({ basis: '月破', text: `用神月破，待合破（${BRANCH_COMBINE[hex.month.branch]}月/日）或出破之月方应`, when: `${BRANCH_COMBINE[hex.month.branch]}日`, days: nextBranch(dayBranch, BRANCH_COMBINE[hex.month.branch]) })
  }
  if (isMoving) {
    const ch = hex.lines[use.position - 1].changed
    if (ch && ch.notes.includes('化进神')) {
      out.push({ basis: '化进', text: `用神化进神，应于变爻${ch.branch}之日`, when: `${ch.branch}日`, days: nextBranch(dayBranch, ch.branch) })
    }
    if (ch && ch.notes.includes('化回头生')) {
      out.push({ basis: '回头生', text: `用神化回头生，应于${ch.branch}日`, when: `${ch.branch}日`, days: nextBranch(dayBranch, ch.branch) })
    }
  }
  if (out.length === 0) {
    if (analysis.strength === '旺' || analysis.strength === '相') {
      out.push({ basis: '安静旺相', text: `用神安静而旺相，应于值日或冲日起用（${baseBranch}日 / ${BRANCH_CLASH[baseBranch]}日）`, when: `${baseBranch}日`, days: nextBranch(dayBranch, baseBranch) })
      out.push({ basis: '冲起', text: `冲起之日（${BRANCH_CLASH[baseBranch]}日）亦应`, when: `${BRANCH_CLASH[baseBranch]}日`, days: nextBranch(dayBranch, BRANCH_CLASH[baseBranch]) })
    } else {
      // 生扶之月：取生用神之五行、同用神之五行所对应的月支（地支月建）
      const useElement = use.element
      const supportingElements = [GENERATED_BY[useElement], useElement]
      const months = BRANCHES
        .filter((b) => supportingElements.includes(BRANCH_ELEMENT[b]))
        .sort((a, b) => ((BRANCHES.indexOf(a) - BRANCHES.indexOf(hex.month.branch) + 12) % 12) - ((BRANCHES.indexOf(b) - BRANCHES.indexOf(hex.month.branch) + 12) % 12))
        .slice(0, 4)
      out.push({
        basis: '休囚',
        text: `用神${useElement}休囚，须待${months.map((m) => m + '月').join('、')}（生扶用神之月）方有转机`,
        when: months.map((m) => m + '月').join(' / '),
        days: null,
      })
    }
  }
  return out
}

/* ------------------------------------------------------------------ *
 * 六、断语与白话
 * ------------------------------------------------------------------ */

const VERDICT_PLAIN = {
  吉: '这件事整体是顺的，照现在的方向做有戏。',
  平: '这件事成不成看过程，机会与阻力都有一半，关键在时机和分寸。',
  凶: '这件事阻力偏大，硬推容易受伤或白费，宜缓、宜退、宜换个做法。',
  先吉后散: '开头能成，但中途容易散掉，别把结果抱太死。',
  迟滞未散: '眼下卡着，但还没断气，只是拖得久，需要等。',
}

export function plainLanguage(hex, analysis, timing) {
  const parts = []
  parts.push(VERDICT_PLAIN[analysis.verdict] || VERDICT_PLAIN['平'])
  const name = hex.original.name
  const img = hex.original.upper in TRIGRAMS ? `${TRIGRAMS[hex.original.upper].nature}在上、${TRIGRAMS[hex.original.lower].nature}在下` : ''
  const RELATION_PLAIN = {
    父母: '文书、房子、长辈、学业这类事',
    兄弟: '同辈、朋友、合伙人、竞争',
    子孙: '子女、下属、医药、福气',
    妻财: '钱、财物、妻子/对象',
    官鬼: '工作、官职、丈夫/对象、也是灾病',
    世爻: '你自己',
  }
  if (analysis.useLine) {
    const rel = analysis.useRelation
    parts.push(`这件事主要看「${rel in RELATION_PLAIN ? RELATION_PLAIN[rel] : rel}」（卦里叫${rel}）。`)
    const strengthPlain = { 旺: '底气最足', 相: '底气不错', 休: '底气一般', 囚: '底气偏弱', 死: '底气最弱' }[analysis.useLine.strength] || '底气一般'
    parts.push(`而代表它的那一爻${analysis.useLine.ganzhi}${analysis.useLine.element}，眼下${strengthPlain}。`)
  } else {
    parts.push(`卦里没有直接对应这件事的爻，只能从整体卦象看。`)
  }
  const top = analysis.findings.filter((f) => f.tone === 'bad').slice(0, 2)
  if (top.length) parts.push(`要留意：${top.map((f) => f.text).join('；')}。`)
  if (timing && timing.length) parts.push(`时间上：${timing[0].text}。`)
  if (hex.features.length) {
    const FEATURE_PLAIN = { 六冲卦: '偏快、偏散', 六合卦: '偏慢、偏和', 反吟: '易反复', 伏吟: '易原地打转', 变六冲: '后势易散' }
    parts.push(`卦象气质：${hex.features.map((f) => FEATURE_PLAIN[f] || f).join('、')}。`)
  }
  return parts.join('')
}

/** 六神点睛：世爻、用神上的六神含义 */
export function spiritNotes(hex, analysis) {
  const out = []
  const world = hex.lines.find((l) => l.isWorld)
  if (world) out.push(`世爻${world.ganzhi}临${world.spirit}：${SPIRIT_MEANING[world.spirit]}（主自身状态）`)
  if (analysis.useLine && !analysis.useLine.hidden) {
    const line = hex.lines[analysis.useLine.position - 1]
    out.push(`用神${line.ganzhi}临${line.spirit}：${SPIRIT_MEANING[line.spirit]}（主所问之事的气象）`)
  }
  return out
}

/** 趋避建议：由用神五行、六神、卦象给出可执行的提示 */
export function advice(hex, analysis, timing) {
  const out = []
  const use = analysis.useLine
  if (use) {
    const color = ELEMENT_YINYANG_COLOR[use.element]
    const dir = BRANCH_DIRECTION[use.branch]
    out.push(`用神属${use.element}，取${color}色、${dir}方位为助；重要动作可挑${use.branch}日、${BRANCH_COMBINE[use.branch]}日。`)
  }
  if (analysis.verdict === '凶' || analysis.verdict === '迟滞未散') {
    out.push('忌神当令时不宜强攻：先止损、留退路，把决策推迟到应期之后再定。')
  }
  if (hex.features.includes('六冲卦')) out.push('六冲主快、主散：宜快刀斩乱麻、一次了断，不宜拖。')
  if (hex.features.includes('六合卦')) out.push('六合主慢、主和：宜谈、宜托人、宜慢慢磨，不宜快。')
  if (hex.movingPositions.length >= 4) out.push('动爻过多，变数大：先抓最要紧的一爻（用神所在）看，其余作噪音。')
  const spirit = hex.lines.find((l) => l.isWorld)?.spirit
  if (spirit === '白虎') out.push('世临白虎：防病伤、争执、路上急事。')
  if (spirit === '玄武') out.push('世临玄武：防暗昧、欺瞒与私下是非。')
  if (spirit === '朱雀') out.push('世临朱雀：说话、签字、文书要格外当心。')
  return out
}

/* ------------------------------------------------------------------ *
 * 七、总装
 * ------------------------------------------------------------------ */

export function analyze(hex) {
  const useGod = analyzeUseGod(hex)
  const timing = estimateTiming(hex, useGod)
  const plain = plainLanguage(hex, useGod, timing)
  const spirits = spiritNotes(hex, useGod)
  const tips = advice(hex, useGod, timing)
  return { useGod, timing, plain, spirits, tips }
}

/** 从四柱字符串或显式参数给出一个可用于排盘的最小日历 */
export function calendarFromFields(fields) {
  const {
    date, yearPillar, monthPillar, dayPillar, hourPillar,
  } = fields
  if (date && yearPillar && monthPillar && dayPillar) {
    const dayStem = dayPillar[0]
    const dayBranch = dayPillar[1]
    const monthBranch = monthPillar[1]
    const idx = STEMS.indexOf(dayStem)
    const branchIdx = BRANCHES.indexOf(dayBranch)
    // 由日柱推旬空
    let xunStart = branchIdx - (branchIdx % 1)
    const kongMap = xunKongFromDay(dayStem, dayBranch)
    return {
      date,
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      dayStem,
      dayBranch,
      hour: hourPillar || '',
      monthBranch,
      kong: kongMap.kong,
      xun: kongMap.xun,
      solarTerm: null,
      manual: true,
    }
  }
  return null
}

function xunKongFromDay(dayStem, dayBranch) {
  const s = STEMS.indexOf(dayStem)
  const b = BRANCHES.indexOf(dayBranch)
  // 旬首：在 60 甲子中，天干地支同时回退到甲
  let n = 0
  for (let i = 0; i < 60; i += 1) {
    if (i % 10 === s && i % 12 === b) {
      n = i
      break
    }
  }
  const start = n - (n % 10)
  return {
    xun: STEMS[start % 10] + BRANCHES[start % 12],
    kong: [BRANCHES[(start + 10) % 12], BRANCHES[(start + 11) % 12]],
  }
}

export { STRENGTH_RANK }
