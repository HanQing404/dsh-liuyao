/**
 * 六爻基础数据：八卦、五行、干支、六神、六亲、六十四卦名与卦序。
 * 纯数据 + 纯函数，可同时运行在 Host 与 Client（浏览器）两端。
 */

export const TRIGRAMS = {
  乾: { index: 0, lines: [1, 1, 1], element: '金', nature: '天', direction: '西北', family: '父', image: '天', attr: '健' },
  兑: { index: 1, lines: [1, 1, 0], element: '金', nature: '泽', direction: '西', family: '少女', image: '泽', attr: '悦' },
  离: { index: 2, lines: [1, 0, 1], element: '火', nature: '火', direction: '南', family: '中女', image: '火', attr: '丽' },
  震: { index: 3, lines: [1, 0, 0], element: '木', nature: '雷', direction: '东', family: '长男', image: '雷', attr: '动' },
  巽: { index: 4, lines: [0, 1, 1], element: '木', nature: '风', direction: '东南', family: '长女', image: '风', attr: '入' },
  坎: { index: 5, lines: [0, 1, 0], element: '水', nature: '水', direction: '北', family: '中男', image: '水', attr: '陷' },
  艮: { index: 6, lines: [0, 0, 1], element: '土', nature: '山', direction: '东北', family: '少男', image: '山', attr: '止' },
  坤: { index: 7, lines: [0, 0, 0], element: '土', nature: '地', direction: '西南', family: '母', image: '地', attr: '顺' },
}

export const TRIGRAM_BY_KEY = {}
for (const [key, v] of Object.entries(TRIGRAMS)) TRIGRAM_BY_KEY[v.lines.join('')] = key

/** 六十四卦：行=上卦、列=下卦（行序 乾兑离震巽坎艮坤，列序 乾兑离震巽坎艮坤）→ 卦名 + 卦序（King Wen 序）。 */
export const GRID_NAMES = [
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

export const GRID_NUMBERS = [
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
export const HEXAGRAMS = []
export const HEXAGRAM_BY_NAME = new Map()
export const HEXAGRAM_BY_LINES = new Map()

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

export const HEXAGRAM_BY_NUMBER = new Map(HEXAGRAMS.map((h) => [h.number, h]))

/** 六十四卦名（依卦序），用于快捷查找与展示。 */
export const HEXAGRAM_NAMES = HEXAGRAMS.map((h) => h.name)

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

export const STEM_ELEMENT = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
}
export const STEM_YINYANG = { 甲: '阳', 乙: '阴', 丙: '阳', 丁: '阴', 戊: '阳', 己: '阴', 庚: '阳', 辛: '阴', 壬: '阳', 癸: '阴' }

export const BRANCH_ELEMENT = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
}
export const BRANCH_YINYANG = {
  子: '阳', 丑: '阴', 寅: '阳', 卯: '阴', 辰: '阳', 巳: '阴', 午: '阳', 未: '阴', 申: '阳', 酉: '阴', 戌: '阳', 亥: '阴',
}
export const BRANCH_ANIMALS = {
  子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇', 午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪',
}
/** 地支方位（用于趋避建议） */
export const BRANCH_DIRECTION = {
  子: '北', 丑: '东北', 寅: '东北', 卯: '东', 辰: '东南', 巳: '东南',
  午: '南', 未: '西南', 申: '西南', 酉: '西', 戌: '西北', 亥: '西北',
}

export const ELEMENTS = ['金', '木', '水', '火', '土']

/** 五行相生：key 生 value */
export const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
/** 五行相克：key 克 value */
export const CONTROLS = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }
/** 被生者 */
export const GENERATED_BY = { 火: '木', 土: '火', 金: '土', 水: '金', 木: '水' }
/** 被克者 */
export const CONTROLLED_BY = { 土: '木', 水: '土', 火: '水', 金: '火', 木: '金' }

export const ELEMENT_YINYANG_COLOR = { 金: '白', 木: '青', 水: '黑', 火: '红', 土: '黄' }

/** 六亲 */
export const RELATIONS = ['父母', '兄弟', '子孙', '妻财', '官鬼']

/** 六神（按日干起，阳日顺行、阴日逆行） */
export const SPIRITS = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']
export const SPIRIT_MEANING = {
  青龙: '喜庆、财帛、贵人、正事',
  朱雀: '口舌、文书、消息、争讼',
  勾陈: '田土、房产、迟滞、牵连',
  螣蛇: '虚惊、怪异、纠缠、缠绕',
  白虎: '病伤、丧事、刚猛、道路',
  玄武: '暗中、盗贼、私情、欺骗',
}

/** 六冲（地支相冲） */
export const BRANCH_CLASH = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' }
/** 六合（地支相合） */
export const BRANCH_COMBINE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' }

/** 三合局（申子辰水、亥卯未木、寅午戌火、巳酉丑金） */
export const TRIPLE_COMBINE = [
  { branches: ['申', '子', '辰'], element: '水' },
  { branches: ['亥', '卯', '未'], element: '木' },
  { branches: ['寅', '午', '戌'], element: '火' },
  { branches: ['巳', '酉', '丑'], element: '金' },
]

/** 五行墓库 */
export const ELEMENT_TOMB = { 水: '辰', 土: '辰', 木: '未', 火: '戌', 金: '丑' }

/** 十二长生（阳顺阴逆；用于化绝、旺衰判断） */
export const TWELVE_STAGES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养']
export const STAGE_START = {
  木: { 阳: '亥', 阴: '午' },
  火: { 阳: '寅', 阴: '酉' },
  金: { 阳: '巳', 阴: '子' },
  水: { 阳: '申', 阴: '卯' },
  土: { 阳: '申', 阴: '卯' },
}

/** 纳甲：各卦六爻的天干地支（自下而上）。乾纳甲壬、坤纳乙癸，余卦纳本卦天干。 */
export const NAJIA = {
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
export const PURE_HEXAGRAMS = ['乾', '坎', '艮', '震', '巽', '离', '坤', '兑']

/** 卦身（世爻地支，部分流派用；这里给月卦身口诀备查） */
export const HEXAGRAM_BODY_RULE = '阳世还从子月起，阴世还从午月起；欲得卦身安在哪，世爻位上数到今。'
