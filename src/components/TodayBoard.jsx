import { useEffect, useState } from 'react'
import { FACILITIES } from '../lib/utils'

// 今日の施設の空き状況（突発利用の確認用。2026-11-20）
// 「今空いているか」を5秒で分かるよう、設備ごとに状態を大きく出し、その下に今日の時間割を帯で描く。
// showNames=false なら予約者名は出さない（会員向けに出すときもこの部品をそのまま使う想定）

const OPEN_MIN  = 9 * 60    // 予約できる時間帯 9:00〜24:00
const CLOSE_MIN = 24 * 60

const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m }
const hhmm  = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
const after = (min) => (min >= 60 ? `${Math.floor(min / 60)}時間${min % 60 ? (min % 60) + '分' : ''}` : `${min}分`)

// compact=true：設備ごとの「今の状況」1行だけを出す（予約画面の上に常に出す用。時間割の帯は出さない）
// onRelease を渡したときだけ（管理画面）、予約ごとに「解放／取り消し」ボタンを出す
export default function TodayBoard({ bookings, showNames = false, updatedAt, facilities = FACILITIES, compact = false, onRelease, releasingId }) {
  // 1分ごとに「今」を進める（データの取り直しは親が行う）
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60 * 1000)
    return () => clearInterval(t)
  }, [])
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const pct = (min) => `${((Math.min(Math.max(min, OPEN_MIN), CLOSE_MIN) - OPEN_MIN) / (CLOSE_MIN - OPEN_MIN)) * 100}%`
  const hours = Array.from({ length: (CLOSE_MIN - OPEN_MIN) / 60 + 1 }, (_, i) => OPEN_MIN / 60 + i)

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${compact ? 'px-3 py-2.5' : 'p-4'}`}>
      <div className={`flex items-baseline justify-between ${compact ? 'mb-1.5' : 'mb-3'}`}>
        <p className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-gray-700`}>
          今日 {now.getMonth() + 1}/{now.getDate()}（{'日月火水木金土'[now.getDay()]}）の{compact ? '空き' : '状況'}
          <span className="ml-2 text-gray-400 font-normal">いま {hhmm(nowMin)}</span>
        </p>
        {updatedAt && !compact && <span className="text-xs text-gray-400">予約データ {updatedAt} 時点（1分ごとに更新）</span>}
      </div>

      <div className={compact ? 'space-y-1.5' : 'space-y-4'}>
        {facilities.map((f) => {
          const list = bookings
            .filter((b) => b.facility_id === f.id)
            .map((b) => ({ ...b, s: toMin(b.start_time), e: toMin(b.end_time) }))
            .sort((a, b) => a.s - b.s)
          const cur  = list.find((b) => b.s <= nowMin && nowMin < b.e)
          const next = list.find((b) => b.s > nowMin)
          const closed = nowMin < OPEN_MIN || nowMin >= CLOSE_MIN

          let status, cls, short
          if (closed)      { status = '予約受付時間外（9:00〜24:00）'; short = '受付時間外'; cls = 'bg-gray-100 text-gray-500' }
          else if (cur)    { status = `使用中 〜${cur.end_time}まで` + (showNames && cur.name ? `（${cur.name}）` : ''); short = `使用中 〜${cur.end_time}`; cls = 'bg-red-50 text-red-700 border border-red-200' }
          else if (next)   { status = `空き（次の予約 ${next.start_time}〜・あと${after(next.s - nowMin)}）`; short = `空き（次 ${next.start_time}〜）`; cls = 'bg-green-50 text-green-700 border border-green-200' }
          else             { status = '空き（今日はこの後の予約なし）'; short = '空き'; cls = 'bg-green-50 text-green-700 border border-green-200' }

          // 予約画面の上に出す簡易版：1設備1行・短い表記（スマホで予約フォームを押し下げないように）
          if (compact) return (
            <div key={f.id} className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-700 truncate">{f.name}</span>
              <span className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-semibold ${cls}`}>{short}</span>
            </div>
          )

          return (
            <div key={f.id}>
              <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'mb-1.5'}`}>
                <span className="w-40 text-sm font-semibold text-gray-800">{f.name}</span>
                <span className={`px-2.5 py-1 rounded-lg text-sm font-semibold ${cls}`}>{status}</span>
              </div>
              {!compact && <>
              {/* 時間割の帯 */}
              <div className="relative h-7 bg-gray-50 rounded border border-gray-200 overflow-hidden">
                {hours.slice(1, -1).map((h) => (
                  <div key={h} className="absolute top-0 bottom-0 border-l border-gray-200" style={{ left: pct(h * 60) }} />
                ))}
                {list.map((b) => (
                  <div
                    key={b.id || `${b.start_time}-${b.end_time}`}
                    className={`absolute top-0.5 bottom-0.5 rounded text-[10px] leading-6 px-1 overflow-hidden whitespace-nowrap
                      ${b.e <= nowMin ? 'bg-gray-300 text-gray-600' : 'bg-blue-500 text-white'}`}
                    style={{ left: pct(b.s), width: `calc(${pct(b.e)} - ${pct(b.s)})` }}
                    title={`${b.start_time}〜${b.end_time}${showNames && b.name ? ' ' + b.name : ''}`}
                  >
                    {b.start_time}〜{b.end_time}{showNames && b.name ? ' ' + b.name : ''}
                  </div>
                ))}
                {!closed && <div className="absolute top-0 bottom-0 w-0.5 bg-orange-500" style={{ left: pct(nowMin) }} />}
              </div>
              {/* 短い予約は帯の中で文字が切れるので、開始〜終了を文字でも並べる */}
              {/* 管理画面だけ：予約ごとに「解放」ボタン（早く終わったのに予約が残り、次の人が使えないのを防ぐ） */}
              {list.length > 0 && onRelease && (
                <div className="mt-1.5 space-y-1">
                  {list.map((b, i) => {
                    const ended = b.e <= nowMin
                    const inUse = b.s <= nowMin && nowMin < b.e
                    return (
                      <div key={b.id || i} className="flex items-center gap-2 text-xs">
                        <span className={`whitespace-nowrap ${ended ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                          {b.start_time}〜{b.end_time}{showNames && b.name ? `（${b.name}）` : ''}
                        </span>
                        {!ended && (
                          <button
                            onClick={() => onRelease(b)}
                            disabled={releasingId === b.id}
                            className={`ml-auto shrink-0 px-2.5 py-1 rounded-md border whitespace-nowrap
                              ${releasingId === b.id
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                : inUse
                                  ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                                  : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}
                          >
                            {releasingId === b.id ? '処理中...' : inUse ? '解放（ここで終了）' : '取り消し'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {list.length > 0 && !onRelease && (
                <p className="mt-1 text-xs leading-5">
                  {list.map((b, i) => (
                    <span key={i} className={`mr-3 whitespace-nowrap ${b.e <= nowMin ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {b.start_time}〜{b.end_time}{showNames && b.name ? `（${b.name}）` : ''}
                    </span>
                  ))}
                </p>
              )}
              </>}
            </div>
          )
        })}
      </div>

      {!compact && <>
      {/* 時刻の目盛り */}
      <div className="relative h-4 mt-1 ml-0 text-[10px] text-gray-400">
        {hours.filter((h) => h % 3 === 0).map((h) => (
          <span key={h} className="absolute -translate-x-1/2" style={{ left: pct(h * 60) }}>{h}時</span>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        青＝これからの予約／灰色＝終わった予約／オレンジの線＝いま。予約なしで使う場合は、次の予約の開始時刻までに空けてください。
      </p>
      </>}
    </div>
  )
}
