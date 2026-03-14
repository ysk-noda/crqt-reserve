import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  FACILITIES,
  TIME_SLOTS,
  formatDate,
  formatDateJP,
  getEndTime,
  formatTimeRange,
  generateBookingNumber,
} from '../lib/utils'
import FacilityTabs from '../components/FacilityTabs'
import Calendar from '../components/Calendar'
import TimeSlots from '../components/TimeSlots'
import StepIndicator from '../components/StepIndicator'

export default function BookingPage() {
  // ステップ管理
  const [step, setStep] = useState(1)

  // ステップ1：施設・日時選択
  const [selectedFacility, setSelectedFacility] = useState(FACILITIES[0])
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlots, setSelectedSlots] = useState([])
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [monthBookings, setMonthBookings] = useState({}) // カレンダーの赤点用
  const [dayBookings, setDayBookings] = useState([])     // 時間スロット用

  // ステップ2：名前入力
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // ステップ3：完了
  const [bookingNumber, setBookingNumber] = useState('')

  // キャンセルフォーム
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelInput, setCancelInput] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelResult, setCancelResult] = useState(null) // 'success' | 'error' | null

  // 月が変わったら or 施設が変わったらカレンダーの予約情報を再取得
  useEffect(() => {
    fetchMonthBookings()
  }, [selectedFacility.id, currentMonth])

  // 日付が変わったら時間スロットの予約情報を再取得
  useEffect(() => {
    if (selectedDate) {
      fetchDayBookings()
    }
  }, [selectedFacility.id, selectedDate])

  async function fetchMonthBookings() {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const startDate = formatDate(new Date(year, month, 1))
    const endDate = formatDate(new Date(year, month + 1, 0))

    const { data } = await supabase
      .from('bookings')
      .select('date')
      .eq('facility_id', selectedFacility.id)
      .gte('date', startDate)
      .lte('date', endDate)

    if (data) {
      const map = {}
      data.forEach((b) => { map[b.date] = true })
      setMonthBookings(map)
    }
  }

  async function fetchDayBookings() {
    const { data } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('facility_id', selectedFacility.id)
      .eq('date', selectedDate)

    setDayBookings(data || [])
  }

  function handleFacilityChange(facility) {
    setSelectedFacility(facility)
    setSelectedDate(null)
    setSelectedSlots([])
    setDayBookings([])
  }

  function handleDateSelect(dateStr) {
    setSelectedDate(dateStr)
    setSelectedSlots([])
  }

  function isSlotBooked(timeStr) {
    return dayBookings.some((b) => timeStr >= b.start_time && timeStr < b.end_time)
  }

  function handleSlotSelect(timeStr) {
    if (isSlotBooked(timeStr)) return

    // 何も選択していない場合：最初の1スロットを選択
    if (selectedSlots.length === 0) {
      setSelectedSlots([timeStr])
      return
    }

    // 唯一の選択スロットと同じ場合：選択解除
    if (selectedSlots.length === 1 && selectedSlots[0] === timeStr) {
      setSelectedSlots([])
      return
    }

    const startIdx = TIME_SLOTS.indexOf(selectedSlots[0])
    const clickIdx = TIME_SLOTS.indexOf(timeStr)
    const from = Math.min(startIdx, clickIdx)
    const to = Math.max(startIdx, clickIdx)

    // 最大4スロット（2時間）チェック
    if (to - from + 1 > 4) {
      setSelectedSlots([timeStr])
      return
    }

    // 範囲内に予約済みスロットがないかチェック
    const range = TIME_SLOTS.slice(from, to + 1)
    if (range.some((t) => isSlotBooked(t))) {
      setSelectedSlots([timeStr])
      return
    }

    setSelectedSlots(range)
  }

  async function handleConfirm() {
    if (!name.trim() || selectedSlots.length === 0 || !selectedDate) return
    setSubmitting(true)
    setSubmitError(null)

    const startTime = selectedSlots[0]
    const endTime = getEndTime(selectedSlots)
    const num = generateBookingNumber()

    const { error } = await supabase.from('bookings').insert({
      booking_number: num,
      facility_id: selectedFacility.id,
      facility_name: selectedFacility.name,
      date: selectedDate,
      start_time: startTime,
      end_time: endTime,
      name: name.trim(),
    })

    setSubmitting(false)

    if (error) {
      setSubmitError('予約に失敗しました。時間を置いて再度お試しください。')
      return
    }

    setBookingNumber(num)
    setStep(3)
  }

  async function handleCancel() {
    if (!cancelInput.trim()) return
    setCancelLoading(true)
    setCancelResult(null)

    const { data, error } = await supabase
      .from('bookings')
      .delete()
      .eq('booking_number', cancelInput.trim().toUpperCase())
      .select()

    setCancelLoading(false)

    if (error || !data || data.length === 0) {
      setCancelResult('error')
    } else {
      setCancelResult('success')
    }
  }

  function handleReset() {
    setStep(1)
    setSelectedDate(null)
    setSelectedSlots([])
    setName('')
    setBookingNumber('')
    setSubmitError(null)
    setCancelInput('')
    setCancelResult(null)
    setShowCancelForm(false)
    fetchMonthBookings()
  }

  const canProceedToStep2 = selectedDate && selectedSlots.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-800">施設予約</h1>
          <p className="text-xs text-gray-500">コワーキングスペース</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 pb-24">
        <StepIndicator currentStep={step} />

        {/* ===== STEP 1: 施設・日時選択 ===== */}
        {step === 1 && (
          <div className="space-y-5 mt-4">
            {/* 施設選択タブ */}
            <div>
              <h2 className="text-sm font-semibold text-gray-600 mb-2">① 施設を選ぶ</h2>
              <FacilityTabs
                facilities={FACILITIES}
                selected={selectedFacility}
                onChange={handleFacilityChange}
              />
            </div>

            {/* カレンダー */}
            <div>
              <h2 className="text-sm font-semibold text-gray-600 mb-2">② 日付を選ぶ</h2>
              <Calendar
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                bookedDates={monthBookings}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
              />
            </div>

            {/* 時間スロット（日付選択後に表示） */}
            {selectedDate && (
              <div>
                <h2 className="text-sm font-semibold text-gray-600 mb-1">③ 時間を選ぶ</h2>
                <p className="text-xs text-gray-400 mb-2">
                  30分単位・最大2時間まで選択可（連続した時間帯のみ）
                </p>

                {/* 選択中の時間表示 */}
                {selectedSlots.length > 0 && (
                  <div className="mb-3 px-3 py-2.5 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-700 font-semibold">
                      選択中: {formatTimeRange(selectedSlots)}
                      <span className="text-blue-500 font-normal ml-2">
                        （{selectedSlots.length * 30}分）
                      </span>
                    </p>
                    <p className="text-xs text-blue-400 mt-0.5">
                      {selectedSlots.length < 4
                        ? '別の時間をクリックして延長できます'
                        : '最大2時間に達しました'}
                    </p>
                  </div>
                )}

                <TimeSlots
                  bookings={dayBookings}
                  selectedSlots={selectedSlots}
                  onSlotSelect={handleSlotSelect}
                />
              </div>
            )}

            {/* 次へボタン */}
            <button
              disabled={!canProceedToStep2}
              onClick={() => setStep(2)}
              className={`
                w-full py-4 rounded-xl font-semibold text-base transition-colors
                ${canProceedToStep2
                  ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
              `}
            >
              次へ（内容確認）
            </button>
          </div>
        )}

        {/* ===== STEP 2: 内容確認・名前入力 ===== */}
        {step === 2 && (
          <div className="space-y-4 mt-4">
            {/* 予約内容サマリー */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h2 className="text-base font-semibold text-gray-800 mb-3">予約内容の確認</h2>
              <div className="space-y-0">
                <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
                  <span className="text-sm text-gray-500">施設</span>
                  <span className="text-sm font-semibold text-gray-800">{selectedFacility.name}</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
                  <span className="text-sm text-gray-500">日付</span>
                  <span className="text-sm font-semibold text-gray-800">{formatDateJP(selectedDate)}</span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-sm text-gray-500">時間</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {formatTimeRange(selectedSlots)}（{selectedSlots.length * 30}分）
                  </span>
                </div>
              </div>
            </div>

            {/* 名前入力 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                お名前 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="山田 太郎"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                autoFocus
              />
            </div>

            {submitError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                {submitError}
              </p>
            )}

            {/* ボタン */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 py-4 rounded-xl font-semibold text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 active:bg-gray-100"
              >
                戻る
              </button>
              <button
                disabled={!name.trim() || submitting}
                onClick={handleConfirm}
                className={`
                  w-2/3 py-4 rounded-xl font-semibold text-base transition-colors
                  ${name.trim() && !submitting
                    ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                `}
              >
                {submitting ? '予約中...' : '予約を確定する'}
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 3: 予約完了 ===== */}
        {step === 3 && (
          <div className="space-y-4 mt-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {/* チェックアイコン */}
              <div className="flex flex-col items-center mb-5">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-9 h-9 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">予約完了！</h2>
                <p className="text-sm text-gray-500 mt-1">ご予約を承りました</p>
              </div>

              {/* 予約番号 */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 text-center border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">予約番号</p>
                <p className="text-2xl font-mono font-bold text-blue-600 tracking-widest">
                  {bookingNumber}
                </p>
                <p className="text-xs text-red-500 mt-2 font-medium">
                  ⚠ キャンセル時に必要です。必ずメモしてください。
                </p>
              </div>

              {/* 予約内容 */}
              <div className="bg-blue-50 rounded-xl p-3 text-sm text-gray-700 space-y-1.5 border border-blue-100">
                <p className="font-semibold text-blue-800 mb-1">予約内容</p>
                <p>🏢 施設：{selectedFacility.name}</p>
                <p>📅 日付：{formatDateJP(selectedDate)}</p>
                <p>🕐 時間：{formatTimeRange(selectedSlots)}（{selectedSlots.length * 30}分）</p>
                <p>👤 お名前：{name}</p>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-4 rounded-xl font-semibold text-base bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm"
            >
              続けて予約する
            </button>
          </div>
        )}

        {/* ===== キャンセルセクション ===== */}
        {step !== 3 && (
          <div className="mt-10 pt-6 border-t border-gray-200">
            {!showCancelForm ? (
              <button
                onClick={() => setShowCancelForm(true)}
                className="w-full text-sm text-gray-400 hover:text-gray-600 underline"
              >
                予約番号でキャンセルする
              </button>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">予約のキャンセル</h3>
                <input
                  type="text"
                  value={cancelInput}
                  onChange={(e) => {
                    setCancelInput(e.target.value)
                    setCancelResult(null)
                  }}
                  placeholder="予約番号を入力（例: CRQ-ABC123）"
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 uppercase"
                />
                {cancelResult === 'success' && (
                  <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
                    ✅ キャンセルが完了しました。
                  </p>
                )}
                {cancelResult === 'error' && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                    ❌ 予約番号が見つかりません。再度ご確認ください。
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCancelForm(false)
                      setCancelInput('')
                      setCancelResult(null)
                    }}
                    className="flex-1 py-3 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    閉じる
                  </button>
                  <button
                    disabled={!cancelInput.trim() || cancelLoading || cancelResult === 'success'}
                    onClick={handleCancel}
                    className={`
                      flex-1 py-3 rounded-lg text-sm font-semibold transition-colors
                      ${cancelInput.trim() && !cancelLoading && cancelResult !== 'success'
                        ? 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                    `}
                  >
                    {cancelLoading ? '処理中...' : 'キャンセルする'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
