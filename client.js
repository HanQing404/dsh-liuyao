window.__ModuleLoader__.load({
  id: 'dsh-liuyao',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useMemo, useRef } = React

/* —— core-data —— */
/**
 * 六爻基础数据：八卦、五行、干支、六神、六亲、六十四卦名与卦序。
 * 纯数据 + 纯函数，可同时运行在 Host 与 Client（浏览器）两端。
 */

const TRIGRAMS = {
  乾: { index: 0, lines: [1, 1, 1], element: '金', nature: '天', direction: '西北', family: '父', image: '天', attr: '健' },
  兑: { index: 1, lines: [1, 1, 0], element: '金', nature: '泽', direction: '西', family: '少女', image: '泽', attr: '悦' },
  离: { index: 2, lines: [1, 0, 1], element: '火', nature: '火', direction: '南', family: '中女', image: '火', attr: '丽' },
  震: { index: 3, lines: [1, 0, 0], element: '木', nature: '雷', direction: '东', family: '长男', image: '雷', attr: '动' },
  巽: { index: 4, lines: [0, 1, 1], element: '木', nature: '风', direction: '东南', family: '长女', image: '风', attr: '入' },
  坎: { index: 5, lines: [0, 1, 0], element: '水', nature: '水', direction: '北', family: '中男', image: '水', attr: '陷' },
  艮: { index: 6, lines: [0, 0, 1], element: '土', nature: '山', direction: '东北', family: '少男', image: '山', attr: '止' },
  坤: { index: 7, lines: [0, 0, 0], element: '土', nature: '地', direction: '西南', family: '母', image: '地', attr: '顺' },
}

const TRIGRAM_BY_KEY = {}
for (const [key, v] of Object.entries(TRIGRAMS)) TRIGRAM_BY_KEY[v.lines.join('')] = key

/** 六十四卦：行=上卦、列=下卦（行序 乾兑离震巽坎艮坤，列序 乾兑离震巽坎艮坤）→ 卦名 + 卦序（King Wen 序）。 */
const GRID_NAMES = [
  //       下乾  下兑    下离    下震    下巽    下坎   下艮    下坤
  ['乾', '履', '同人', '无妄', '姤', '讼', '遁', '否'], // 上乾
  ['夬', '兑', '革', '随', '大过', '困', '咸', '萃'], // 上兑
  ['大有', '睽', '离', '噬嗑', '鼎', '未济', '旅', '晋'], // 上离
  ['大壮', '归妹', '丰', '震', '恒', '解', '小过', '豫'], // 上震
  ['小畜', '中孚', '家人', '益', '巽', '涣', '渐', '观'], // 上巽
  ['需', '节', '既济', '屯', '井', '坎', '蹇', '比'], // 上坎
  ['大畜', '损', '贲', '颐', '蛊', '蒙', '艮', '剥'], // 上艮
  ['泰', '临', '明夷', '复', '升', '师', '谦', '坤'], // 上坤
]

const GRID_NUMBERS = [
  [1, 10, 13, 25, 44, 6, 33, 12],
  [43, 58, 49, 17, 28, 47, 31, 45],
  [14, 38, 30, 21, 50, 64, 56, 35],
  [34, 54, 55, 51, 32, 40, 62, 16],
  [9, 61, 37, 42, 57, 59, 53, 20],
  [5, 60, 63, 3, 48, 29, 39, 8],
  [26, 41, 22, 27, 18, 4, 52, 23],
  [11, 19, 36, 24, 46, 7, 15, 2],
]

/** 卦名 → { number, upper, lower, lines(自下而上 0/1) } */
const HEXAGRAMS = []
const HEXAGRAM_BY_NAME = new Map()
const HEXAGRAM_BY_LINES = new Map()

const TRIGRAM_ORDER = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤']
for (let u = 0; u < 8; u += 1) {
  for (let l = 0; l < 8; l += 1) {
    const upper = TRIGRAM_ORDER[u]
    const lower = TRIGRAM_ORDER[l]
    const name = GRID_NAMES[u][l]
    const number = GRID_NUMBERS[u][l]
    const lines = [...TRIGRAMS[lower].lines, ...TRIGRAMS[upper].lines]
    const hex = { name, number, upper, lower, lines, binary: lines.join('') }
    HEXAGRAMS.push(hex)
    HEXAGRAM_BY_NAME.set(name, hex)
    HEXAGRAM_BY_LINES.set(hex.binary, hex)
  }
}
HEXAGRAMS.sort((a, b) => a.number - b.number)

const HEXAGRAM_BY_NUMBER = new Map(HEXAGRAMS.map((h) => [h.number, h]))

/** 六十四卦名（依卦序），用于快捷查找与展示。 */
const HEXAGRAM_NAMES = HEXAGRAMS.map((h) => h.name)

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

const STEM_ELEMENT = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
}
const STEM_YINYANG = { 甲: '阳', 乙: '阴', 丙: '阳', 丁: '阴', 戊: '阳', 己: '阴', 庚: '阳', 辛: '阴', 壬: '阳', 癸: '阴' }

const BRANCH_ELEMENT = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
}
const BRANCH_YINYANG = {
  子: '阳', 丑: '阴', 寅: '阳', 卯: '阴', 辰: '阳', 巳: '阴', 午: '阳', 未: '阴', 申: '阳', 酉: '阴', 戌: '阳', 亥: '阴',
}
const BRANCH_ANIMALS = {
  子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇', 午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪',
}
/** 地支方位（用于趋避建议） */
const BRANCH_DIRECTION = {
  子: '北', 丑: '东北', 寅: '东北', 卯: '东', 辰: '东南', 巳: '东南',
  午: '南', 未: '西南', 申: '西南', 酉: '西', 戌: '西北', 亥: '西北',
}

const ELEMENTS = ['金', '木', '水', '火', '土']

/** 五行相生：key 生 value */
const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
/** 五行相克：key 克 value */
const CONTROLS = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }
/** 被生者 */
const GENERATED_BY = { 火: '木', 土: '火', 金: '土', 水: '金', 木: '水' }
/** 被克者 */
const CONTROLLED_BY = { 土: '木', 水: '土', 火: '水', 金: '火', 木: '金' }

const ELEMENT_YINYANG_COLOR = { 金: '白', 木: '青', 水: '黑', 火: '红', 土: '黄' }

/** 六亲 */
const RELATIONS = ['父母', '兄弟', '子孙', '妻财', '官鬼']

/** 六神（按日干起，阳日顺行、阴日逆行） */
const SPIRITS = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']
const SPIRIT_MEANING = {
  青龙: '喜庆、财帛、贵人、正事',
  朱雀: '口舌、文书、消息、争讼',
  勾陈: '田土、房产、迟滞、牵连',
  螣蛇: '虚惊、怪异、纠缠、缠绕',
  白虎: '病伤、丧事、刚猛、道路',
  玄武: '暗中、盗贼、私情、欺骗',
}

/** 六冲（地支相冲） */
const BRANCH_CLASH = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' }
/** 六合（地支相合） */
const BRANCH_COMBINE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' }

/** 三合局（申子辰水、亥卯未木、寅午戌火、巳酉丑金） */
const TRIPLE_COMBINE = [
  { branches: ['申', '子', '辰'], element: '水' },
  { branches: ['亥', '卯', '未'], element: '木' },
  { branches: ['寅', '午', '戌'], element: '火' },
  { branches: ['巳', '酉', '丑'], element: '金' },
]

/** 五行墓库 */
const ELEMENT_TOMB = { 水: '辰', 土: '辰', 木: '未', 火: '戌', 金: '丑' }

/** 十二长生（阳顺阴逆；用于化绝、旺衰判断） */
const TWELVE_STAGES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养']
const STAGE_START = {
  木: { 阳: '亥', 阴: '午' },
  火: { 阳: '寅', 阴: '酉' },
  金: { 阳: '巳', 阴: '子' },
  水: { 阳: '申', 阴: '卯' },
  土: { 阳: '申', 阴: '卯' },
}

/** 纳甲：各卦六爻的天干地支（自下而上）。乾纳甲壬、坤纳乙癸，余卦纳本卦天干。 */
const NAJIA = {
  乾: { stems: ['甲', '甲', '甲', '壬', '壬', '壬'], branches: ['子', '寅', '辰', '午', '申', '戌'] },
  坤: { stems: ['乙', '乙', '乙', '癸', '癸', '癸'], branches: ['未', '巳', '卯', '丑', '亥', '酉'] },
  震: { stems: ['庚', '庚', '庚', '庚', '庚', '庚'], branches: ['子', '寅', '辰', '午', '申', '戌'] },
  巽: { stems: ['辛', '辛', '辛', '辛', '辛', '辛'], branches: ['丑', '亥', '酉', '未', '巳', '卯'] },
  坎: { stems: ['戊', '戊', '戊', '戊', '戊', '戊'], branches: ['寅', '辰', '午', '申', '戌', '子'] },
  离: { stems: ['己', '己', '己', '己', '己', '己'], branches: ['卯', '丑', '亥', '酉', '未', '巳'] },
  艮: { stems: ['丙', '丙', '丙', '丙', '丙', '丙'], branches: ['辰', '午', '申', '戌', '子', '寅'] },
  兑: { stems: ['丁', '丁', '丁', '丁', '丁', '丁'], branches: ['巳', '卯', '丑', '亥', '酉', '未'] },
}

/** 八宫纯卦（用于伏神与宫位判定） */
const PURE_HEXAGRAMS = ['乾', '坎', '艮', '震', '巽', '离', '坤', '兑']

/** 卦身（世爻地支，部分流派用；这里给月卦身口诀备查） */
const HEXAGRAM_BODY_RULE = '阳世还从子月起，阴世还从午月起；欲得卦身安在哪，世爻位上数到今。'

/* —— calendar —— */
/**
 * 干支历：公历 → 年/月/日/时 四柱干支、旬空、节气月建。
 * 六爻以「日辰」为断卦之纲，故这里按节气（立春换年、节气换月）计算。
 * 纯函数，无依赖，可同时跑在 Host 与浏览器。
 */


const MS_PER_DAY = 86400000
const J2000 = 2451545.0

function julianDayNumber(year, month, day) {
  // month 1-12, day 1-31（格里历）
  let y = year
  let m = month
  if (m <= 2) {
    y -= 1
    m += 12
  }
  const a = Math.floor(y / 100)
  const b = 2 - a + Math.floor(a / 4)
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5
}

function dateFromJdn(jdn) {
  // 只用于把含小数的 JDN 转成 UTC 时刻
  const ms = (jdn - 2440587.5) * MS_PER_DAY
  return new Date(Math.round(ms))
}

/** 太阳视黄经（度），低精度但足够定节气（误差 < 1 分钟量级） */
function sunLongitude(jde) {
  const t = (jde - J2000) / 36525
  const rad = Math.PI / 180
  const l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t
  const m = 357.52911 + 35999.05029 * t - 0.0001537 * t * t
  const c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m * rad) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * m * rad) +
    0.000289 * Math.sin(3 * m * rad)
  const trueLong = l0 + c
  const omega = 125.04 - 1934.136 * t
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * rad)
  return ((lambda % 360) + 360) % 360
}

/** 求某年某个太阳黄经（度）对应的 UTC 时刻，返回 JDN（含小数） */
function solveSolarLongitude(year, targetLongitude) {
  // 用 3 月 20 日（春分附近）作为搜索起点更稳，这里直接从当年 1 月 1 日做粗搜
  let jd = julianDayNumber(year, 1, 1)
  const step = 1
  let prev = sunLongitude(jd)
  let best = null
  for (let i = 0; i < 370; i += step) {
    const cur = sunLongitude(jd)
    const prevDiff = ((prev - targetLongitude + 540) % 360) - 180
    const curDiff = ((cur - targetLongitude + 540) % 360) - 180
    if (prevDiff < 0 && curDiff >= 0) {
      // 在 [jd-1, jd] 区间内
      let lo = jd - 1
      let hi = jd
      for (let k = 0; k < 40; k += 1) {
        const mid = (lo + hi) / 2
        const diff = ((sunLongitude(mid) - targetLongitude + 540) % 360) - 180
        if (diff < 0) lo = mid
        else hi = mid
      }
      best = (lo + hi) / 2
      break
    }
    prev = cur
    jd += step
  }
  return best
}

/** 二十四节气（以春分为 0°，按黄经排序） */
const SOLAR_TERMS = [
  { name: '春分', longitude: 0, month: 2 },
  { name: '清明', longitude: 15, month: 3 },
  { name: '谷雨', longitude: 30, month: 3 },
  { name: '立夏', longitude: 45, month: 4 },
  { name: '小满', longitude: 60, month: 4 },
  { name: '芒种', longitude: 75, month: 5 },
  { name: '夏至', longitude: 90, month: 5 },
  { name: '小暑', longitude: 105, month: 6 },
  { name: '大暑', longitude: 120, month: 6 },
  { name: '立秋', longitude: 135, month: 7 },
  { name: '处暑', longitude: 150, month: 7 },
  { name: '白露', longitude: 165, month: 8 },
  { name: '秋分', longitude: 180, month: 8 },
  { name: '寒露', longitude: 195, month: 9 },
  { name: '霜降', longitude: 210, month: 9 },
  { name: '立冬', longitude: 225, month: 10 },
  { name: '小雪', longitude: 240, month: 10 },
  { name: '大雪', longitude: 255, month: 11 },
  { name: '冬至', longitude: 270, month: 11 },
  { name: '小寒', longitude: 285, month: 12 },
  { name: '大寒', longitude: 300, month: 12 },
  { name: '立春', longitude: 315, month: 1 },
  { name: '雨水', longitude: 330, month: 1 },
  { name: '惊蛰', longitude: 345, month: 2 },
]

/** 「节」：换月建用的 12 个节气（立春、惊蛰、清明…） */
const JIE_TERMS = [
  { name: '立春', longitude: 315, monthIndex: 0 }, // 寅月
  { name: '惊蛰', longitude: 345, monthIndex: 1 }, // 卯月
  { name: '清明', longitude: 15, monthIndex: 2 }, // 辰月
  { name: '立夏', longitude: 45, monthIndex: 3 }, // 巳月
  { name: '芒种', longitude: 75, monthIndex: 4 }, // 午月
  { name: '小暑', longitude: 105, monthIndex: 5 }, // 未月
  { name: '立秋', longitude: 135, monthIndex: 6 }, // 申月
  { name: '白露', longitude: 165, monthIndex: 7 }, // 酉月
  { name: '寒露', longitude: 195, monthIndex: 8 }, // 戌月
  { name: '立冬', longitude: 225, monthIndex: 9 }, // 亥月
  { name: '大雪', longitude: 255, monthIndex: 10 }, // 子月
  { name: '小寒', longitude: 285, monthIndex: 11 }, // 丑月
]

const termCache = new Map()

/** 某年某「节」的 UTC 时刻（JDN） */
function jieInstant(year, term) {
  const key = year + ':' + term.name
  if (termCache.has(key)) return termCache.get(key)
  // 小寒、立春等落在年初的节气，其黄经求解时用当年即可；
  // 大雪（255°）在 12 月，也属当年。
  const jd = solveSolarLongitude(year, term.longitude)
  termCache.set(key, jd)
  return jd
}

/** 干支序号（0-59）→ 甲子字符串 */
function sexagenary(index) {
  const n = ((index % 60) + 60) % 60
  return STEMS[n % 10] + BRANCHES[n % 12]
}

/** 日柱：返回 0-59 的甲子序。锚点：2000-01-01（UTC 正午）= 戊午（54） */
function dayPillarIndex(year, month, day) {
  const jdn = julianDayNumber(year, month, day) // 该日 0 时对应的 JDN 为 X.5
  const anchor = julianDayNumber(2000, 1, 1) // 2000-01-01 的 JDN（X.5）
  const diff = Math.round(jdn - anchor)
  return ((54 + diff) % 60 + 60) % 60
}

/** 旬空：由日柱序号得旬首及空亡二支 */
function xunKong(dayIndex) {
  const n = ((dayIndex % 60) + 60) % 60
  const xunStart = n - (n % 10) // 旬首序号（甲某）
  const kongIndexA = (xunStart + 10) % 12
  const kongIndexB = (xunStart + 11) % 12
  return {
    xun: STEMS[xunStart % 10] + BRANCHES[xunStart % 12],
    kong: [BRANCHES[kongIndexA], BRANCHES[kongIndexB]],
  }
}

/** 年柱：以立春为界 */
function yearPillarIndex(year, month, day) {
  let y = year
  if (month < 2) y -= 1
  else if (month === 2) {
    const lichun = jieInstant(year, JIE_TERMS[0])
    const jdn = julianDayNumber(year, month, day)
    if (jdn < lichun) y -= 1
  }
  // 1984 甲子年
  return ((y - 1984) % 60 + 60) % 60
}

/** 月柱：由节气月建（寅月为 1 月）与年干按五虎遁推 */
function monthPillarIndex(yearPillar, monthIndex /* 0=寅 */) {
  const yearStem = yearPillar % 10
  // 五虎遁：甲己之年丙作首，乙庚之岁戊为头，丙辛必定寻庚起，丁壬壬位顺行流，戊癸何方发，甲寅之上好追求
  const startStem = ((yearStem % 5) * 2 + 2) % 10 // 寅月的天干序号
  const stem = ((startStem + monthIndex) % 10 + 10) % 10
  const branch = (2 + monthIndex) % 12 // 寅 = 2
  // 组成 60 甲子序号
  let idx = stem
  while (idx % 12 !== branch) idx += 10
  return ((idx % 60) + 60) % 60
}

/** 时柱：由日干按五鼠遁推 */
function hourPillarIndex(dayPillar, hourBranch) {
  const dayStem = dayPillar % 10
  // 五鼠遁：甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸何方发，壬子是真途
  const startStem = ((dayStem % 5) * 2) % 10
  const stem = ((startStem + hourBranch) % 10 + 10) % 10
  let idx = stem
  while (idx % 12 !== hourBranch) idx += 10
  return ((idx % 60) + 60) % 60
}

function hourBranchOf(date) {
  const h = date.getHours()
  return Math.floor(((h + 1) % 24) / 2) // 23:00-00:59 子=0
}

/**
 * 由某地的「本地时间」生成完整干支历。
 * @param {{year:number,month:number,day:number,hour:number,minute:number}} local
 * @param {number} utcOffsetHours 默认 +8（东八区）
 */
function buildCalendar(local, utcOffsetHours = 8) {
  const { year, month, day } = local
  const hour = local.hour ?? 12
  const minute = local.minute ?? 0

  // 本地时刻 → UTC 的 JDN，用于节气比较
  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - utcOffsetHours * 3600000
  const utcJdn = utcMs / MS_PER_DAY + 2440587.5

  // 节气月：找到最近一个已过的「节」
  let monthIndex = 11 // 丑月（小寒后）
  let currentTerm = null
  for (let y = year - 1; y <= year; y += 1) {
    for (const term of JIE_TERMS) {
      const at = jieInstant(y, term)
      if (at !== null && at <= utcJdn) {
        const prevBest = currentTerm ? currentTerm.at : -Infinity
        if (at > prevBest) {
          currentTerm = { ...term, at }
          monthIndex = term.monthIndex
        }
      }
    }
  }

  const dayIdx = dayPillarIndex(year, month, day)
  const yearIdx = yearPillarIndex(year, month, day)
  const monthIdx = monthPillarIndex(yearIdx, monthIndex)
  const hourBranch = hourBranchOf({ getHours: () => hour })
  const hourIdx = hourPillarIndex(dayIdx, hourBranch)
  const kong = xunKong(dayIdx)

  return {
    date: `${year}年${month}月${day}日 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    year: sexagenary(yearIdx),
    yearIndex: yearIdx,
    month: sexagenary(monthIdx),
    monthIndex,
    monthBranch: BRANCHES[(2 + monthIndex) % 12],
    day: sexagenary(dayIdx),
    dayIndex: dayIdx,
    dayStem: STEMS[dayIdx % 10],
    dayBranch: BRANCHES[dayIdx % 12],
    hour: sexagenary(hourIdx),
    hourBranch: BRANCHES[hourBranch],
    hourIndex: hourIdx,
    xun: kong.xun,
    kong: kong.kong,
    solarTerm: currentTerm ? currentTerm.name : null,
    solarTerms: SOLAR_TERMS.map((t) => {
      const at = solveSolarLongitude(year, t.longitude)
      return { name: t.name, at: at === null ? null : dateFromJdn(at).toISOString() }
    }),
  }
}

/** 当前时刻的干支历（按给定时区，默认东八区） */
function nowCalendar(utcOffsetHours = 8) {
  const now = new Date()
  const shifted = new Date(now.getTime() + utcOffsetHours * 3600000)
  return buildCalendar(
    {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
    },
    utcOffsetHours,
  )
}

/* —— hexagram —— */
/**
 * 六爻核心：摇卦 → 装卦（纳甲、六亲、六神、世应、伏神、旬空、动变）→ 用神旺衰 → 断语与应期。
 * 纯函数、确定性（随机数可注入），Host 与浏览器共用。
 */


/* ------------------------------------------------------------------ *
 * 一、起卦
 * ------------------------------------------------------------------ */

/** 铜钱摇卦：3 枚铜钱一爻。一背二字的概率分布等价于元亨利贞四象。 */
function tossCoinLine(random = Math.random) {
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
function tossYarrowLine(random = Math.random) {
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

function tossHexagram(method = 'coins', random = Math.random) {
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
function derivePalace(hex) {
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
function relationOf(palaceElement, element) {
  if (element === palaceElement) return '兄弟'
  if (GENERATES[palaceElement] === element) return '子孙'
  if (GENERATES[element] === palaceElement) return '父母'
  if (CONTROLS[palaceElement] === element) return '妻财'
  if (CONTROLS[element] === palaceElement) return '官鬼'
  return '兄弟'
}

/** 纳甲：本卦六爻的干支（下卦取前三爻、上卦取后三爻） */
function najiaOf(hex) {
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
function spiritsOf(dayStem) {
  const start = SPIRIT_START[dayStem] ?? 0
  return Array.from({ length: 6 }, (_, i) => SPIRITS[(start + i) % 6])
}

/** 单源旺衰：以月建（或日辰）为参照的五行强弱 */
function sourceStrength(lineElement, refElement) {
  if (lineElement === refElement) return '旺'
  if (GENERATES[refElement] === lineElement) return '相'
  if (GENERATES[lineElement] === refElement) return '休'
  if (CONTROLS[lineElement] === refElement) return '囚'
  if (CONTROLS[refElement] === lineElement) return '死'
  return '休'
}

const SOURCE_RANK = { 旺: 4, 相: 3, 休: 2, 囚: 1, 死: 0 }

/** 月建与日辰合参：月建权重 2、日辰权重 1；临月建/日建各加半分 */
function strengthScore(lineElement, monthElement, dayElement, sameAsMonthBranch, sameAsDayBranch) {
  const monthRank = SOURCE_RANK[sourceStrength(lineElement, monthElement)]
  const dayRank = SOURCE_RANK[sourceStrength(lineElement, dayElement)]
  return (monthRank * 2 + dayRank) / 3 + (sameAsMonthBranch ? 0.5 : 0) + (sameAsDayBranch ? 0.5 : 0)
}

function scoreToLevel(s) {
  if (s >= 3.6) return '旺'
  if (s >= 2.6) return '相'
  if (s >= 1.6) return '休'
  if (s >= 0.6) return '囚'
  return '死'
}

/** 旺衰：月建为主、日辰为辅的合参结果 */
function strengthLevel(lineElement, monthElement, dayElement) {
  if (dayElement === undefined) return sourceStrength(lineElement, monthElement)
  return scoreToLevel(strengthScore(lineElement, monthElement, dayElement, false, false))
}

const STRENGTH_RANK = { 旺: 4, 相: 3, 休: 2, 囚: 1, 死: 0 }

/** 十二长生阶段 */
function twelveStage(element, branch, yinYang) {
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
function buildHexagram(lines, calendar, options = {}) {
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
const USE_GOD_RULES = {
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
function analyzeUseGod(hex) {
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
function estimateTiming(hex, analysis) {
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

function plainLanguage(hex, analysis, timing) {
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
function spiritNotes(hex, analysis) {
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
function advice(hex, analysis, timing) {
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

function analyze(hex) {
  const useGod = analyzeUseGod(hex)
  const timing = estimateTiming(hex, useGod)
  const plain = plainLanguage(hex, useGod, timing)
  const spirits = spiritNotes(hex, useGod)
  const tips = advice(hex, useGod, timing)
  return { useGod, timing, plain, spirits, tips }
}

/** 从四柱字符串或显式参数给出一个可用于排盘的最小日历 */
function calendarFromFields(fields) {
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


/* —— render —— */
/**
 * 呈现层：把装好的卦渲染成「一眼能看懂的白话 → 专业卦盘 → 断语 → 应期 → 经典原文」。
 */



const POS = ['初', '二', '三', '四', '五', '上']
const YAO_TITLE = ['初', '二', '三', '四', '五', '上']

/** 显示宽度：CJK 与全角符号按 2 计 */
function displayWidth(s) {
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

function yaoTitle(line) {
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
function renderHexagram(hex, classics, options = {}) {
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
function renderDigest(hex, classics) {
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
function renderCompact(hex) {
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
function toModelJson(hex, classics) {
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


const CLASSICS = [{"number":1,"name":"乾","guaci":"元亨。利贞。","lines":[{"title":"初九","text":"潜龙勿用。"},{"title":"九二","text":"见龙在田，利见大人。"},{"title":"九三","text":"君子终日乾乾，夕惕若；厉，无咎。"},{"title":"九四","text":"或跃在渊，无咎。"},{"title":"九五","text":"飞龙在天，利见大人。"},{"title":"上九","text":"亢龙，有悔。"},{"title":"用九","text":"见群龙无首，吉。"}],"tuan":"大哉乾元，万物资始，乃统天。云行雨施，品物流形，大明终始，六位时成。时乘六龙以御天，乾道变化，各正性命，保合大和，乃利贞。首出庶物，万国咸宁。","xiang":"天行健，君子以自强不息。"},{"number":2,"name":"坤","guaci":"元亨。利牝马之贞。君子有攸往，先迷后得主。利西南得朋，东北丧朋。安贞，吉。","lines":[{"title":"初六","text":"履霜，坚冰至。"},{"title":"六二","text":"直方大，不习无不利。"},{"title":"六三","text":"含章，可贞。或从王事，无成有终。"},{"title":"六四","text":"括囊，无咎无誉。"},{"title":"六五","text":"黄裳，元吉。"},{"title":"上六","text":"龙战于野，其血玄黄。"},{"title":"用六","text":"利永贞。"}],"tuan":"至哉坤元，万物资生，乃顺承天。坤厚载物，德合无疆；含弘光大，品物咸亨。牝马地类，行地无疆，柔顺利贞。君子攸行，先迷失道，后顺得常。西南得朋，乃与类行，东北丧朋，乃终有庆。安贞之吉，应地无疆。","xiang":"地势坤，君子以厚德载物。"},{"number":3,"name":"屯","guaci":"元亨，利贞。勿用有攸往，利建侯。","lines":[{"title":"初九","text":"磐桓，利居贞，利建侯。"},{"title":"六二","text":"屯如邅如，乘马班如，匪寇婚媾，女子贞不字，十年乃字。"},{"title":"六三","text":"即鹿无虞，惟入于林中，君子几不如舍，往吝。"},{"title":"六四","text":"乘马班如，求婚媾，往，吉无不利。"},{"title":"九五","text":"屯其膏；小贞吉，大贞凶。"},{"title":"上六","text":"乘马班如，泣血涟如。"}],"tuan":"屯，刚柔始交而难生，动乎险中，大亨贞。雷雨之动满盈，天造草昧，宜建侯而不宁。","xiang":"云雷，屯；君子以经纶。"},{"number":4,"name":"蒙","guaci":"亨。匪我求童蒙，童蒙求我。初筮告，再三渎，渎则不告。利贞。","lines":[{"title":"初六","text":"发蒙，利用刑人，用说桎梏，以往吝。"},{"title":"九二","text":"包蒙吉，纳妇吉，子克家。"},{"title":"六三","text":"勿用取女，见金夫，不有躬，无攸利。"},{"title":"六四","text":"困蒙，吝。"},{"title":"六五","text":"童蒙，吉。"},{"title":"上九","text":"击蒙，不利为寇，利御寇。"}],"tuan":"蒙，山下有险，险而止，蒙。蒙亨，以亨行，时中也。匪我求童蒙，童蒙求我，志应也。初筮告，以刚中也。再三渎，渎则不告，渎蒙也。蒙以养正，圣功也。","xiang":"山下出泉，蒙；君子以果行育德。"},{"number":5,"name":"需","guaci":"有孚，光亨。贞吉，利涉大川。","lines":[{"title":"初九","text":"需于郊，利用恒，无咎。"},{"title":"九二","text":"需于沙，小有言，终吉。"},{"title":"九三","text":"需于泥，致寇至。"},{"title":"六四","text":"需于血，出自穴。"},{"title":"九五","text":"需于酒食，贞吉。"},{"title":"上六","text":"入于穴，有不速之客三人来，敬之终吉。"}],"tuan":"需，须也，险在前也；刚健而不陷，其义不困穷矣。需，有孚，光亨，贞吉，位乎天位，以正中也。利涉大川，往有功也。","xiang":"云上于天，需；君子以饮食宴乐。"},{"number":6,"name":"讼","guaci":"有孚，窒，惕，中吉，终凶。利见大人，不利涉大川。","lines":[{"title":"初六","text":"不永所事，小有言，终吉。"},{"title":"九二","text":"不克讼，归而逋，其邑人三百户无眚。"},{"title":"六三","text":"食旧德，贞厉，终吉。或从王事，无成。"},{"title":"九四","text":"不克讼，复即命渝，安贞吉。"},{"title":"九五","text":"讼，元吉。"},{"title":"上九","text":"或锡之鞶带，终朝三褫之。"}],"tuan":"讼，上刚下险，险而健，讼。讼，有孚，窒，惕，中吉，刚来而得中也。终凶，讼不可成也。利见大人，尚中正也。不利涉大川，入于渊也。","xiang":"天与水违行，讼；君子以作事谋始。"},{"number":7,"name":"师","guaci":"贞丈人吉，无咎。","lines":[{"title":"初六","text":"师出以律，否臧，凶。"},{"title":"九二","text":"在师中吉，无咎；王三锡命。"},{"title":"六三","text":"师或舆尸，凶。"},{"title":"六四","text":"师左次，无咎。"},{"title":"六五","text":"田有禽，利执言，无咎。长子帅师，弟子舆尸，贞凶。"},{"title":"上六","text":"大君有命，开国承家，小人勿用。"}],"tuan":"师，众也。贞，正也。能以众正，可以王矣。刚中而应，行险而顺，以此毒天下，而民从之，吉又何咎矣。","xiang":"地中有水，师；君子以容民畜众。"},{"number":8,"name":"比","guaci":"吉。原筮元永贞，无咎。不宁方来，后夫凶。","lines":[{"title":"初六","text":"有孚，比之，无咎。有孚盈缶，终来有它，吉。"},{"title":"六二","text":"比之自内，贞吉。"},{"title":"六三","text":"比之匪人。"},{"title":"六四","text":"外比之，贞吉。"},{"title":"九五","text":"显比。王用三驱，失前禽，邑人不诫，吉。"},{"title":"上六","text":"比之无首，凶。"}],"tuan":"比，吉也。比，辅也，下顺从也。原筮，元永贞，无咎，以刚中也。不宁方来，上下应也。后夫凶，其道穷也。","xiang":"地上有水，比；先王以建万国，亲诸侯。"},{"number":9,"name":"小畜","guaci":"亨。密云不雨，自我西郊。","lines":[{"title":"初九","text":"复自道，何其咎，吉。"},{"title":"九二","text":"牵复，吉。"},{"title":"九三","text":"车说輹，夫妻反目。"},{"title":"六四","text":"有孚，血去惕出，无咎。"},{"title":"九五","text":"有孚挛如，富以其邻。"},{"title":"上九","text":"既雨既处，尚得载，妇贞厉，月几望，君子征凶。"}],"tuan":"小畜，柔得位而上下应之，曰小畜。健而巽，刚中而志行，乃亨。密云不雨，尚往也。自我西郊，施未行也。","xiang":"风行天上，小畜，君子以懿文德。"},{"number":10,"name":"履","guaci":"履虎尾，不咥人，亨。","lines":[{"title":"初九","text":"素履，往无咎。"},{"title":"九二","text":"履道坦坦，幽人贞吉。"},{"title":"六三","text":"眇能视，跛能履，履虎尾，咥人，凶。武人为于大君。"},{"title":"九四","text":"履虎尾，愬愬终吉。"},{"title":"九五","text":"夬履，贞厉。"},{"title":"上九","text":"视履考详，其旋元吉。"}],"tuan":"履，柔履刚也。说而应乎干，是以履虎尾，不咥人，亨，利贞。刚中正，履帝位而不疚，光明也。","xiang":"上天下泽，履；君子以辨上下，定民志。"},{"number":11,"name":"泰","guaci":"小往大来，吉亨。","lines":[{"title":"初九","text":"拔茅茹以其汇，征吉。"},{"title":"九二","text":"包荒。用冯河，不遐遗；朋亡。得尚于中行。"},{"title":"九三","text":"无平不陂，无往不复，艰贞无咎。勿恤其孚，于食有福。"},{"title":"六四","text":"翩翩，不富以其邻；不戒以孚。"},{"title":"六五","text":"帝乙归妹，以祉，元吉。"},{"title":"上六","text":"城复于隍，勿用师，自邑告命，贞吝。"}],"tuan":"泰，小往大来，吉亨。则是天地交而万物通也，上下交而其志同也。内阳而外阴，内健而外顺，内君子而外小人，君子道长，小人道消也。","xiang":"天地交，泰；后以财成天地之道，辅相天地之宜，以左右民。"},{"number":12,"name":"否","guaci":"否之匪人，不利君子贞，大往小来。","lines":[{"title":"初六","text":"拔茅茹以其汇，贞吉。亨。"},{"title":"六二","text":"包承，小人吉，大人否。亨。"},{"title":"六三","text":"包羞。"},{"title":"九四","text":"有命，无咎，畴离祉。"},{"title":"九五","text":"休否，大人吉。其亡其亡，系于包桑。"},{"title":"上九","text":"倾否，先否后喜。"}],"tuan":"否之匪人，不利君子贞，大往小来。则是天地不交而万物不通也，上下不交而天下无邦也。内阴而外阳，内柔而外刚，内小人而外君子，小人道长，君子道消也。","xiang":"天地不交，否；君子以俭德辟难，不可荣以禄。"},{"number":13,"name":"同人","guaci":"同人于野，亨。利涉大川，利君子贞。","lines":[{"title":"初九","text":"同人于门，无咎。"},{"title":"六二","text":"同人于宗，吝。"},{"title":"九三","text":"伏戎于莽，升其高陵，三岁不兴。"},{"title":"九四","text":"乘其庸，弗克攻，吉。"},{"title":"九五","text":"同人，先号啕而后笑。大师克相遇。"},{"title":"上九","text":"同人于郊，无悔。"}],"tuan":"同人，柔得位得中，而应乎干，曰同人。同人曰，同人于野，亨。利涉大川，乾行也。文明以健，中正而应，君子正也。唯君子为能通天下之志。","xiang":"天与火，同人；君子以类族辨物。"},{"number":14,"name":"大有","guaci":"元亨。","lines":[{"title":"初九","text":"无交害，匪咎，艰则无咎。"},{"title":"九二","text":"大轝以载，有攸往，无咎。"},{"title":"九三","text":"公用亨于天子，小人弗克。"},{"title":"九四","text":"匪其尫，无咎。"},{"title":"六五","text":"厥孚交如，威如；吉。"},{"title":"上九","text":"自天佑之，吉无不利。"}],"tuan":"大有，柔得尊位，大中而上下应之，曰大有。其德刚健而文明，应乎天而时行，是以元亨。","xiang":"火在天上，大有；君子以遏恶扬善，顺天休命。"},{"number":15,"name":"谦","guaci":"亨，君子有终。","lines":[{"title":"初六","text":"谦谦君子，用涉大川，吉。"},{"title":"六二","text":"鸣谦，贞吉。"},{"title":"九三","text":"劳谦君子，有终吉。"},{"title":"六四","text":"无不利，㧑谦。"},{"title":"六五","text":"不富，以其邻，利用侵伐，无不利。"},{"title":"上六","text":"鸣谦，利用行师，征邑国。"}],"tuan":"谦，亨，天道下济而光明，地道卑而上行。天道亏盈而益谦，地道变盈而流谦，鬼神害盈而福谦，人道恶盈而好谦。谦尊而光，卑而不可逾，君子之终也。","xiang":"地中有山，谦；君子以裒多益寡，称物平施。"},{"number":16,"name":"豫","guaci":"利建侯行师。","lines":[{"title":"初六","text":"鸣豫，凶。"},{"title":"六二","text":"介于石，不终日，贞吉。"},{"title":"六三","text":"盱豫，悔。迟有悔。"},{"title":"九四","text":"由豫，大有得。勿疑。朋盍戠。"},{"title":"六五","text":"贞疾，恒不死。"},{"title":"上六","text":"冥豫，成有渝，无咎。"}],"tuan":"豫，刚应而志行，顺以动，豫。豫，顺以动，故天地如之，而况建侯行师乎？天地以顺动，故日月不过，而四时不忒；圣人以顺动，则刑罚清而民服。豫之时义大矣哉！","xiang":"雷出地奋，豫。先王以作乐崇德，殷荐之上帝，以配祖考。"},{"number":17,"name":"随","guaci":"元亨。利贞。无咎。","lines":[{"title":"初九","text":"官有渝，贞吉。出门交有功。"},{"title":"六二","text":"系小子，失丈夫。"},{"title":"六三","text":"系丈夫，失小子。随，有求得利，居贞。"},{"title":"九四","text":"随有获，贞凶。有孚在道，以明，何咎。"},{"title":"九五","text":"孚于嘉，吉。"},{"title":"上六","text":"拘系之，乃从维之。王用亨于西山。"}],"tuan":"随，刚来而下柔，动而说，随。大亨贞，无咎，而天下随时，随时之义大矣哉！","xiang":"泽中有雷，随；君子以向晦入宴息。"},{"number":18,"name":"蛊","guaci":"元亨。利涉大川。先甲三日，后甲三日。","lines":[{"title":"初六","text":"干父之蛊，有子考，无咎，厉终吉。"},{"title":"九二","text":"干母之蛊，不可贞。"},{"title":"九三","text":"干父之蛊，小有悔，无大咎。"},{"title":"六四","text":"裕父之蛊，往见吝。"},{"title":"六五","text":"干父之蛊，用誉。"},{"title":"上九","text":"不事王侯，高尚其事。"}],"tuan":"蛊，刚上而柔下，巽而止，蛊。蛊，元亨，而天下治也。利涉大川，往有事也。先甲三日，后甲三日，终则有始，天行也。","xiang":"山下有风，蛊；君子以振民育德。"},{"number":19,"name":"临","guaci":"元亨。利贞。至于八月有凶。","lines":[{"title":"初九","text":"咸临，贞吉。"},{"title":"九二","text":"咸临，吉无不利。"},{"title":"六三","text":"甘临，无攸利。既忧之，无咎。"},{"title":"六四","text":"至临，无咎。"},{"title":"六五","text":"知临，大君之宜，吉。"},{"title":"上六","text":"敦临，吉无咎。"}],"tuan":"临，刚浸而长。说而顺，刚中而应，大亨以正，天之道也。至于八月有凶，消不久也。","xiang":"泽上有地，临；君子以教思无穷，容保民无疆。"},{"number":20,"name":"观","guaci":"盥而不荐，有孚颙若。","lines":[{"title":"初六","text":"童观，小人无咎，君子吝。"},{"title":"六二","text":"窥观，利女贞。"},{"title":"六三","text":"观我生，进退。"},{"title":"六四","text":"观国之光，利用宾于王。"},{"title":"九五","text":"观我生，君子无咎。"},{"title":"上九","text":"观其生，君子无咎。"}],"tuan":"大观在上，顺而巽，中正以观天下。观，盥而不荐，有孚颙若，下观而化也。观天之神道，而四时不忒，圣人以神道设教，而天下服矣。","xiang":"风行地上，观；先王以省方，观民设教。"},{"number":21,"name":"噬嗑","guaci":"亨。利用狱。","lines":[{"title":"初九","text":"屦校灭趾，无咎。"},{"title":"六二","text":"噬肤灭鼻，无咎。"},{"title":"六三","text":"噬昔肉，遇毒；小吝，无咎。"},{"title":"九四","text":"噬干胏，得金矢，利艰贞，吉。"},{"title":"六五","text":"噬干肉，得黄金，贞厉，无咎。"},{"title":"上九","text":"何校灭耳，凶。"}],"tuan":"颐中有物，曰噬嗑，噬嗑而亨。刚柔分，动而明，雷电合而章。柔得中而上行，虽不当位，利用狱也。","xiang":"雷电噬嗑；先王以明罚敕法。"},{"number":22,"name":"贲","guaci":"亨。小利有攸往。","lines":[{"title":"初九","text":"贲其趾，舍车而徒。"},{"title":"六二","text":"贲其须。"},{"title":"九三","text":"贲如濡如，永贞吉。"},{"title":"六四","text":"贲如皤如，白马翰如，匪寇婚媾。"},{"title":"六五","text":"贲于丘园，束帛戋戋，吝，终吉。"},{"title":"上九","text":"白贲，无咎。"}],"tuan":"贲，亨；柔来而文刚，故亨。分刚上而文柔，故小利有攸往。刚柔交错，天文也；文明以止，人文也。观乎天文，以察时变；观乎人文，以化成天下。","xiang":"山下有火，贲；君子以明庶政，无敢折狱。"},{"number":23,"name":"剥","guaci":"不利。有攸往。","lines":[{"title":"初六","text":"剥床以足，蔑贞凶。"},{"title":"六二","text":"剥床以辨，蔑贞凶。"},{"title":"六三","text":"剥之，无咎。"},{"title":"六四","text":"剥床以肤，凶。"},{"title":"六五","text":"贯鱼，以宫人宠，无不利。"},{"title":"上九","text":"硕果不食，君子德车，小人剥庐。"}],"tuan":"剥，剥也，柔变刚也。不利有攸往，小人长也。顺而止之，观象也。君子尚消息盈虚，天行也。","xiang":"山附地上，剥；上以厚下，安宅。"},{"number":24,"name":"复","guaci":"亨。出入无疾，朋来无咎。反复其道，七日来复，利有攸往。","lines":[{"title":"初九","text":"不远复，无祇悔，元吉。"},{"title":"六二","text":"休复，吉。"},{"title":"六三","text":"频复，厉无咎。"},{"title":"六四","text":"中行独复。"},{"title":"六五","text":"敦复，无悔。"},{"title":"上六","text":"迷复，凶，有灾眚。用行师，终有大败，以其国君，凶；至于十年，不克征。"}],"tuan":"复亨；刚反，动而以顺行，是以出入无疾，朋来无咎。反复其道，七日来复，天行也。利有攸往，刚长也。复其见天地之心乎？","xiang":"雷在地中，复；先王以至日闭关，商旅不行，后不省方。"},{"number":25,"name":"无妄","guaci":"元亨。利贞。其匪正有眚，不利有攸往。","lines":[{"title":"初九","text":"无妄，往吉。"},{"title":"六二","text":"不耕获，不菑畬，则利有攸往。"},{"title":"六三","text":"无妄之灾，或系之牛，行人之得，邑人之灾。"},{"title":"九四","text":"可贞，无咎。"},{"title":"九五","text":"无妄之疾，勿药有喜。"},{"title":"上九","text":"无妄，行有眚，无攸利。"}],"tuan":"无妄，刚自外来，而为主于内。动而健，刚中而应，大亨以正，天之命也。其匪正有眚，不利有攸往。无妄之往，何之矣？天命不佑，行矣哉？","xiang":"天下雷行，物与无妄；先王以茂对时，育万物。"},{"number":26,"name":"大畜","guaci":"利贞，不家食吉，利涉大川。","lines":[{"title":"初九","text":"有厉利已。"},{"title":"九二","text":"舆说輹。"},{"title":"九三","text":"良马逐，利艰贞，吉。日闲舆卫，利有攸往。"},{"title":"六四","text":"童牛之告，元吉。"},{"title":"六五","text":"豮豕之牙，吉。"},{"title":"上九","text":"何天之衢，亨。"}],"tuan":"大畜，刚健笃实辉光，日新其德，刚上而尚贤。能止健，大正也。不家食吉，养贤也。利涉大川，应乎天也。","xiang":"天在山中，大畜；君子以多识前言往行，以畜其德。"},{"number":27,"name":"颐","guaci":"贞吉。观颐，自求口实。","lines":[{"title":"初九","text":"舍尔灵龟，观我朵颐，凶。"},{"title":"六二","text":"颠颐，拂经，于丘颐，征凶。"},{"title":"六三","text":"拂颐，贞凶，十年勿用，无攸利。"},{"title":"六四","text":"颠颐吉，虎视眈眈，其欲逐逐，无咎。"},{"title":"六五","text":"拂经，居贞吉，不可涉大川。"},{"title":"上九","text":"由颐，厉吉，利涉大川。"}],"tuan":"颐贞吉，养正则吉也。观颐，观其所养也；自求口实，观其自养也。天地养万物，圣人养贤，以及万民；颐之时大矣哉！","xiang":"山下有雷，颐；君子以慎言语，节饮食。"},{"number":28,"name":"大过","guaci":"栋桡，利有攸往，亨。","lines":[{"title":"初六","text":"藉用白茅，无咎。"},{"title":"九二","text":"枯杨生稊，老夫得其女妻，无不利。"},{"title":"九三","text":"栋桡，凶。"},{"title":"九四","text":"栋隆，吉。有它吝。"},{"title":"九五","text":"枯杨生华，老妇得其士夫，无咎无誉。"},{"title":"上六","text":"过涉灭顶，凶，无咎。"}],"tuan":"大过，大者过也。栋桡，本末弱也。刚过而中，巽而说行，利有攸往，乃亨。大过之时大矣哉！","xiang":"泽灭木，大过。君子以独立不惧，遁世无闷。"},{"number":29,"name":"坎","guaci":"有孚，维心亨。行有尚。","lines":[{"title":"初六","text":"习坎，入于坎窞，凶。"},{"title":"九二","text":"坎有险，求小得。"},{"title":"六三","text":"来之坎坎，险且枕，入于坎窞，勿用。"},{"title":"六四","text":"尊酒簋，贰用缶。内约自牖，终无咎。"},{"title":"九五","text":"坎不盈，禔既平，无咎。"},{"title":"上六","text":"系用徽𬙊，寘于丛棘，三岁不得，凶。"}],"tuan":"习坎，重险也。水流而不盈，行险而不失其信。维心亨，乃以刚中也。行有尚，往有功也。天险不可升也，地险山川丘陵也，王公设险以守其国，坎之时用大矣哉！","xiang":"水洊至，习坎；君子以常德行，习教事。"},{"number":30,"name":"离","guaci":"利贞。亨。畜牝牛，吉。","lines":[{"title":"初九","text":"履错然，敬之无咎。"},{"title":"六二","text":"黄离，元吉。"},{"title":"九三","text":"日昃之离，不鼓缶而歌，则大耋之差，凶。"},{"title":"九四","text":"突如其来如，焚如，死如，弃如。"},{"title":"六五","text":"出涕沱若，戚嗟若，吉。"},{"title":"上九","text":"王用出征，有嘉折首，获匪其丑，无咎。"}],"tuan":"离，丽也；日月丽乎天，百谷草木丽乎土，重明以丽乎正，乃化成天下。柔丽乎中正，故亨；是以畜牝牛吉也。","xiang":"明两作离，大人以继明照于四方。"},{"number":31,"name":"咸","guaci":"亨。利贞。取女吉。","lines":[{"title":"初六","text":"咸其拇。"},{"title":"六二","text":"咸其腓，凶，居吉。"},{"title":"九三","text":"咸其股，执其随，往吝。"},{"title":"九四","text":"贞吉悔亡，憧憧往来，朋从尔思。"},{"title":"九五","text":"咸其脢，无悔。"},{"title":"上六","text":"咸其辅，颊，舌。"}],"tuan":"咸，感也。柔上而刚下，二气感应以相与，止而说，男下女，是以亨利贞，取女吉也。天地感而万物化生，圣人感人心而天下和平；观其所感，而天地万物之情可见矣！","xiang":"山上有泽，咸；君子以虚受人。"},{"number":32,"name":"恒","guaci":"亨，无咎。利贞，利有攸往。","lines":[{"title":"初六","text":"浚恒，贞凶，无攸利。"},{"title":"九二","text":"悔亡。"},{"title":"九三","text":"不恒其德，或承之羞，贞吝。"},{"title":"九四","text":"田无禽。"},{"title":"六五","text":"恒其德，贞，妇人吉，夫子凶。"},{"title":"上六","text":"震恒，凶。"}],"tuan":"恒，久也。刚上而柔下，雷风相与，巽而动，刚柔皆应，恒。恒亨无咎，利贞；久于其道也，天地之道，恒久而不已也。利有攸往，终则有始也。日月得天，而能久照，四时变化，而能久成，圣人久于其道，而天下化成；观其所恒，而天地万物之情可见矣！","xiang":"雷风，恒；君子以立不易方。"},{"number":33,"name":"遁","guaci":"亨。小利贞。","lines":[{"title":"初六","text":"遁尾，厉，勿用有攸往。"},{"title":"六二","text":"执之用黄牛之革，莫之胜说。"},{"title":"九三","text":"系遁，有疾厉，畜臣妾吉。"},{"title":"九四","text":"好遁君子吉，小人否。"},{"title":"九五","text":"嘉遁，贞吉。"},{"title":"上九","text":"肥遁，无不利。"}],"tuan":"遁亨，遁而亨也。刚当位而应，与时行也。小利贞，浸而长也。遁之时义大矣哉！","xiang":"天下有山，遁；君子以远小人，不恶而严。"},{"number":34,"name":"大壮","guaci":"利贞。","lines":[{"title":"初九","text":"壮于趾，征凶，有孚。"},{"title":"九二","text":"贞吉。"},{"title":"九三","text":"小人用壮，君子用罔，贞厉。羝羊触藩，羸其角。"},{"title":"九四","text":"贞吉悔亡，藩决不羸，壮于大轝之腹。"},{"title":"六五","text":"丧羊于易，无悔。"},{"title":"上六","text":"羝羊触藩，不能退，不能遂，无攸利，艰则吉。"}],"tuan":"大壮，大者壮也。刚以动，故壮。大壮利贞；大者正也。正大而天地之情可见矣！","xiang":"雷在天上，大壮；君子以非礼弗履。"},{"number":35,"name":"晋","guaci":"康侯用锡马蕃庶，昼日三接。","lines":[{"title":"初六","text":"晋如，摧如，贞吉。罔孚，裕无咎。"},{"title":"六二","text":"晋如，愁如，贞吉。受兹介福，于其王母。"},{"title":"六三","text":"众允，悔亡。"},{"title":"九四","text":"晋如鼫鼠，贞厉。"},{"title":"六五","text":"悔亡，矢得勿恤，往吉无不利。"},{"title":"上九","text":"晋其角，维用伐邑，厉吉无咎，贞吝。"}],"tuan":"晋，进也。明出地上，顺而丽乎大明，柔进而上行。是以康侯用锡马蕃庶，昼日三接也。","xiang":"明出地上，晋；君子以自昭明德。"},{"number":36,"name":"明夷","guaci":"利艰贞。","lines":[{"title":"初九","text":"明夷于飞，垂其翼。君子于行，三日不食，有攸往，主人有言。"},{"title":"六二","text":"明夷，夷于左股，用拯马壮，吉。"},{"title":"九三","text":"明夷于南狩，得其大首，不可疾贞。"},{"title":"六四","text":"入于左腹，获明夷之心，于出门庭。"},{"title":"六五","text":"箕子之明夷，利贞。"},{"title":"上六","text":"不明晦，初登于天，后入于地。"}],"tuan":"明入地中，明夷。内文明而外柔顺，以蒙大难，文王以之。利艰贞，晦其明也，内难而能正其志，箕子以之。","xiang":"明入地中，明夷；君子以莅众，用晦而明。"},{"number":37,"name":"家人","guaci":"利女贞。","lines":[{"title":"初九","text":"闲有家，悔亡。"},{"title":"六二","text":"无攸遂，在中馈，贞吉。"},{"title":"九三","text":"家人嗃嗃，悔厉吉；妇子嘻嘻，终吝。"},{"title":"六四","text":"富家，大吉。"},{"title":"九五","text":"王假有家，勿恤。吉。"},{"title":"上九","text":"有孚威如，终吉。"}],"tuan":"家人，女正位乎内，男正位乎外，男女正，天地之大义也。家人有严君焉，父母之谓也。父父，子子，兄兄，弟弟，夫夫，妇妇，而家道正；正家而天下定矣。","xiang":"风自火出，家人；君子以言有物，而行有恒。"},{"number":38,"name":"睽","guaci":"小事吉。","lines":[{"title":"初九","text":"悔亡，丧马勿逐，自复；见恶人无咎。"},{"title":"九二","text":"遇主于巷，无咎。"},{"title":"六三","text":"见舆曳，其牛𧤊，其人天且劓，无初有终。"},{"title":"九四","text":"睽孤，遇元夫，交孚，厉无咎。"},{"title":"六五","text":"悔亡，厥宗噬肤，往何咎。"},{"title":"上九","text":"睽孤，见豕负涂，载鬼一车，先张之弧，后说之弧，匪寇婚媾，往遇雨则吉。"}],"tuan":"睽，火动而上，泽动而下；二女同居，其志不同行；说而丽乎明，柔进而上行，得中而应乎刚；是以小事吉。天地睽，而其事同也；男女睽，而其志通也；万物睽，而其事类也；睽之时用大矣哉！","xiang":"上火下泽，睽；君子以同而异。"},{"number":39,"name":"蹇","guaci":"利西南，不利东北；利见大人，贞吉。","lines":[{"title":"初六","text":"往蹇，来誉。"},{"title":"六二","text":"王臣蹇蹇，匪躬之故。"},{"title":"九三","text":"往蹇来反。"},{"title":"六四","text":"往蹇来连。"},{"title":"九五","text":"大蹇朋来。"},{"title":"上六","text":"往蹇来硕，吉；利见大人。"}],"tuan":"蹇，难也，险在前也。见险而能止，知矣哉！蹇利西南，往得中也；不利东北，其道穷也。利见大人，往有功也。当位贞吉，以正邦也。蹇之时用大矣哉！","xiang":"山上有水，蹇；君子以反身修德。"},{"number":40,"name":"解","guaci":"利西南，无所往，其来复吉。有攸往，夙吉。","lines":[{"title":"初六","text":"无咎。"},{"title":"九二","text":"田获三狐，得黄矢，贞吉。"},{"title":"六三","text":"负且乘，致寇至，贞吝。"},{"title":"九四","text":"解而拇，朋至斯孚。"},{"title":"六五","text":"君子惟有解，吉；有孚于小人。"},{"title":"上六","text":"公用射隼，于高墉之上，获之，无不利。"}],"tuan":"解，险以动，动而免乎险，解。解利西南，往得众也。其来复吉，乃得中也。有攸往夙吉，往有功也。天地解，而雷雨作，雷雨作，而百果草木皆甲坼，解之时义大矣哉！","xiang":"雷雨作，解；君子以赦过宥罪。"},{"number":41,"name":"损","guaci":"有孚，元吉。无咎，可贞，利有攸往。曷之用？二簋可用享。","lines":[{"title":"初九","text":"祀事遄往，无咎，酌损之。"},{"title":"九二","text":"利贞，征凶，弗损益之。"},{"title":"六三","text":"三人行，则损一人；一人行，则得其友。"},{"title":"六四","text":"损其疾，使遄有喜，无咎。"},{"title":"六五","text":"或益之，十朋之龟弗克违，元吉。"},{"title":"上九","text":"弗损益之，无咎，贞吉，利有攸往，得臣无家。"}],"tuan":"损，损下益上，其道上行。损而有孚，元吉，无咎，可贞，利有攸往。曷之用？二簋可用享；二簋应有时。损刚益柔有时，损益盈虚，与时偕行。","xiang":"山下有泽，损；君子以惩忿窒欲。"},{"number":42,"name":"益","guaci":"利有攸往。利涉大川。","lines":[{"title":"初九","text":"利用为大作，元吉，无咎。"},{"title":"六二","text":"或益之，十朋之龟弗克违，永贞吉。王用享于帝，吉。"},{"title":"六三","text":"益之用凶事，无咎。有孚中行，告公用圭。"},{"title":"六四","text":"中行，告公从。利用为依迁国。"},{"title":"九五","text":"有孚惠心，勿问元吉。有孚惠我德。"},{"title":"上九","text":"莫益之，或击之，立心勿恒，凶。"}],"tuan":"益，损上益下，民说无疆，自上下下，其道大光。利有攸往，中正有庆。利涉大川，木道乃行。益动而巽，日进无疆。天施地生，其益无方。凡益之道，与时偕行。","xiang":"风雷，益；君子以见善则迁，有过则改。"},{"number":43,"name":"夬","guaci":"扬于王庭，孚号，有厉，告自邑，不利即戎，利有攸往。","lines":[{"title":"初九","text":"壮于前趾，往不胜为咎。"},{"title":"九二","text":"惕号，莫夜有戎，勿恤。"},{"title":"九三","text":"壮于頄，有凶。君子夬夬，独行遇雨，若濡有愠，无咎。"},{"title":"九四","text":"臀无肤，其行次且。牵羊悔亡，闻言不信。"},{"title":"九五","text":"苋陆夬夬，中行无咎。"},{"title":"上六","text":"无号，终有凶。"}],"tuan":"夬，决也，刚决柔也。健而说，决而和，扬于王庭，柔乘五刚也。孚号有厉，其危乃光也。告自邑，不利即戎，所尚乃穷也。利有攸往，刚长乃终也。","xiang":"泽上于天，夬；君子以施禄及下，居德则忌。"},{"number":44,"name":"姤","guaci":"女壮，勿用取女。","lines":[{"title":"初六","text":"系于金柅，贞吉，有攸往，见凶，羸豕，孚，蹢躅。"},{"title":"九二","text":"包有鱼，无咎，不利宾。"},{"title":"九三","text":"臀无肤，其行次且，厉，无大咎。"},{"title":"九四","text":"包无鱼，起凶。"},{"title":"九五","text":"以杞包瓜，含章，有陨自天。"},{"title":"上九","text":"姤其角，吝，无咎。"}],"tuan":"姤，遇也，柔遇刚也。勿用取女，不可与长也。天地相遇，品物咸章也。刚遇中正，天下大行也。姤之时义大矣哉！","xiang":"天下有风，姤；后以施命诰四方。"},{"number":45,"name":"萃","guaci":"王假有庙，利见大人，亨。利贞。用大牲吉，利有攸往。","lines":[{"title":"初六","text":"有孚不终，乃乱乃萃，若号一握为笑，勿恤，往无咎。"},{"title":"六二","text":"引吉，无咎，孚乃利用禴。"},{"title":"六三","text":"萃如，嗟如，无攸利，往无咎，小吝。"},{"title":"九四","text":"大吉，无咎。"},{"title":"九五","text":"萃有位，无咎。匪孚，元永贞，悔亡。"},{"title":"上六","text":"赍资涕洟，无咎。"}],"tuan":"萃，聚也；顺以说，刚中而应，故聚也。王假有庙，致孝享也。利见大人亨，聚以正也。用大牲吉，利有攸往，顺天命也。观其所聚，而天地万物之情可见矣。","xiang":"泽上于地，萃；君子以除戎器，戒不虞。"},{"number":46,"name":"升","guaci":"元亨，用见大人，勿恤，南征吉。","lines":[{"title":"初六","text":"允升，大吉。"},{"title":"九二","text":"孚乃利用禴，无咎。"},{"title":"九三","text":"升虚邑。"},{"title":"六四","text":"王用享于岐山，吉无咎。"},{"title":"六五","text":"贞吉，升阶。"},{"title":"上六","text":"冥升，利于不息之贞。"}],"tuan":"柔以时升，巽而顺，刚中而应，是以大亨。用见大人，勿恤；有庆也。南征吉，志行也。","xiang":"地中生木，升；君子以顺德，积小以高大。"},{"number":47,"name":"困","guaci":"亨，贞大人吉，无咎，有言不信。","lines":[{"title":"初六","text":"臀困于株木，入于幽谷，三岁不觌。"},{"title":"九二","text":"困于酒食，朱绂方来，利用亨祀，征凶，无咎。"},{"title":"六三","text":"困于石，据于蒺蔾，入于其宫，不见其妻，凶。"},{"title":"九四","text":"来荼荼，困于金轝，吝，有终。"},{"title":"九五","text":"劓刖，困于赤绂，乃徐有说，利用祭祀。"},{"title":"上六","text":"困于葛藟，于臲卼，曰动悔。有悔，征吉。"}],"tuan":"困，刚掩也。险以说，困而不失其所，亨；其唯君子乎？贞大人吉，以刚中也。有言不信，尚口乃穷也。","xiang":"泽无水，困；君子以致命遂志。"},{"number":48,"name":"井","guaci":"改邑不改井，无丧无得，往来井井。汔至亦未繘井。羸其瓶，凶。","lines":[{"title":"初六","text":"井泥不食，旧井无禽。"},{"title":"九二","text":"井谷射鲋，瓮敝漏。"},{"title":"九三","text":"井渫不食，为我心恻，可用汲，王明，并受其福。"},{"title":"六四","text":"井甃，无咎。"},{"title":"九五","text":"井冽，寒泉食。"},{"title":"上六","text":"井收勿幕，有孚元吉。"}],"tuan":"巽乎水而上水，井；井养而不穷也。改邑不改井，乃以刚中也。汔至亦未繘井，未有功也。羸其瓶，是以凶也。","xiang":"木上有水，井；君子以劳民劝相。"},{"number":49,"name":"革","guaci":"已日乃孚，元亨。利贞。悔亡。","lines":[{"title":"初九","text":"巩用黄牛之革。"},{"title":"六二","text":"已日乃革之，征吉，无咎。"},{"title":"九三","text":"征凶，贞厉，革言三就，有孚。"},{"title":"九四","text":"悔亡，有孚改命，吉。"},{"title":"九五","text":"大人虎变，未占有孚。"},{"title":"上六","text":"君子豹变，小人革面，征凶，居贞吉。"}],"tuan":"革，水火相息，二女同居，其志不相得，曰革。已日乃孚；革而信也。文明以说，大亨以正，革而当，其悔乃亡。天地革而四时成，汤武革命，顺乎天而应乎人，革之时义大矣哉！","xiang":"泽中有火，革；君子以治历明时。"},{"number":50,"name":"鼎","guaci":"元吉，亨。","lines":[{"title":"初六","text":"鼎颠趾，利出否，得妾以其子，无咎。"},{"title":"九二","text":"鼎有实，我仇有疾，不我能即，吉。"},{"title":"九三","text":"鼎耳革，其行塞，雉膏不食，方雨亏悔，终吉。"},{"title":"九四","text":"鼎折足，覆公𫗧，其刑渥，凶。"},{"title":"六五","text":"鼎黄耳金铉，利贞。"},{"title":"上九","text":"鼎玉铉，大吉，无不利。"}],"tuan":"鼎，象也。以木巽火，亨饪也。圣人亨以享上帝，而大亨以养圣贤。巽而耳目聪明，柔进而上行，得中而应乎刚，是以元亨。","xiang":"木上有火，鼎；君子以正位凝命。"},{"number":51,"name":"震","guaci":"亨。震来虩虩，笑言哑哑。震惊百里，不丧匕鬯。","lines":[{"title":"初九","text":"震来虩虩，后笑言哑哑，吉。"},{"title":"六二","text":"震来厉，亿丧贝，跻于九陵，勿逐，七日得。"},{"title":"六三","text":"震苏苏，震行无眚。"},{"title":"九四","text":"震遂泥。"},{"title":"六五","text":"震往来厉，亿无丧，有事。"},{"title":"上六","text":"震索索，视矍矍，征凶。震不于其躬，于其邻，无咎。婚媾有言。"}],"tuan":"震，亨。震来虩虩，恐致福也。笑言哑哑，后有则也。震惊百里，惊远而惧迩也。出可以守宗庙社稷，以为祭主也。","xiang":"洊雷，震；君子以恐惧修省。"},{"number":52,"name":"艮","guaci":"艮其背，不获其身，行其庭，不见其人，无咎。","lines":[{"title":"初六","text":"艮其趾，无咎，利永贞。"},{"title":"六二","text":"艮其腓，不拯其随，其心不快。"},{"title":"九三","text":"艮其限，裂其夤，厉阍心。"},{"title":"六四","text":"艮其身，无咎。"},{"title":"六五","text":"艮其辅，言有孚，悔亡。"},{"title":"上九","text":"敦艮，吉。"}],"tuan":"艮，止也。时止则止，时行则行，动静不失其时，其道光明。艮其止，止其所也。上下敌应，不相与也。是以不获其身，行其庭不见其人，无咎也。","xiang":"兼山，艮；君子以思不出其位。"},{"number":53,"name":"渐","guaci":"女归吉，利贞。","lines":[{"title":"初六","text":"鸿渐于干，小子厉，有言，无咎。"},{"title":"六二","text":"鸿渐于磐，饮食衎衎，吉。"},{"title":"九三","text":"鸿渐于陆，夫征不复，妇孕不育，凶；利御寇。"},{"title":"六四","text":"鸿渐于木，或得其桷，无咎。"},{"title":"九五","text":"鸿渐于陵，妇三岁不孕，终莫之胜，吉。"},{"title":"上九","text":"鸿渐于陆，其羽可用为仪，吉。"}],"tuan":"渐之进也，女归吉也。进得位，往有功也。进以正，可以正邦也。其位刚，得中也。止而巽，动不穷也。","xiang":"山上有木，渐；君子以居贤德，善俗。"},{"number":54,"name":"归妹","guaci":"征凶，无攸利。","lines":[{"title":"初九","text":"归妹以娣，跛能履，征吉。"},{"title":"九二","text":"眇能视，利幽人之贞。"},{"title":"六三","text":"归妹以须，反归以娣。"},{"title":"九四","text":"归妹愆期，迟归有时。"},{"title":"六五","text":"帝乙归妹，其君之袂，不如其娣之袂良，月几望，吉。"},{"title":"上六","text":"女承筐无实，士刲羊无血，无攸利。"}],"tuan":"归妹，天地之大义也。天地不交，而万物不兴，归妹人之终始也。说以动，所归妹也。征凶，位不当也。无攸利，柔乘刚也。","xiang":"泽上有雷，归妹；君子以永终知敝。"},{"number":55,"name":"丰","guaci":"亨。王假之，勿忧，宜日中。","lines":[{"title":"初九","text":"遇其配主，虽旬无咎，往有尚。"},{"title":"六二","text":"丰其蔀，日中见斗，往得疑疾，有孚发若，吉。"},{"title":"九三","text":"丰其沛，日中见沬，折其右肱，无咎。"},{"title":"九四","text":"丰其蔀，日中见斗，遇其夷主，吉。"},{"title":"六五","text":"来章，有庆誉，吉。"},{"title":"上六","text":"丰其屋，蔀其家，窥其户，阒其无人，三岁不觌，凶。"}],"tuan":"丰，大也。明以动，故丰。王假之，尚大也。勿忧宜日中，宜照天下也。日中则昃，月盈则食，天地盈虚，与时消息，而况于人乎？况于鬼神乎？","xiang":"雷电皆至，丰；君子以折狱致刑。"},{"number":56,"name":"旅","guaci":"小亨，旅贞吉。","lines":[{"title":"初六","text":"旅琐琐，斯其所取灾。"},{"title":"六二","text":"旅即次，怀其资，得僮仆贞。"},{"title":"九三","text":"旅焚其次，丧其僮仆，贞厉。"},{"title":"九四","text":"旅于处，得其资斧，我心不快。"},{"title":"六五","text":"射雉一矢亡，终以誉命。"},{"title":"上九","text":"鸟焚其巢，旅人先笑后号咷。丧牛于易，凶。"}],"tuan":"旅，小亨，柔得中乎外，而顺乎刚，止而丽乎明，是以小亨，旅贞吉也。旅之时义大矣哉！","xiang":"山上有火，旅；君子以明慎用刑，而不留狱。"},{"number":57,"name":"巽","guaci":"小亨。利有攸往。利见大人。","lines":[{"title":"初六","text":"进退，利武人之贞。"},{"title":"九二","text":"巽在床下，用史巫纷若，吉无咎。"},{"title":"九三","text":"频巽，吝。"},{"title":"六四","text":"悔亡，田获三品。"},{"title":"九五","text":"贞吉悔亡，无不利。无初有终，先庚三日，后庚三日，吉。"},{"title":"上九","text":"巽在床下，丧其资斧，贞凶。"}],"tuan":"重巽以申命，刚巽乎中正而志行。柔皆顺乎刚，是以小亨，利有攸往，利见大人。","xiang":"随风，巽；君子以申命行事。"},{"number":58,"name":"兑","guaci":"亨。利贞。","lines":[{"title":"初九","text":"和兑，吉。"},{"title":"九二","text":"孚兑，吉，悔亡。"},{"title":"六三","text":"来兑，凶。"},{"title":"九四","text":"商兑，未宁，介疾有喜。"},{"title":"九五","text":"孚于剥，有厉。"},{"title":"上六","text":"引兑。"}],"tuan":"兑，说也。刚中而柔外，说以利贞，是以顺乎天，而应乎人。说以先民，民忘其劳；说以犯难，民忘其死；说之大，民劝矣哉！","xiang":"丽泽，兑；君子以朋友讲习。"},{"number":59,"name":"涣","guaci":"亨，王假有庙，利涉大川，利贞。","lines":[{"title":"初六","text":"用拯马壮，吉，悔亡。"},{"title":"九二","text":"涣奔其机，悔亡。"},{"title":"六三","text":"涣其躬，无悔。"},{"title":"六四","text":"涣其群，元吉。涣有丘，匪夷所思。"},{"title":"九五","text":"涣汗其大号，涣王居，无咎。"},{"title":"上九","text":"涣其血，去逖出，无咎。"}],"tuan":"涣，亨。刚来而不穷，柔得位乎外而上同。王假有庙，王乃在中也。利涉大川，乘木有功也。","xiang":"风行水上，涣；先王以享于帝立庙。"},{"number":60,"name":"节","guaci":"亨。苦节不可贞。","lines":[{"title":"初九","text":"不出户庭，无咎。"},{"title":"九二","text":"不出门庭，凶。"},{"title":"六三","text":"不节若，则嗟若，无咎。"},{"title":"六四","text":"安节，亨。"},{"title":"九五","text":"甘节，吉；往有尚。"},{"title":"上六","text":"苦节，贞凶，悔亡。"}],"tuan":"节，亨，刚柔分，而刚得中。苦节不可贞，其道穷也。说以行险，当位以节，中正以通。天地节而四时成，节以制度，不伤财，不害民。","xiang":"泽上有水，节；君子以制数度，议德行。"},{"number":61,"name":"中孚","guaci":"豚鱼吉，利涉大川，利贞。","lines":[{"title":"初九","text":"虞吉，有它不燕。"},{"title":"九二","text":"鸣鹤在阴，其子和之，我有好爵，吾与尔靡之。"},{"title":"六三","text":"得敌，或鼓或罢，或泣或歌。"},{"title":"六四","text":"月既望，马匹亡，无咎。"},{"title":"九五","text":"有孚挛如，无咎。"},{"title":"上九","text":"翰音登于天，贞凶。"}],"tuan":"中孚，柔在内而刚得中。说而巽，孚，乃化邦也。豚鱼吉，信及豚鱼也。利涉大川，乘木舟虚也。中孚以利贞，乃应乎天也。","xiang":"泽上有风，中孚；君子以议狱缓死。"},{"number":62,"name":"小过","guaci":"亨。利贞。可小事，不可大事。飞鸟遗之音，不宜上宜下，大吉。","lines":[{"title":"初六","text":"飞鸟以凶。"},{"title":"六二","text":"过其祖，遇其妣；不及其君，遇其臣；无咎。"},{"title":"九三","text":"弗过防之，从或戕之，凶。"},{"title":"九四","text":"无咎，弗过遇之。往厉必戒，勿用永贞。"},{"title":"六五","text":"密云不雨，自我西郊，公弋取彼在穴。"},{"title":"上六","text":"弗遇过之，飞鸟离之，凶，是谓灾眚。"}],"tuan":"小过，小者过而亨也。过以利贞，与时行也。柔得中，是以小事吉也。刚失位而不中，是以不可大事也。有飞鸟之象焉，有飞鸟遗之音，不宜上宜下，大吉；上逆而下顺也。","xiang":"山上有雷，小过；君子以行过乎恭，丧过乎哀，用过乎俭。"},{"number":63,"name":"既济","guaci":"亨小。利贞。初吉终乱。","lines":[{"title":"初九","text":"曳其轮，濡其尾，无咎。"},{"title":"六二","text":"妇丧其茀，勿逐，七日得。"},{"title":"九三","text":"高宗伐鬼方，三年克之，小人勿用。"},{"title":"六四","text":"𦈡有衣袽，终日戒。"},{"title":"九五","text":"东邻杀牛，不如西邻之禴祭，实受其福。"},{"title":"上六","text":"濡其首，厉。"}],"tuan":"既济，亨，小者亨也。利贞，刚柔正而位当也。初吉，柔得中也。终止则乱，其道穷也。","xiang":"水在火上，既济；君子以思患而豫防之。"},{"number":64,"name":"未济","guaci":"亨。小狐汔济，濡其尾，无攸利。","lines":[{"title":"初六","text":"濡其尾，吝。"},{"title":"九二","text":"曳其轮，贞吉。"},{"title":"六三","text":"未济，征凶，利涉大川。"},{"title":"九四","text":"贞吉，悔亡，震用伐鬼方，三年有赏于大国。"},{"title":"六五","text":"贞吉，无悔，君子之光，有孚，吉。"},{"title":"上九","text":"有孚于饮酒，无咎，濡其首，有孚失是。"}],"tuan":"未济，亨；柔得中也。小狐汔济，未出中也。濡其尾，无攸利；不续终也。虽不当位，刚柔应也。","xiang":"火在水上，未济；君子以慎辨物居方。"}];
const MEANINGS = {
  "1": ["乾", "元亨利贞。", "刚健中正，纯阳至健。主动、开创、领导；但亢则有悔，宜自强不息而戒骄盈。"],
  "2": ["坤", "元亨，利牝马之贞。", "柔顺承载，厚德载物。宜守、宜辅、宜持久；不宜争先，先迷后得主。"],
  "3": ["屯", "元亨利贞。勿用有攸往，利建侯。", "草创之初，动乎险中。万事开头难，宜稳扎稳打、求人相助（建侯），不宜贸进。"],
  "4": ["蒙", "亨。匪我求童蒙，童蒙求我。", "蒙昧待启，需明师与规范。求学求教则吉；装懂、逾矩则吝。"],
  "5": ["需", "有孚，光亨，贞吉。利涉大川。", "需者，待也。险在前而能待，时机未到先蓄势；有孚则终吉，躁进则陷。"],
  "6": ["讼", "有孚，窒惕，中吉，终凶。", "争讼之象。中途知止则吉，穷争到底则凶；宜和解、宜见大人，不宜启衅。"],
  "7": ["师", "贞，丈人吉，无咎。", "用师之道，以正为本、以老成为帅。谋定后动，纪律严明，则无咎。"],
  "8": ["比", "吉。原筮元永贞，无咎。", "亲比辅佐。择善而从、以诚相亲则吉；迟疑或比之无首则凶。"],
  "9": ["小畜", "亨。密云不雨，自我西郊。", "以小蓄大，密云未雨。力量尚小，只能蓄势待发；宜耐心，不宜强行突破。"],
  "10": ["履", "履虎尾，不咥人，亨。", "履危而和，谨慎则安。以礼行事、以柔承刚，可化险为夷；恃勇冒进则凶。"],
  "11": ["泰", "小往大来，吉亨。", "天地交而万物通。上下同心、内外相济，大吉之势；但盛极须防转否。"],
  "12": ["否", "否之匪人，不利君子贞，大往小来。", "天地不交，闭塞否隔。宜守正敛藏、暂不进取；否极自有泰来。"],
  "13": ["同人", "同人于野，亨。利涉大川，利君子贞。", "与人合志，公而同人。心胸开阔、光明正大则亨；结党营私、同人于宗则吝。"],
  "14": ["大有", "元亨。", "火在天上，所有大也。盛大丰有之象；宜谦守、不宜恃盈，遏恶扬善则吉。"],
  "15": ["谦", "亨，君子有终。", "地中有山，谦尊而光。谦则受益，谦谦君子有终；骄盈则败。"],
  "16": ["豫", "利建侯行师。", "雷出地奋，顺时而动。和乐奋发则利；但溺于逸豫、冥豫则凶。"],
  "17": ["随", "元亨利贞，无咎。", "随时而变，随善而从。择善固执则吉；系于小子、随于不义则失。"],
  "18": ["蛊", "元亨，利涉大川。先甲三日，后甲三日。", "积弊待治，整饬之象。宜正本清源、谋定后动；因循姑息则坏。"],
  "19": ["临", "元亨利贞。至于八月有凶。", "阳气渐长，临事而壮。宜亲民、宜担当；但须防盛极转衰，提前布局。"],
  "20": ["观", "盥而不荐，有孚颙若。", "观仰之象。宜观察大势、以诚感化；宜以身作则，不宜妄动。"],
  "21": ["噬嗑", "亨。利用狱。", "咬合去梗，明罚敕法。宜果断处理障碍、厘清是非；软磨硬泡反受其乱。"],
  "22": ["贲", "亨，小利有攸往。", "文饰之象。宜修外观、正名分；但文过其实则失本，白贲方为大吉。"],
  "23": ["剥", "不利有攸往。", "阴盛剥阳，剥落之象。宜静守、宜止损；强留强行则剥庐及身。"],
  "24": ["复", "亨。出入无疾，朋来无咎。反复其道，七日来复。利有攸往。", "一阳来复，转机初现。宜及早回头、返回正道；迷而不复则凶。"],
  "25": ["无妄", "元亨利贞。其匪正有眚，不利有攸往。", "真实无妄，顺天而行。守正则吉；妄念妄动则有灾，不由外来，皆由自取。"],
  "26": ["大畜", "利贞。不家食，吉。利涉大川。", "山中之天，所蓄者大。宜积德蓄能、养贤待用；畜极而通，可行大事。"],
  "27": ["颐", "贞吉。观颐，自求口实。", "颐养之象。观其所养、自食其力则吉；贪求无度、养非其正则凶。"],
  "28": ["大过", "栋桡。利有攸往，亨。", "栋梁弯曲，负重过头。事已过甚，宜果断调整、另辟蹊径；硬撑则折。"],
  "29": ["坎", "习坎，有孚，维心亨，行有尚。", "重险相叠。险中求通，唯诚信与定力可济；妄行则陷，知险而后可出。"],
  "30": ["离", "利贞，亨。畜牝牛，吉。", "重明丽正。附丽光明、守正柔顺则吉；依附非人、刚躁则凶。"],
  "31": ["咸", "亨，利贞。取女吉。", "山泽通气，感而遂通。以诚相感、以虚受人则吉；私感私欲则失其正。"],
  "32": ["恒", "亨，无咎，利贞，利有攸往。", "雷风相与，恒久之道。宜守常、宜持久；三心二意、见异思迁则凶。"],
  "33": ["遁", "亨，小利贞。", "天下有山，退隐之象。宜全身而退、避小人；不及时遁则受其累。"],
  "34": ["大壮", "利贞。", "雷在天上，壮盛之象。宜以正壮、不宜恃壮；壮于趾、羝羊触藩则凶。"],
  "35": ["晋", "康侯用锡马蕃庶，昼日三接。", "明出地上，进长之象。宜积极进取、光明正大；依附光明则获赏。"],
  "36": ["明夷", "利艰贞。", "明入地中，晦暗之象。宜藏明守晦、内正外柔；锋芒外露则受伤。"],
  "37": ["家人", "利女贞。", "风自火出，齐家之象。宜正家、明分、各守其位；家乱则事败。"],
  "38": ["睽", "小事吉。", "火泽相违，睽异之象。宜求同存异、从小处入手；大处强合则乖。"],
  "39": ["蹇", "利西南，不利东北。利见大人，贞吉。", "山上有水，跛蹇难行。宜止、宜求援、宜换个方向；硬闯则险。"],
  "40": ["解", "利西南。无所往，其来复吉。", "雷雨作解，患难解散。宜把握时机、该了则了；纠缠不放则乱。"],
  "41": ["损", "有孚，元吉，无咎，可贞，利有攸往。", "山下有泽，损下益上。宜有所取舍、舍弃小利以成大事；损而有孚则吉。"],
  "42": ["益", "利有攸往，利涉大川。", "风雷相益，损上益下。宜顺势而为、乘机进取；利人利己则大得。"],
  "43": ["夬", "扬于王庭，孚号有厉。告自邑，不利即戎。", "泽上于天，决断之象。宜公开决断、先安内后攘外；尚力强攻则凶。"],
  "44": ["姤", "女壮，勿用取女。", "天下有风，不期而遇。宜防微杜渐、不轻信偶遇；女壮则不可与久。"],
  "45": ["萃", "亨。王假有庙，利见大人，亨，利贞。", "泽上于地，聚合之象。宜聚众、宜诚敬、宜见大人；聚而无正则乱。"],
  "46": ["升", "元亨，用见大人，勿恤，南征吉。", "地中生木，积小成高。宜循序渐进、积德累功；急躁冒进则折。"],
  "47": ["困", "亨，贞，大人吉，无咎，有言不信。", "泽无水，困顿之象。处困宜守正、宜静待、宜少言；怨天尤人则愈困。"],
  "48": ["井", "改邑不改井，无丧无得，往来井井。", "木上有水，养而不穷。宜守本分、利人利己；井道贵在修治，不可自弃。"],
  "49": ["革", "己日乃孚，元亨，利贞，悔亡。", "泽中有火，变革之象。宜把握时机、顺天应人；轻举妄动则悔。"],
  "50": ["鼎", "元吉，亨。", "木上有火，鼎新之象。宜正位凝命、任用贤能；鼎折足则败。"],
  "51": ["震", "亨。震来虩虩，笑言哑哑。", "震惊百里，动而能惧。宜临危不乱、以敬自省；惧而修省则无丧。"],
  "52": ["艮", "艮其背，不获其身；行其庭，不见其人。无咎。", "兼山为止，止而能安。宜知止、宜守静；妄动则失其位。"],
  "53": ["渐", "女归吉，利贞。", "山上有木，渐进之象。宜循序渐进、循礼守正；急求则无功。"],
  "54": ["归妹", "征凶，无攸利。", "泽上有雷，少女从人。宜守分安位、慎所托；强求强进则凶。"],
  "55": ["丰", "亨，王假之。勿忧，宜日中。", "雷电皆至，丰大之象。宜把握盛时、光明行事；日中则昃，须防盛极而衰。"],
  "56": ["旅", "小亨。旅贞吉。", "山上有火，行旅之象。宜谨小慎微、柔顺守正；傲慢张扬则焚身。"],
  "57": ["巽", "小亨。利有攸往，利见大人。", "随风而入，柔顺之象。宜以柔克刚、循循善诱；过卑则失。"],

  "58": ["兑", "亨，利贞。", "丽泽相悦，和悦之象。以诚相悦、以正相交则吉；甘言媚悦则凶。"],
  "59": ["涣", "亨。王假有庙，利涉大川，利贞。", "风行水上，涣散之象。宜聚人心、宜乘势而行；涣而无归则散。"],
  "60": ["节", "亨。苦节不可贞。", "泽上有水，节制之象。宜适度、宜有度；节而过苦则伤，不能常久。"],
  "61": ["中孚", "豚鱼吉，利涉大川，利贞。", "泽上有风，诚信之象。以诚感人、以信立事则吉；诚信不实则败。"],
  "62": ["小过", "亨，利贞。可小事，不可大事。", "山上有雷，小有过越。宜做小事、宜守本分；飞鸟遗之音，不宜上宜下。"],
  "63": ["既济", "亨小，利贞。初吉终乱。", "水火既济，事已成之象。宜守成防患；既成而怠则乱。"],
  "64": ["未济", "亨。小狐汔济，濡其尾，无攸利。", "火在水上，未济之象。宜审慎推进、慎终如始；急于求成则濡尾。"]
};

const MODULES = {
  TRIGRAMS, BRANCH_DIRECTION, ELEMENT_YINYANG_COLOR, SPIRIT_MEANING, HEXAGRAMS,
  buildCalendar, nowCalendar, buildHexagram, tossHexagram, tossCoinLine, tossYarrowLine,
  analyze, analyzeUseGod, derivePalace, najiaOf, relationOf, strengthScore, strengthLevel,
  renderHexagram, renderCompact, toModelJson, yaoTitle, displayWidth,
  CLASSICS, MEANINGS,
}


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
