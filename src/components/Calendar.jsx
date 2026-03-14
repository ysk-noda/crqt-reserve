import { formatDate } from '../lib/utils'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']

export default function Calendar({ selectedDate, onDateSelect, bookedDates, currentMonth, onMonthChange }) {
  const today = formatDate(new Date())
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  // 月の1日の曜日（0=日曜）
  const firstDow = new Date(year, month, 1).getDay()
  // 月の日数
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // セル配列（null = 空白セル）
  const cells = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function prevMonth() {
    onMonthChange(new Date(year, month - 1, 1))
  }
  function nextMonth() {
    onMonthChange(new Date(year, month + 1, 1))
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg font-bold"
        >
          ‹
        </button>
        <span className="font-semibold text-gray-800">
          {year}年{month + 1}月
        </span>
        <button
          onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg font-bold"
        >
          ›
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 mb-1">
        {DOW_LABELS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-medium py-1
              ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}
            `}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 日付セル */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isPast = dateStr < today
          const isToday = dateStr === today
          const isSelected = dateStr === selectedDate
          const hasBooking = !!bookedDates[dateStr]
          const dow = (firstDow + day - 1) % 7

          return (
            <div key={dateStr} className="flex flex-col items-center">
              <button
                disabled={isPast}
                onClick={() => !isPast && onDateSelect(dateStr)}
                className={`
                  w-9 h-9 rounded-full text-sm font-medium transition-colors
                  ${isPast
                    ? 'text-gray-300 cursor-not-allowed'
                    : isSelected
                    ? 'bg-blue-600 text-white'
                    : isToday
                    ? 'border-2 border-blue-400 text-blue-600 hover:bg-blue-50'
                    : dow === 0
                    ? 'text-red-500 hover:bg-red-50 cursor-pointer'
                    : dow === 6
                    ? 'text-blue-500 hover:bg-blue-50 cursor-pointer'
                    : 'text-gray-700 hover:bg-gray-100 cursor-pointer'}
                `}
              >
                {day}
              </button>
              {/* 予約ありの赤い点 */}
              {hasBooking && !isPast && (
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 -mt-1" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
