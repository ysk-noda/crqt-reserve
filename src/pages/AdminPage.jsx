import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { FACILITIES } from '../lib/utils'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin1234'

export default function AdminPage() {
  const [authed, setAuthed] = useState(() => {
    return sessionStorage.getItem('admin_authed') === 'true'
  })
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterFacility, setFilterFacility] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [cancelingId, setCancelingId] = useState(null)

  useEffect(() => {
    if (authed) fetchBookings()
  }, [authed, filterFacility, filterDate])

  async function fetchBookings() {
    setLoading(true)
    let query = supabase
      .from('bookings')
      .select('*')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (filterFacility) query = query.eq('facility_id', filterFacility)
    if (filterDate) query = query.eq('date', filterDate)

    const { data, error } = await query
    if (!error) setBookings(data || [])
    setLoading(false)
  }

  function handleLogin() {
    if (passwordInput === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_authed', 'true')
      setAuthed(true)
    } else {
      setPasswordError(true)
    }
  }

  async function handleCancelBooking(booking) {
    if (!window.confirm(`以下の予約を取り消しますか？\n\n${booking.facility_name}\n${booking.date} ${booking.start_time}〜${booking.end_time}\n${booking.name} 様`)) return

    setCancelingId(booking.id)
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', booking.id)
    setCancelingId(null)

    if (!error) {
      setBookings((prev) => prev.filter((b) => b.id !== booking.id))
    } else {
      alert('取り消しに失敗しました。')
    }
  }

  // ログイン画面
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800">管理者ログイン</h1>
            <p className="text-sm text-gray-500 mt-1">三島クロケット 施設予約 管理画面</p>
          </div>

          <input
            type="password"
            value={passwordInput}
            onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false) }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="パスワード"
            className={`
              w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3
              ${passwordError ? 'border-red-400 bg-red-50' : 'border-gray-300'}
            `}
            autoFocus
          />
          {passwordError && (
            <p className="text-sm text-red-600 mb-3">パスワードが違います</p>
          )}
          <button
            onClick={handleLogin}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            ログイン
          </button>
        </div>
      </div>
    )
  }

  // 管理画面
  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">管理者画面</h1>
            <p className="text-xs text-gray-500">三島クロケット 施設予約</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              予約ページへ
            </a>
            <button
              onClick={() => {
                sessionStorage.removeItem('admin_authed')
                setAuthed(false)
              }}
              className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* フィルター */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterFacility}
              onChange={(e) => setFilterFacility(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">全施設</option>
              {FACILITIES.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            {(filterFacility || filterDate) && (
              <button
                onClick={() => { setFilterFacility(''); setFilterDate('') }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                フィルターをリセット
              </button>
            )}

            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {loading ? '読み込み中...' : `${bookings.length}件`}
              </span>
              <button
                onClick={fetchBookings}
                className="px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
              >
                更新
              </button>
            </div>
          </div>
        </div>

        {/* 予約一覧テーブル */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400">読み込み中...</div>
          ) : bookings.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p>予約はありません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold whitespace-nowrap">予約番号</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold whitespace-nowrap">施設</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold whitespace-nowrap">日付</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold whitespace-nowrap">時間</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold whitespace-nowrap">お名前</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold whitespace-nowrap">予約日時</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-blue-600 font-semibold whitespace-nowrap">
                        {b.booking_number}
                      </td>
                      <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{b.facility_name}</td>
                      <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{b.date}</td>
                      <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                        {b.start_time} 〜 {b.end_time}
                      </td>
                      <td className="px-4 py-3 text-gray-800">{b.name}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(b.created_at).toLocaleString('ja-JP', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleCancelBooking(b)}
                          disabled={cancelingId === b.id}
                          className={`
                            px-3 py-1.5 text-xs rounded-lg border transition-colors whitespace-nowrap
                            ${cancelingId === b.id
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'}
                          `}
                        >
                          {cancelingId === b.id ? '処理中...' : '取り消し'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
