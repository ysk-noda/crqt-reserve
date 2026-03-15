import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate, formatDateJP } from '../lib/utils'

export default function MyReservations({ onClose }) {
  const [email, setEmail] = useState('')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [cancelingId, setCancelingId] = useState(null)

  async function handleSearch() {
    if (!email.trim()) return
    setLoading(true)
    setSearched(false)

    // 今日以降の予約を取得
    const todayStr = formatDate(new Date())
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .gte('date', todayStr)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    setBookings(data || [])
    setLoading(false)
    setSearched(true)
  }

  async function handleCancel(booking) {
    if (!window.confirm(
      `以下の予約をキャンセルしますか？\n\n${booking.facility_name}\n${booking.date}  ${booking.start_time} 〜 ${booking.end_time}\n${booking.name} 様`
    )) return

    setCancelingId(booking.id)
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', booking.id)
      .eq('email', email.trim().toLowerCase()) // メール照合でセキュリティ確保

    setCancelingId(null)
    if (!error) {
      setBookings((prev) => prev.filter((b) => b.id !== booking.id))
    } else {
      alert('キャンセルに失敗しました。')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: '90dvh' }}>

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-800">予約確認・キャンセル</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-lg"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* メール入力 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              予約時に入力したメールアドレス
            </label>
            <p className="text-xs text-gray-400 mb-2">
              メールアドレスを入力すると、ご自身の予約一覧が表示されます
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setSearched(false) }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="example@email.com"
                className="flex-1 px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
              <button
                onClick={handleSearch}
                disabled={!email.trim() || loading}
                className={`
                  px-4 py-3 rounded-lg text-sm font-semibold transition-colors flex-shrink-0
                  ${email.trim() && !loading
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                `}
              >
                {loading ? '検索中...' : '検索'}
              </button>
            </div>
          </div>

          {/* 検索結果 */}
          {searched && (
            <div>
              {bookings.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p className="text-4xl mb-3">📭</p>
                  <p className="text-sm">予約が見つかりませんでした</p>
                  <p className="text-xs mt-1 text-gray-300">
                    ※ 過去の予約・メール未入力の予約は表示されません
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 font-medium">
                    {bookings.length}件の予約が見つかりました
                  </p>
                  {bookings.map((b) => (
                    <div key={b.id} className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm">{b.facility_name}</p>
                          <p className="text-sm text-gray-600">{formatDateJP(b.date)}</p>
                          <p className="text-sm text-gray-600">
                            {b.start_time} 〜 {b.end_time}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCancel(b)}
                          disabled={cancelingId === b.id}
                          className={`
                            flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors
                            ${cancelingId === b.id
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 active:bg-red-200'}
                          `}
                        >
                          {cancelingId === b.id ? '処理中...' : 'キャンセル'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
