/**
 * 干支历：公历 → 年/月/日/时 四柱干支、旬空、节气月建。
 * 六爻以「日辰」为断卦之纲，故这里按节气（立春换年、节气换月）计算。
 * 纯函数，无依赖，可同时跑在 Host 与浏览器。
 */

import { STEMS, BRANCHES } from './core-data.js'

const MS_PER_DAY = 86400000
const J2000 = 2451545.0

export function julianDayNumber(year, month, day) {
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
export function sunLongitude(jde) {
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
export const SOLAR_TERMS = [
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
export const JIE_TERMS = [
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
export function jieInstant(year, term) {
  const key = year + ':' + term.name
  if (termCache.has(key)) return termCache.get(key)
  // 小寒、立春等落在年初的节气，其黄经求解时用当年即可；
  // 大雪（255°）在 12 月，也属当年。
  const jd = solveSolarLongitude(year, term.longitude)
  termCache.set(key, jd)
  return jd
}

/** 干支序号（0-59）→ 甲子字符串 */
export function sexagenary(index) {
  const n = ((index % 60) + 60) % 60
  return STEMS[n % 10] + BRANCHES[n % 12]
}

/** 日柱：返回 0-59 的甲子序。锚点：2000-01-01（UTC 正午）= 戊午（54） */
export function dayPillarIndex(year, month, day) {
  const jdn = julianDayNumber(year, month, day) // 该日 0 时对应的 JDN 为 X.5
  const anchor = julianDayNumber(2000, 1, 1) // 2000-01-01 的 JDN（X.5）
  const diff = Math.round(jdn - anchor)
  return ((54 + diff) % 60 + 60) % 60
}

/** 旬空：由日柱序号得旬首及空亡二支 */
export function xunKong(dayIndex) {
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
export function yearPillarIndex(year, month, day) {
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
export function monthPillarIndex(yearPillar, monthIndex /* 0=寅 */) {
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
export function hourPillarIndex(dayPillar, hourBranch) {
  const dayStem = dayPillar % 10
  // 五鼠遁：甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸何方发，壬子是真途
  const startStem = ((dayStem % 5) * 2) % 10
  const stem = ((startStem + hourBranch) % 10 + 10) % 10
  let idx = stem
  while (idx % 12 !== hourBranch) idx += 10
  return ((idx % 60) + 60) % 60
}

export function hourBranchOf(date) {
  const h = date.getHours()
  return Math.floor(((h + 1) % 24) / 2) // 23:00-00:59 子=0
}

/**
 * 由某地的「本地时间」生成完整干支历。
 * @param {{year:number,month:number,day:number,hour:number,minute:number}} local
 * @param {number} utcOffsetHours 默认 +8（东八区）
 */
export function buildCalendar(local, utcOffsetHours = 8) {
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
export function nowCalendar(utcOffsetHours = 8) {
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
