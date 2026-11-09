import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  FACILITIES,
  FACILITY_NAME_JA,
  TIME_SLOTS,
  formatDate,
  formatDateJP,
  getEndTime,
  formatTimeRange,
} from '../lib/utils'
import { STR, formatDateEN } from '../lib/i18n'
import FacilityTabs from '../components/FacilityTabs'
import Calendar from '../components/Calendar'
import TimeSlots from '../components/TimeSlots'
import StepIndicator from '../components/StepIndicator'
import MyReservations from '../components/MyReservations'

export default function BookingPage({ facilities = FACILITIES, mode = 'member', lang = 'ja' }) {
  const t = STR[lang]
  const fmtDate = lang === 'en' ? formatDateEN : formatDateJP
  // 時間範囲の表示（英語は「10:00 – 11:00」、日本語は従来どおり「10:00 〜 11:00」）
  const fmtRange = (slots) => (lang === 'en' ? `${slots[0]} – ${getEndTime(slots)}` : formatTimeRange(slots))

  const [step, setStep] = useState(1)

  // ステップ1
  const [selectedFacility, setSelectedFacility] = useState(facilities[0])
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlots, setSelectedSlots] = useState([]) // 確定した選択範囲
  const [pendingStart, setPendingStart] = useState(null)  // 1クリック目の開始時間（待機中）
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [monthBookings, setMonthBookings] = useState({})
  const [dayBookings, setDayBookings] = useState([])

  // ステップ2
  const [name, setName] = useState(() => localStorage.getItem('crqt_name') || '')
  const [email, setEmail] = useState(() => localStorage.getItem('crqt_email') || '')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // マイページモーダル
  // 確認メールのキャンセルリンク（?my=1&email=...）で開いた場合は、最初から開いて検索まで進める
  const initialMy = new URLSearchParams(window.location.search)
  const [showMyPage, setShowMyPage] = useState(initialMy.get('my') === '1')
  const [myEmail]  = useState(initialMy.get('email') || '')

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
    setPendingStart(null)
    setDayBookings([])
  }

  function handleDateSelect(dateStr) {
    setSelectedDate(dateStr)
    setSelectedSlots([])
    setPendingStart(null)
  }

  function isSlotBooked(timeStr) {
    return dayBookings.some((b) => timeStr >= b.start_time && timeStr < b.end_time)
  }

  // 2クリック方式: 1クリック目=開始時刻、2クリック目=終了時刻（EXCLUSIVE）
  // 例: 10:00クリック → 11:00クリック → 10:00〜11:00（60分）
  //     10:00クリック → 10:30クリック → 10:00〜10:30（30分）
  function handleSlotClick(timeStr) {
    const isEnd18 = timeStr === '24:00'
    const booked = !isEnd18 && isSlotBooked(timeStr)

    if (!pendingStart) {
      // 1クリック目: 開始時刻を設定（予約済み・24:00は開始不可）
      if (isEnd18 || booked) return
      setPendingStart(timeStr)
      setSelectedSlots([])
      return
    }

    // pendingStart が設定済み
    if (!isEnd18 && timeStr === pendingStart) {
      // 同じ時刻: キャンセル
      setPendingStart(null)
      setSelectedSlots([])
      return
    }

    if (!isEnd18 && timeStr < pendingStart) {
      // 開始より前: 空きマスなら新しい開始として設定
      if (booked) return
      setPendingStart(timeStr)
      setSelectedSlots([])
      return
    }

    // 2クリック目: pendingStart 以上 timeStr 未満（EXCLUSIVE = timeStr が終了時刻）
    // 終了時刻はそのマス自体を使わないので、予約済みマスでも「ここまで」としてなら選べる
    // （例: 16:00に予約がある日に 15:30→16:00 で予約する）。範囲の重なりは下で検証する
    const range = TIME_SLOTS.filter((s) => s >= pendingStart && s < timeStr)

    if (range.length === 0 || range.length > 4 || range.some((s) => isSlotBooked(s))) {
      // 無効な範囲（0スロット・2時間超・途中に予約あり）: 空きマスなら新しい開始として設定し直す
      if (!isEnd18 && !booked) {
        setPendingStart(timeStr)
        setSelectedSlots([])
      }
      return
    }

    // 有効な範囲 → 確定
    setSelectedSlots(range)
    setPendingStart(null)
  }

  async function handleConfirm() {
    if (!name.trim() || selectedSlots.length === 0 || !selectedDate) return
    setSubmitting(true)
    setSubmitError(null)

    const startTime = selectedSlots[0]
    const endTime = getEndTime(selectedSlots)

    // facility_name は表示言語によらず日本語の正式名で保存する（管理画面・メールの表記を揃える）
    const facilityNameJa = FACILITY_NAME_JA[selectedFacility.id] || selectedFacility.name

    const { error } = await supabase.from('bookings').insert({
      booking_number: crypto.randomUUID(),
      facility_id: selectedFacility.id,
      facility_name: facilityNameJa,
      date: selectedDate,
      start_time: startTime,
      end_time: endTime,
      name: name.trim(),
      email: email.trim() ? email.trim().toLowerCase() : null,
    })

    if (error) {
      setSubmitting(false)
      setSubmitError(t.submitError)
      return
    }

    if (email.trim()) {
      const payload = {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        facilityName: facilityNameJa,
        date: formatDateJP(selectedDate),
        timeRange: formatTimeRange(selectedSlots),
        duration: selectedSlots.length * 30,
        appUrl: window.location.origin,
      }
      const safeBody = JSON.stringify(payload).replace(
        /[\u007F-￿]/g,
        (chr) => '\\u' + ('0000' + chr.charCodeAt(0).toString(16)).slice(-4)
      )
      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-booking-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: safeBody,
        }
      ).catch((e) => console.error('Email send failed:', e))
    }

    localStorage.setItem('crqt_name', name.trim())
    if (email.trim()) localStorage.setItem('crqt_email', email.trim().toLowerCase())
    setSubmitting(false)
    setStep(3)
  }

  function handleReset() {
    setStep(1)
    setSelectedDate(null)
    setSelectedSlots([])
    setPendingStart(null)
    setName('')
    setEmail('')
    setSubmitError(null)
    fetchMonthBookings()
  }

  const canProceedToStep2 = selectedDate && selectedSlots.length > 0 && !pendingStart

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-800">{t.headerTitle}</h1>
              {mode === 'dropin' && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  {STR.ja.dropinBadge}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {t.siteName}　<a href="/terms" className="underline hover:text-gray-700">{t.termsLabel}</a>
            </p>
          </div>
          <button
            onClick={() => setShowMyPage(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 active:bg-blue-200 transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {/* 「予約確認」だけだとキャンセルできることが伝わらず、問い合わせの原因になっていた。
                狭い画面では折り返さないよう2段階の表記にする */}
            <span className="hidden sm:inline">{t.myLong}</span>
            <span className="sm:hidden">{t.myShort}</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4 pb-24">
        <StepIndicator currentStep={step} lang={lang} />

        {/* ===== STEP 1 ===== */}
        {step === 1 && (
          <div className="mt-4 lg:grid lg:grid-cols-2 lg:gap-8">
            {/* 左カラム: 施設選択 + カレンダー */}
            <div className="space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-600 mb-2">{t.s1Facility}</h2>
                <FacilityTabs facilities={facilities} selected={selectedFacility} onChange={handleFacilityChange} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-gray-600 mb-2">{t.s1Date}</h2>
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  bookedDates={monthBookings}
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                  lang={lang}
                />
              </div>
            </div>

            {/* 右カラム: 時間選択 + 次へボタン */}
            <div className="space-y-5 mt-5 lg:mt-0">
              {selectedDate ? (
                <div>
                  <h2 className="text-sm font-semibold text-gray-600 mb-1">{t.s1Time}</h2>
                  <p className="text-xs text-gray-400 mb-2">
                    {t.timeHint}
                  </p>
                  {pendingStart && selectedSlots.length === 0 && (
                    <div className="mb-3 px-3 py-2.5 bg-orange-50 rounded-lg border border-orange-100">
                      <p className="text-sm text-orange-700 font-semibold">
                        {t.pendingMsg(pendingStart)}
                      </p>
                      <p className="text-xs text-orange-400 mt-0.5">
                        {t.pendingCancel}
                      </p>
                    </div>
                  )}
                  {selectedSlots.length > 0 && (
                    <div className="mb-3 px-3 py-2.5 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-sm text-blue-700 font-semibold">
                        {t.selecting}{fmtRange(selectedSlots)}
                        <span className="text-blue-500 font-normal ml-2">{t.minutes(selectedSlots.length * 30)}</span>
                      </p>
                      <p className="text-xs text-blue-400 mt-0.5">
                        {t.reselectHint}
                      </p>
                    </div>
                  )}
                  <TimeSlots
                    bookings={dayBookings}
                    selectedSlots={selectedSlots}
                    onSlotClick={handleSlotClick}
                    pendingStart={pendingStart}
                    endTime={selectedSlots.length > 0 ? getEndTime(selectedSlots) : null}
                    lang={lang}
                  />
                </div>
              ) : (
                <div className="hidden lg:flex items-center justify-center h-48 bg-white rounded-xl border border-gray-200 border-dashed text-gray-400 text-sm">
                  {t.selectDatePrompt}
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
                {t.nextBtn}
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 2 ===== */}
        {step === 2 && (
          <div className="max-w-lg mx-auto space-y-4 mt-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h2 className="text-base font-semibold text-gray-800 mb-3">{t.reviewTitle}</h2>
              <div>
                <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
                  <span className="text-sm text-gray-500">{t.facility}</span>
                  <span className="text-sm font-semibold text-gray-800">{selectedFacility.name}</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
                  <span className="text-sm text-gray-500">{t.date}</span>
                  <span className="text-sm font-semibold text-gray-800">{fmtDate(selectedDate)}</span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-sm text-gray-500">{t.time}</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {fmtRange(selectedSlots)}{t.minutes(selectedSlots.length * 30)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t.nameLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.namePlaceholder}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t.emailLabel}
                  <span className="text-gray-400 font-normal text-xs ml-1">{t.optional}</span>
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  {t.emailHint}
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
                {t.back}
              </button>
              <button
                disabled={!name.trim() || submitting}
                onClick={handleConfirm}
                className={`w-2/3 py-4 rounded-xl font-semibold text-base transition-colors
                  ${name.trim() && !submitting
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                {submitting ? t.submitting : t.confirmBtn}
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 3 ===== */}
        {step === 3 && (
          <div className="max-w-lg mx-auto space-y-4 mt-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col items-center mb-5">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-9 h-9 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">{t.doneTitle}</h2>
                <p className="text-sm text-gray-500 mt-1">{t.doneSub}</p>
                {email && (
                  <p className="text-xs text-blue-500 mt-1">{t.doneMail(email)}</p>
                )}
              </div>

              <div className="bg-blue-50 rounded-xl p-3 text-sm text-gray-700 space-y-1.5 border border-blue-100">
                <p className="font-semibold text-blue-800 mb-1">{t.doneBox}</p>
                <p>🏢 {t.facility}{t.colon}{selectedFacility.name}</p>
                <p>📅 {t.date}{t.colon}{fmtDate(selectedDate)}</p>
                <p>🕐 {t.time}{t.colon}{fmtRange(selectedSlots)}{t.minutes(selectedSlots.length * 30)}</p>
                <p>👤 {t.doneName}{t.colon}{name}</p>
                {email && <p>✉ {t.doneEmail}{t.colon}{email}</p>}
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-4 rounded-xl font-semibold text-base bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            >
              {t.again}
            </button>
          </div>
        )}
      </div>

      {showMyPage && <MyReservations initialEmail={myEmail} onClose={() => setShowMyPage(false)} lang={lang} />}
    </div>
  )
}
