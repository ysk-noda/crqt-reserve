// 時間スロット選択コンポーネント
// utils.js の TIME_SLOTS（09:00〜17:30）を時間ごとにグループ化して表示

import { TIME_SLOTS } from '../lib/utils'

export default function TimeSlots({ bookings, selectedSlots, onSlotSelect }) {
  function isBooked(timeStr) {
    return bookings.some((b) => timeStr >= b.start_time && timeStr < b.end_time)
  }

  function isSelected(timeStr) {
    return selectedSlots.includes(timeStr)
  }

  // TIME_SLOTS を時間単位にグループ化（09時〜17時）
  const hourMap = {}
  TIME_SLOTS.forEach((slot) => {
    const h = slot.split(':')[0]
    if (!hourMap[h]) hourMap[h] = []
    hourMap[h].push(slot)
  })
  const hours = Object.entries(hourMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([h, slots]) => ({
      label: `${h}時`,
      slots,
    }))

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="max-h-80 overflow-y-auto">
        {hours.map(({ label, slots }) => (
          <div key={label} className="flex border-b border-gray-100 last:border-0">
            {/* 時刻ラベル */}
            <div className="w-12 flex-shrink-0 flex items-center justify-center text-xs text-gray-400 bg-gray-50 border-r border-gray-100">
              {label}
            </div>
            {/* スロット */}
            <div className="flex flex-1">
              {slots.map((slot) => {
                const booked = isBooked(slot)
                const selected = isSelected(slot)
                return (
                  <button
                    key={slot}
                    disabled={booked}
                    onClick={() => !booked && onSlotSelect(slot)}
                    className={`
                      flex-1 py-3 text-sm font-medium border-l border-gray-100 transition-colors
                      ${booked
                        ? 'bg-red-50 text-red-300 cursor-not-allowed'
                        : selected
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100'}
                    `}
                  >
                    {booked ? '×' : slot}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          <span className="inline-block w-3 h-3 bg-red-50 border border-red-200 rounded mr-1 align-middle" />
          埋まっています（×）
          <span className="inline-block w-3 h-3 bg-blue-600 rounded mr-1 align-middle" />
          選択中
        </p>
      </div>
    </div>
  )
}
