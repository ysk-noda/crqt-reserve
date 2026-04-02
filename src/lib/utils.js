export const FACILITIES = [
  { id: 'meeting1', name: '会議室（地下）' },
  { id: 'meeting2', name: '会議室（2階）' },
  { id: 'phoneboxA', name: 'フォンボックス（入口）' },
  { id: 'phoneboxB', name: 'フォンボックス（地下・手前）' },
  { id: 'phoneboxC', name: 'フォンボックス（地下・奥）' },
]

// 09:00 〜 23:30 の30分単位スロット（30個、最終枠の終了は24:00）
export const TIME_SLOTS = Array.from({ length: 30 }, (_, i) => {
  const total = 9 * 60 + i * 30
  const h = String(Math.floor(total / 60)).padStart(2, '0')
  const m = String(total % 60).padStart(2, '0')
  return `${h}:${m}`
})

// Date オブジェクト → "YYYY-MM-DD"
export function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// "YYYY-MM-DD" → "2025年1月15日（水）"
export function formatDateJP(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${y}年${m}月${d}日（${days[date.getDay()]}）`
}

// 選択スロット配列 → 終了時刻文字列（最後のスロット + 30分）
export function getEndTime(slots) {
  if (!slots || slots.length === 0) return ''
  const last = slots[slots.length - 1]
  const [h, m] = last.split(':').map(Number)
  const total = h * 60 + m + 30
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

// "10:00 〜 11:30" 形式にフォーマット
export function formatTimeRange(slots) {
  if (!slots || slots.length === 0) return ''
  return `${slots[0]} 〜 ${getEndTime(slots)}`
}
