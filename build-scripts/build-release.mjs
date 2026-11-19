/**
 * 生成公开发布树：release/dsh-liuyao/
 *
 * 用法：
 *   node build-scripts/build-release.mjs                 # owner 用占位符 OWNER
 *   node build-scripts/build-release.mjs --owner alice   # 写入真实 GitHub 用户名
 *
 * 发布树与本地开发安装（@dsh-local/six-yao）完全分离：这里只读源文件，
 * 不改动 index.js / client.js / engine/*，所以正在运行的面板不受影响。
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const out = path.join(root, 'release', 'dsh-liuyao')

const argOwner = (() => {
  const i = process.argv.indexOf('--owner')
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : 'OWNER'
})()

const PKG_NAME = 'dsh-liuyao'
const VERSION = '0.1.0'
const ENGINE_FILES = ['core-data.js', 'calendar.js', 'hexagram.js', 'render.js', 'classics.json', 'hexagram-meanings.json']

function copy(rel, destRel = rel) {
  const src = path.join(root, rel)
  const dest = path.join(out, destRel)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

function write(rel, content) {
  const dest = path.join(out, rel)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, content, 'utf8')
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

function withOwner(text) {
  if (argOwner === 'OWNER') return text
  return text.split('{{OWNER}}').join(argOwner)
}

fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(out, { recursive: true })

// —— 运行时文件 ——
copy('index.js')
copy('preset-restrict.js')
copy('icon.svg')
for (const f of ENGINE_FILES) copy(path.join('engine', f), path.join('engine', f))
copy('locale/zh.json')
copy('locale/en.json')

// cordis.patch.yml：包名改成发布名（含 preset 里引用的子路径）
const patch = read('cordis.patch.yml').split('@dsh-local/six-yao').join(PKG_NAME)
write('cordis.patch.yml', patch)

// client.js：模块 id 必须等于包名
const client = read('client.js').split("id: '@dsh-local/six-yao'").join(`id: '${PKG_NAME}'`)
if (!client.includes(`id: '${PKG_NAME}'`)) throw new Error('client.js 里没有找到模块 id，无法改名')
write('client.js', client)

// —— 展示资源 ——
copy('publish/README.md', 'README.md')
copy('publish/LICENSE', 'LICENSE')
copy('publish/NOTICE.md', 'NOTICE.md')
const panelShot = path.join(root, 'publish', 'docs', 'panel.png')
if (fs.existsSync(panelShot)) {
  fs.mkdirSync(path.join(out, 'docs'), { recursive: true })
  fs.copyFileSync(panelShot, path.join(out, 'docs', 'panel.png'))
} else {
  console.warn('WARN: publish/docs/panel.png 不存在，README 里的截图会 404')
}

// —— 源码与可复现构建 ——
copy('client.template.js')
copy('build-scripts/build-client.mjs', 'build-scripts/build-client.mjs')
copy('build-scripts/build-release.mjs', 'build-scripts/build-release.mjs')
write('.gitignore', [
  'node_modules/',
  'release/',
  'scratch/',
  '*.log',
  '',
].join('\n'))

// —— 包清单 ——
const pkg = {
  name: PKG_NAME,
  version: VERSION,
  type: 'module',
  description: '六爻纳甲解卦：起卦、装卦、用神旺衰、应期与趋避，含 Web 面板与 agent 工具。',
  license: 'MIT',
  author: argOwner === 'OWNER' ? 'six-yao contributors' : argOwner,
  keywords: ['dsh', 'deepseek-harness', 'dsh-plugin', 'i-ching', 'divination', '六爻', '解卦'],
  repository: { type: 'git', url: `https://github.com/${argOwner}/dsh-liuyao` },
  homepage: `https://github.com/${argOwner}/dsh-liuyao`,
  engines: { dsh: '>=0.2.2-rc.5 <0.3.0' },
  exports: {
    '.': './index.js',
    './preset': './preset-restrict.js',
    './client': './client.js',
    './locale/*.json': './locale/*.json',
    './icon': './icon.svg',
  },
  files: [
    'index.js',
    'preset-restrict.js',
    'client.js',
    'engine/core-data.js',
    'engine/calendar.js',
    'engine/hexagram.js',
    'engine/render.js',
    'engine/classics.json',
    'engine/hexagram-meanings.json',
    'cordis.patch.yml',
    'locale/*.json',
    'icon.svg',
    'README.md',
    'LICENSE',
    'NOTICE.md',
    'docs',
  ],
  dsh: {
    bundle: { patch: './cordis.patch.yml' },
    client: {
      platform: 'web',
      immediately: true,
      inject: ['@deepseek-ai/dsh-client-ui-conversation'],
    },
  },
}
write('package.json', JSON.stringify(pkg, null, 2) + '\n')

// —— 收录条目（随源码保留，PR 时复制到目录仓库） ——
write('catalog-entry.yml', withOwner(read('publish/catalog-entry.yml')))

// —— README / LICENSE 的 owner 占位替换 ——
for (const f of ['README.md', 'LICENSE', 'NOTICE.md']) {
  const p = path.join(out, f)
  fs.writeFileSync(p, withOwner(fs.readFileSync(p, 'utf8')), 'utf8')
}

console.log('release:', out)
console.log('owner:', argOwner)
