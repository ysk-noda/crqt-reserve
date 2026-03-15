import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  FACILITIES,
  TIME_SLOTS,
  formatDate,
  formatDateJP,
  getEndTime,
  formatTimeRange,
} from '../lib/utils'
import FacilityTabs from '../components/FacilityTabs'
import Calendar from '../components/Calendar'
import TimeSlots from '../components/TimeSlots'
import StepIndicator from '../components/StepIndicator'
import MyReservations from '../components/MyReservations'

export default function BookingPage() {
  const [step, setStep] = useState(1)

  // ステップ1
  const [selectedFacility, setSelectedFacility] = useState(FACILITIES[0])
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlots, setSelectedSlots] = useState([])
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [monthBookings, setMonthBookings] = useState({})
  const [dayBookings, setDayBookings] = useState([])

  // ステップ2
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // マイページモーダル
  const [showMyPage, setShowMyPage] = useState(false)

  useEffect(() => {
    fetchMonthBookings()
  }, [selectedFacility.id, currentMonth])

  useEffect(() => {
    if (selectedDate) fetchDayBookings()
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

    if (selectedSlots.length === 0) { setSelectedSlots([timeStr]); return }
    if (selectedSlots.length === 1 && selectedSlots[0] === timeStr) { setSelectedSlots([]); return }

    const startIdx = TIME_SLOTS.indexOf(selectedSlots[0])
    const clickIdx = TIME_SLOTS.indexOf(timeStr)
    const from = Math.min(startIdx, clickIdx)
    const to = Math.max(startIdx, clickIdx)

    if (to - from + 1 > 4) { setSelectedSlots([timeStr]); return }

    const range = TIME_SLOTS.slice(from, to + 1)
    if (range.some((t) => isSlotBooked(t))) { setSelectedSlots([timeStr]); return }

    setSelectedSlots(range)
  }

  async function handleConfirm() {
    if (!name.trim() || selectedSlots.length === 0 || !selectedDate) return
    setSubmitting(true)
    setSubmitError(null)

    const startTime = selectedSlots[0]
    const endTime = getEndTime(selectedSlots)

    const { error } = await supabase.from('bookings').insert({
      booking_number: crypto.randomUUID(), // DB の UNIQUE NOT NULL 制約を満たすため内部生成（表示しない）
      facility_id: selectedFacility.id,
      facility_name: selectedFacility.name,
      date: selectedDate,
      start_time: startTime,
      end_time: endTime,
      name: name.trim(),
      email: email.trim() ? email.trim().toLowerCase() : null,
    })

    if (error) {
      setSubmitting(false)
      setSubmitError('予約に失敗しました。時間を置いて再度お試しください。')
      return
    }

    // 確認メール送信（失敗しても予約は完了扱い）
    if (email.trim()) {
      supabase.functions
        .invoke('send-booking-email', {
          body: {
            email: email.trim().toLowerCase(),
            name: name.trim(),
            facilityName: selectedFacility.name,
            date: formatDateJP(selectedDate),
            timeRange: formatTimeRange(selectedSlots),
            duration: selectedSlots.length * 30,
            appUrl: window.location.origin,
          },
        })
        .catch((e) => console.error('Email send failed:', e))
    }

    setSubmitting(false)
    setStep(3)
  }

  function handleReset() {
    setStep(1)
    setSelectedDate(null)
    setSelectedSlots([])
    setName('')
    setEmail('')
    setSubmitError(null)
    fetchMonthBookings()
  }

  const canProceedToStep2 = selectedDate && selectedSlots.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">施設予約</h1>
            <p className="text-xs text-gray-500">三島クロケット</p>
          </div>
          <button
            onClick={() => setShowMyPage(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 active:bg-blue-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            予約確認
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 pb-24">
        <StepIndicator currentStep={step} />

        {/* ===== STEP 1 ===== */}
        {step === 1 && (
          <div className="space-y-5 mt-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-600 mb-2">① 施設を選ぶ</h2>
              <FacilityTabs facilities={FACILITIES} selected={selectedFacility} onChange={handleFacilityChange} />
            </div>

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

            {selectedDate && (
              <div>
                <h2 className="text-sm font-semibold text-gray-600 mb-1">③ 時間を選ぶ</h2>
                <p className="text-xs text-gray-400 mb-2">30分単位・最大2時間まで（連続した時間帯のみ）</p>
                {selectedSlots.length > 0 && (
                  <div className="mb-3 px-3 py-2.5 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-700 font-semibold">
                      選択中: {formatTimeRange(selectedSlots)}
                      <span className="text-blue-500 font-normal ml-2">（{selectedSlots.length * 30}分）</span>
                    </p>
                    <p className="text-xs text-blue-400 mt-0.5">
                      {selectedSlots.length < 4 ? '別の時間をクリックして延長できます' : '最大2時間に達しました'}
                    </p>
                  </div>
                )}
                <TimeSlots bookings={dayBookings} selectedSlots={selectedSlots} onSlotSelect={handleSlotSelect} />
              </div>
            )}

            <button
              disabled={!canProceedToStep2}
              onClick={() => setStep(2)}
              className={`w-full py-4 rounded-xl font-semibold text-base transition-colors
                ${canProceedToStep2
                  ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              次へ（内容確認）
            </button>
          </div>
        )}

        {/* ===== STEP 2 ===== */}
        {step === 2 && (
          <div className="space-y-4 mt-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h2 className="text-base font-semibold text-gray-800 mb-3">予約内容の確認</h2>
              <div>
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  お名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="山田 太郎"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  メールアドレス
                  <span className="text-gray-400 font-normal text-xs ml-1">（任意）</span>
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  入力すると確認メールが届き、後から予約の確認・キャンセルができます
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">{submitError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 py-4 rounded-xl font-semibold text-sm border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                戻る
              </button>
              <button
                disabled={!name.trim() || submitting}
                onClick={handleConfirm}
                className={`w-2/3 py-4 rounded-xl font-semibold text-base transition-colors
                  ${name.trim() && !submitting
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                {submitting ? '予約中...' : '予約を確定する'}
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 3 ===== */}
        {step === 3 && (
          <div className="space-y-4 mt-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col items-center mb-5">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-9 h-9 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">予約完了！</h2>
                <p className="text-sm text-gray-500 mt-1">ご予約を承りました</p>
                {email && (
                  <p className="text-xs text-blue-500 mt-1">確認メールを {email} に送信しました</p>
                )}
              </div>

              <div className="bg-blue-50 rounded-xl p-3 text-sm text-gray-700 space-y-1.5 border border-blue-100">
                <p className="font-semibold text-blue-800 mb-1">予約内容</p>
                <p>🏢 施設：{selectedFacility.name}</p>
                <p>📅 日付：{formatDateJP(selectedDate)}</p>
                <p>🕐 時間：{formatTimeRange(selectedSlots)}（{selectedSlots.length * 30}分）</p>
                <p>👤 お名前：{name}</p>
                {email && <p>✉ メール：{email}</p>}
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-4 rounded-xl font-semibold text-base bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            >
              続けて予約する
            </button>
          </div>
        )}
      </div>

      {showMyPage && <MyReservations onClose={() => setShowMyPage(false)} />}
    </div>
  )
}
