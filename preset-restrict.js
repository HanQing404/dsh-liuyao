/**
 * 解卦专用 preset 的工具收敛器：把该会话里看得见的工具全部收掉。
 *
 * 面板发过去的消息里已经带了本机排好的摘要（含用神、旺衰、依据、应期、卦辞），
 * 会话侧不需要再复现盘面，所以这里一个工具都不放行 —— 工具表成本归零。
 */
export const name = 'sixyao-preset-restrict'
export const inject = ['tools']

export function apply(ctx) {
  ctx.effect(() => ctx.tools.restrict({ allow: [] }), 'sixyao preset tool restriction')
}
