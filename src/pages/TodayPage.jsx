import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import TodayBoard from '../components/TodayBoard'

// 利用者向け「今日の空き状況」（/today。2026-11-20）
// 予約者の名前・メールは出さない：読むのは設備・開始・終了の3列だけ
// （公開キーではそもそも name / email は読めない設定。2026-10-28のセキュリティ改修）
export default function TodayPage() {
  const [bookings, setBookings] = useState([])
  const [updatedAt, setUpdatedAt] = useState('')
  const [error, setError] = useState(false)

  async function load() {
    const { data, error: err } = await supabase
      .from('bookings')
      .select('facility_id, start_time, end_time')
      .eq('date', formatDate(new Date()))
    if (err) { setError(true); return }
    setError(false)
    setBookings(data || [])
    const d = new Date()
    setUpdatedAt(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 60 * 1000)   // 開いている間は1分ごとに取り直す
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">今日の空き状況</h1>
            <p className="text-xs text-gray-500">三島クロケット　会議室・フォンボックス</p>
          </div>
          <a href="/" className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
            予約する
          </a>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 py-4">
        {error && (
          <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
            予約状況を読み込めませんでした。少し待ってから再読み込みしてください。
          </p>
        )}
        <TodayBoard bookings={bookings} showNames={false} updatedAt={updatedAt} />
        <p className="text-xs text-gray-400 mt-3">
          ※ 会議室は会員の方のみご利用いただけます。ドロップインの方はフォンボックスをご利用ください。
        </p>
      </div>
    </div>
  )
}
