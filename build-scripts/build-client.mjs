/**
 * 生成 client.js：把纯 JS 引擎内联进浏览器端 bundle。
 * 引擎源码是 ES module（内部有 import/export），这里做最小化的「去模块化」拼接：
 *   - 去掉 import 语句（引擎内部依赖按固定顺序拼接）
 *   - 去掉 `export` 关键字，模块顶层函数/常量直接进入同一闭包
 *   - JSON 数据以常量内联
 * 生成后用新的 module 跑一遍自检（建卦 + 分析），确保内联没有破坏语义。
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const engineDir = path.join(root, 'engine')

const read = (f) => fs.readFileSync(path.join(engineDir, f), 'utf8')

function stripModule(src) {
  return src
    // 多行 import
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    // 单行 import
    .replace(/^import\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    // export { ... } 列表
    .replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '')
    // export const/function/class/let
    .replace(/^export\s+(const|let|var|function|class|async\s+function)/gm, '$1')
}

const classics = read('classics.json').trim()
const meanings = read('hexagram-meanings.json').trim()

const engine = [
  '/* —— core-data —— */',
  stripModule(read('core-data.js')),
  '/* —— calendar —— */',
  stripModule(read('calendar.js')),
  '/* —— hexagram —— */',
  stripModule(read('hexagram.js')),
  '/* —— render —— */',
  stripModule(read('render.js')),
].join('\n')

const dataModule = `
const CLASSICS = ${classics};
const MEANINGS = ${meanings};
`

const footer = `
const MODULES = {
  TRIGRAMS, BRANCH_DIRECTION, ELEMENT_YINYANG_COLOR, SPIRIT_MEANING, HEXAGRAMS,
  buildCalendar, nowCalendar, buildHexagram, tossHexagram, tossCoinLine, tossYarrowLine,
  analyze, analyzeUseGod, derivePalace, najiaOf, relationOf, strengthScore, strengthLevel,
  renderHexagram, renderCompact, toModelJson, yaoTitle, displayWidth,
  CLASSICS, MEANINGS,
}
`

const templatePath = path.join(root, 'client.template.js')
const template = fs.readFileSync(templatePath, 'utf8')
const out = template.replace('/*__ENGINE__*/', () => engine + dataModule + footer)
const outPath = path.join(root, 'client.js')
fs.writeFileSync(outPath, out, 'utf8')
console.log('wrote', outPath, out.length, 'bytes')

// —— 自检：在 Node 里执行内联后的引擎块 ——
const selfCheck = `
${engine}
${dataModule}
${footer}
const cal = buildCalendar({ year: 2026, month: 11, day: 19, hour: 18, minute: 1 })
const lines = tossHexagram('coins', (() => { let s = 7; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } })())
const hex = buildHexagram(lines, cal, { question: '自检', category: '财运' })
const report = renderHexagram(hex, CLASSICS)
if (!report.includes('六爻排盘')) throw new Error('render failed')
const model = toModelJson(hex, CLASSICS)
if (!model.useGod || !model.original.name) throw new Error('model failed')
console.log('OK', hex.original.name, '→', hex.changed ? hex.changed.name : '静卦', '|', model.useGod.verdict, model.useGod.score)
console.log('卦名核对', HEXAGRAMS.length, '卦；经典', CLASSICS.length, '卦；卦义', Object.keys(MEANINGS).length, '条')
`
fs.writeFileSync(path.join(root, 'scratch', 'selfcheck.mjs'), selfCheck, 'utf8')
console.log('selfcheck written')
