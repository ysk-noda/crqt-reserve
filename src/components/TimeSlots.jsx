// 時間スロット選択コンポーネント
// 2クリック方式: 1クリック目=開始時間、2クリック目=終了時間

import { TIME_SLOTS } from '../lib/utils'

export default function TimeSlots({ bookings, selectedSlots, onSlotClick, pendingStart }) {
  function isBooked(timeStr) {
    return bookings.some((b) => timeStr >= b.start_time && timeStr < b.end_time)
  }

  function getSlotStyle(timeStr) {
    if (timeStr === '18:00') {
      if (!pendingStart) return 'text-gray-300 cursor-not-allowed'
      return 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100'
    }
    if (isBooked(timeStr)) return 'bg-red-50 text-red-300 cursor-not-allowed'
    if (timeStr === pendingStart) return 'bg-orange-400 text-white'
    if (selectedSlots.includes(timeStr)) return 'bg-blue-600 text-white'
    return 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100'
  }

  // TIME_SLOTS を時間単位にグループ化
  const hourMap = {}
  TIME_SLOTS.forEach((slot) => {
    const h = slot.split(':')[0]
    if (!hourMap[h]) hourMap[h] = []
    hourMap[h].push(slot)
  })
  const hours = Object.entries(hourMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([h, slots]) => ({ label: `${h}時`, slots }))

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="max-h-80 overflow-y-auto">
        {hours.map(({ label, slots }) => (
          <div key={label} className="flex border-b border-gray-100">
            <div className="w-12 flex-shrink-0 flex items-center justify-center text-xs text-gray-400 bg-gray-50 border-r border-gray-100">
              {label}
            </div>
            <div className="flex flex-1">
              {slots.map((slot) => {
                const booked = isBooked(slot)
                return (
                  <button
                    key={slot}
                    disabled={booked}
                    onClick={() => !booked && onSlotClick(slot)}
                    className={`flex-1 py-3 text-sm font-medium border-l border-gray-100 transition-colors ${getSlotStyle(slot)}`}
                  >
                    {booked ? '×' : slot}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        {/* 18:00 終了時間境界 */}
        <div className="flex">
          <div className="w-12 flex-shrink-0 flex items-center justify-center text-xs text-gray-400 bg-gray-50 border-r border-gray-100">
            18時
          </div>
          <div className="flex flex-1">
            <button
              disabled={!pendingStart}
              onClick={() => pendingStart && onSlotClick('18:00')}
              className={`flex-1 py-3 text-sm font-medium border-l border-gray-100 transition-colors ${getSlotStyle('18:00')}`}
            >
              18:00
            </button>
          </div>
        </div>
      </div>
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400 flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-red-50 border border-red-200 rounded align-middle" />
            埋まっています
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-orange-400 rounded align-middle" />
            開始時間
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-blue-600 rounded align-middle" />
            選択中
          </span>
        </p>
      </div>
    </div>
  )
}
