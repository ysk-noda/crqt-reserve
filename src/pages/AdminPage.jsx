import { useState, useEffect, useMemo } from 'react'
import { FACILITIES, formatDate } from '../lib/utils'

// 今週（月曜〜日曜）の日付範囲を返す
function getWeekRange() {
  const now = new Date()
  const day = now.getDay() // 0=日 … 6=土
  const diffToMon = (day + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - diffToMon)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: formatDate(monday), end: formatDate(sunday) }
}

// 表示用の短い施設名（利用状況タブで使う）
const FACILITY_SHORT = {
  meeting1: '会議室 地下',
  meeting2: '会議室 2階',
  phoneboxA: 'フォン 入口',
  phoneboxB: 'フォン 地下手前',
  phoneboxC: 'フォン 地下奥',
}

// "HH:MM" → 分
function toMin(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// 分 → "62.5" / "40"（.0は出さない）
function fmtH(min) {
  const h = Math.round((min / 60) * 10) / 10
  return Number.isInteger(h) ? String(h) : h.toFixed(1)
}

// 管理操作はすべて Edge Function（admin-bookings）経由。
// 以前はパスワードをフロントに埋め込み、anonキーで直接DBを触っていたが、
// パスワード照合・全件取得・削除をサーバー側に移した（2026-10-28）。
const ADMIN_API = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-bookings`

async function adminApi(password, body) {
  const res = await fetch(ADMIN_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, ...body }),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, ...json }
}

// 利用状況タブ：月ごとに「どの設備が混んでいるか」「誰がどれだけ使っているか」を見る
function UsageStats({ bookings }) {
  const now = new Date()
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [expandedKey, setExpandedKey] = useState(null)
  const [showAll, setShowAll] = useState(false)

  function shiftMonth(diff) {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + diff, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    setExpandedKey(null)
    setShowAll(false)
  }

  const stats = useMemo(() => {
    const sel = bookings.filter((b) => b.date.startsWith(month))
    const fac = {}
    FACILITIES.forEach((f) => { fac[f.id] = { cnt: 0, min: 0 } })
    // 名寄せ：メールがあればメール、なければ空白を除いた名前
    const ppl = new Map()
    let totalMin = 0
    sel.forEach((b) => {
      const min = toMin(b.end_time) - toMin(b.start_time)
      totalMin += min
      if (fac[b.facility_id]) { fac[b.facility_id].cnt++; fac[b.facility_id].min += min }
      const key = (b.email || '').toLowerCase() || 'n:' + (b.name || '').replace(/[\s　]/g, '')
      let p = ppl.get(key)
      if (!p) { p = { key, name: b.name, email: b.email || '', cnt: 0, min: 0, fac: {} }; ppl.set(key, p) }
      p.cnt++; p.min += min
      if (!p.fac[b.facility_id]) p.fac[b.facility_id] = { cnt: 0, min: 0 }
      p.fac[b.facility_id].cnt++; p.fac[b.facility_id].min += min
    })
    const people = [...ppl.values()].sort((a, b) => b.min - a.min)
    // 稼働率の分母：営業時間 9:00〜24:00（15時間）× 月の日数
    const [y, m] = month.split('-').map(Number)
    const capacity = new Date(y, m, 0).getDate() * 15 * 60
    return { total: sel.length, totalMin, people, fac, capacity }
  }, [bookings, month])

  const maxPersonMin = stats.people.length ? stats.people[0].min : 1
  const shownPeople = showAll ? stats.people : stats.people.slice(0, 10)
  const monthLabel = (() => { const [y, m] = month.split('-').map(Number); return `${y}年${m}月` })()

  return (
    <div>
      {/* 月切替＋合計 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-lg border border-gray-300 overflow-hidden">
          <button onClick={() => shiftMonth(-1)} className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">‹ 前月</button>
          <span className="px-4 py-2 text-sm font-semibold text-gray-800 border-x border-gray-300 bg-gray-50">{monthLabel}</span>
          <button onClick={() => shiftMonth(1)} className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">翌月 ›</button>
        </div>
        <span className="ml-auto text-sm text-gray-500">
          {stats.total}件 / {fmtH(stats.totalMin)}時間 / 利用者{stats.people.length}人
        </span>
      </div>

      {stats.total === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 py-16 text-center text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p>{monthLabel}の予約はありません</p>
        </div>
      ) : (
        <>
          {/* 設備ごとの稼働 */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            {FACILITIES.map((f) => {
              const v = stats.fac[f.id]
              const pct = Math.round((v.min / stats.capacity) * 100)
              return (
                <div key={f.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">{FACILITY_SHORT[f.id]}</p>
                  <p className="text-xl font-semibold text-gray-800 mt-0.5">
                    {fmtH(v.min)}<span className="text-xs font-normal text-gray-500">h・{v.cnt}件</span>
                  </p>
                  <div className="h-2 bg-blue-50 rounded-full mt-2">
                    <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">営業時間の{pct}%</p>
                </div>
              )
            })}
          </div>

          {/* 利用者ランキング */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold whitespace-nowrap">利用者</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-semibold whitespace-nowrap">件数</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-semibold whitespace-nowrap">時間</th>
                    <th className="px-4 py-3 w-1/3"></th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold whitespace-nowrap">よく使う設備</th>
                  </tr>
                </thead>
                <tbody>
                  {shownPeople.map((p) => {
                    const topFac = Object.entries(p.fac).sort((a, b) => b[1].cnt - a[1].cnt).slice(0, 2)
                    const expanded = expandedKey === p.key
                    return (
                      <FragmentRow key={p.key}>
                        <tr
                          onClick={() => setExpandedKey(expanded ? null : p.key)}
                          className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-4 py-2.5 text-gray-800 whitespace-nowrap">
                            <span className="inline-block w-3 text-gray-400 text-xs">{expanded ? '▼' : '▶'}</span>
                            {p.name}
                            {p.email
                              ? <span className="ml-1.5 text-xs text-gray-400">{p.email}</span>
                              : <span className="ml-1.5 text-xs text-gray-400 border border-gray-200 rounded px-1">メールなし</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-800">{p.cnt}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-800 whitespace-nowrap">{fmtH(p.min)}h</td>
                          <td className="px-4 py-2.5">
                            <div className="h-2.5 bg-blue-500 rounded" style={{ width: `${Math.max(Math.round((p.min / maxPersonMin) * 100), 2)}%` }} />
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">
                            {topFac.map(([fid, v]) => `${FACILITY_SHORT[fid]} ${v.cnt}`).join('・')}
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="border-b border-gray-100 bg-blue-50/50">
                            <td colSpan={5} className="px-4 py-2.5">
                              <div className="flex flex-wrap gap-2 text-xs">
                                {FACILITIES.filter((f) => p.fac[f.id]).map((f) => (
                                  <span key={f.id} className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-gray-700">
                                    {FACILITY_SHORT[f.id]}：{p.fac[f.id].cnt}件・{fmtH(p.fac[f.id].min)}h
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </FragmentRow>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {stats.people.length > 10 && (
              <div className="px-4 py-3 border-t border-gray-100 text-center">
                <button onClick={() => setShowAll(!showAll)} className="text-sm text-blue-600 hover:text-blue-800">
                  {showAll ? '上位10人だけ表示' : `ほか${stats.people.length - 10}人を表示`}
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            ※ 予約ベースの集計です（実際の利用とは異なる場合があります）。メール未入力の予約は名前だけで束ねているため、同姓の別人・表記ゆれで分かれることがあります。
          </p>
        </>
      )}
    </div>
  )
}

// tbody直下に複数行を返すためのフラグメント
function FragmentRow({ children }) {
  return <>{children}</>
}

export default function AdminPage() {
  const [password, setPassword] = useState(() => sessionStorage.getItem('admin_pw') || '')
  const [authed, setAuthed] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('list') // 'list' = 予約一覧 / 'stats' = 利用状況
  const [filterFacility, setFilterFacility] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [period, setPeriod] = useState('week') // 'week' = 今週 / 'all' = 全期間
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [cancelingId, setCancelingId] = useState(null)

  // 検索入力のデバウンス（入力が止まって300ms後に確定）
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // セッションにパスワードが残っていたら自動ログイン（サーバーで検証される）
  useEffect(() => {
    if (password && !authed) loginWith(password)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loginWith(pw) {
    setLoading(true)
    const r = await adminApi(pw, { action: 'list' })
    setLoading(false)
    if (r.status === 200) {
      sessionStorage.setItem('admin_pw', pw)
      setPassword(pw)
      setAuthed(true)
      setBookings(r.bookings || [])
      return true
    }
    sessionStorage.removeItem('admin_pw')
    setPassword('')
    setAuthed(false)
    return false
  }

  async function handleLogin() {
    const ok = await loginWith(passwordInput)
    if (!ok) setPasswordError(true)
  }

  function handleLogout() {
    sessionStorage.removeItem('admin_pw')
    setPassword('')
    setAuthed(false)
    setBookings([])
  }

  async function fetchBookings() {
    setLoading(true)
    const r = await adminApi(password, { action: 'list' })
    setLoading(false)
    if (r.status === 200) {
      setBookings(r.bookings || [])
    } else if (r.status === 401) {
      handleLogout()
    }
  }

  async function handleCancelBooking(booking) {
    if (!window.confirm(`以下の予約を取り消しますか？\n\n${booking.facility_name}\n${booking.date} ${booking.start_time}〜${booking.end_time}\n${booking.name} 様`)) return

    setCancelingId(booking.id)
    const r = await adminApi(password, { action: 'delete', id: booking.id })
    setCancelingId(null)

    if (r.status === 200) {
      setBookings((prev) => prev.filter((b) => b.id !== booking.id))
    } else {
      alert('取り消しに失敗しました。')
    }
  }

  // 絞り込みはブラウザ内で行う（全件はログイン時・更新時にまとめて取得済み）
  const shownBookings = useMemo(() => {
    let list = bookings
    if (filterFacility) list = list.filter((b) => b.facility_id === filterFacility)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter((b) =>
        (b.name || '').toLowerCase().includes(q) || (b.email || '').toLowerCase().includes(q))
    } else if (filterDate) {
      list = list.filter((b) => b.date === filterDate)
    } else if (period === 'week') {
      const { start, end } = getWeekRange()
      list = list.filter((b) => b.date >= start && b.date <= end)
    }
    return list
  }, [bookings, filterFacility, searchQuery, filterDate, period])

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
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50"
          >
            {loading ? '確認中...' : 'ログイン'}
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
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* タブ：予約一覧 / 利用状況 */}
        <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden mb-4 bg-white">
          {[
            { key: 'list', label: '予約一覧' },
            { key: 'stats', label: '利用状況' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={`px-4 py-2 text-sm transition-colors ${view === t.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {view === 'stats' && <UsageStats bookings={bookings} />}

        {view === 'list' && <>
        {/* フィルター */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* 名前・メール検索 */}
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="名前・メールで検索"
                className="w-56 pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
              </svg>
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="検索をクリア"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 期間切り替え（今週 / 全期間）— 検索中・日付指定中は無効 */}
            <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
              {[
                { key: 'week', label: '今週' },
                { key: 'all', label: '全期間' },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  disabled={!!searchQuery || !!filterDate}
                  className={`
                    px-3 py-2 text-sm transition-colors
                    ${period === p.key && !searchQuery && !filterDate
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'}
                    ${(searchQuery || filterDate) ? 'opacity-40 cursor-not-allowed' : ''}
                  `}
                >
                  {p.label}
                </button>
              ))}
            </div>

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

            {(filterFacility || filterDate || searchInput || period !== 'week') && (
              <button
                onClick={() => { setFilterFacility(''); setFilterDate(''); setSearchInput(''); setPeriod('week') }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                フィルターをリセット
              </button>
            )}

            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {loading ? '読み込み中...' : `${shownBookings.length}件`}
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
          ) : shownBookings.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p>予約はありません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold whitespace-nowrap">施設</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold whitespace-nowrap">日付</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold whitespace-nowrap">時間</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold whitespace-nowrap">お名前</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold whitespace-nowrap">メールアドレス</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-semibold whitespace-nowrap">予約日時</th>
                    <th className="px-4 py-3 sticky right-0 bg-gray-50 border-l border-gray-200 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]"></th>
                  </tr>
                </thead>
                <tbody>
                  {shownBookings.map((b) => (
                    <tr key={b.id} className="group border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{b.facility_name}</td>
                      <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{b.date}</td>
                      <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                        {b.start_time} 〜 {b.end_time}
                      </td>
                      <td className="px-4 py-3 text-gray-800">{b.name}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {b.email
                          ? <a href={`mailto:${b.email}`} className="text-blue-600 hover:underline">{b.email}</a>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(b.created_at).toLocaleString('ja-JP', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 sticky right-0 bg-white group-hover:bg-gray-50 border-l border-gray-100 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
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
        </>}
      </div>
    </div>
  )
}
