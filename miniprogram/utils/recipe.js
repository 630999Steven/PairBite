// 菜谱相关的常量与工具，被 DishAdd / RecipeEdit 共用。

const DIFFICULTY_OPTIONS = ['简单', '中等', '困难']

// 时长档位：label 用于显示/存储，minutes 用于把任意时长字符串映射到最近档
const COOK_TIME_OPTIONS = [
  { label: '5 分钟以内', minutes: 5 },
  { label: '10 分钟', minutes: 10 },
  { label: '15 分钟', minutes: 15 },
  { label: '20 分钟', minutes: 20 },
  { label: '30 分钟', minutes: 30 },
  { label: '45 分钟', minutes: 45 },
  { label: '1 小时', minutes: 60 },
  { label: '1.5 小时', minutes: 90 },
  { label: '2 小时以上', minutes: 120 },
]
const DEFAULT_COOK_TIME_INDEX = 4 // 30 分钟

// 把任意时长字符串（如「约 25 分钟」「1.5小时」「半小时」）映射到最近档位 index
function matchCookTimeIndex(text) {
  if (!text) return DEFAULT_COOK_TIME_INDEX
  const exact = COOK_TIME_OPTIONS.findIndex(o => o.label === text)
  if (exact >= 0) return exact
  let minutes = 0
  const hMatch = text.match(/(\d+(?:\.\d+)?)\s*小时/)
  if (hMatch) minutes += parseFloat(hMatch[1]) * 60
  const mMatch = text.match(/(\d+)\s*分钟?/)
  if (mMatch) minutes += parseInt(mMatch[1], 10)
  if (!minutes && text.includes('半小时')) minutes = 30
  if (!minutes) return DEFAULT_COOK_TIME_INDEX
  let best = 0
  let bestDiff = Infinity
  COOK_TIME_OPTIONS.forEach((o, i) => {
    const diff = Math.abs(o.minutes - minutes)
    if (diff < bestDiff) {
      bestDiff = diff
      best = i
    }
  })
  return best
}

// 按"视觉行数"估算 textarea 高度（rpx）。
// 视觉行 = 显式换行 + 长行自动 wrap 出来的额外行。
// textarea 可容宽度约 638rpx，单汉字 30rpx，半角 ~15rpx，按汉字等价计 ~22 字/行；
// 每视觉行约 48rpx（font 30 * line-height 1.6），加 16rpx 上下余量。
function estimateHeight(text) {
  if (!text) return 80
  const CHARS_PER_LINE = 22
  let visualLines = 0
  for (const line of text.split('\n')) {
    let weight = 0
    for (const ch of line) {
      weight += ch.charCodeAt(0) < 128 ? 0.5 : 1
    }
    visualLines += Math.max(1, Math.ceil(weight / CHARS_PER_LINE))
  }
  return Math.max(80, visualLines * 48 + 16)
}

module.exports = {
  DIFFICULTY_OPTIONS,
  COOK_TIME_OPTIONS,
  DEFAULT_COOK_TIME_INDEX,
  matchCookTimeIndex,
  estimateHeight,
}
