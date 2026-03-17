import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// HH:MM 同士の差分（分）を計算
function diffMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em) - (sh * 60 + sm)
}

// HH:MM に n 分加算した時刻文字列を返す
function addMinutes(time: string, n: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + n
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function renderPage(title: string, message: string, isSuccess = false): string {
  const color = isSuccess ? '#16a34a' : '#dc2626'
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} | \u4e09\u5cf6\u30af\u30ed\u30b1\u30c3\u30c8</title>
</head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;text-align:center;">
  <div style="max-width:420px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="font-size:48px;margin-bottom:16px;">${isSuccess ? '\u2705' : '\u274c'}</div>
    <h1 style="font-size:20px;color:#111827;margin:0 0 12px;">${title}</h1>
    <p style="color:#6b7280;font-size:15px;margin:0 0 24px;">${message}</p>
    <a href="https://crqt-reserve.vercel.app"
      style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;">
      \u4e88\u7d04\u30da\u30fc\u30b8\u3078\u623b\u308b
    </a>
  </div>
</body>
</html>`
}

serve(async (req) => {
  const url = new URL(req.url)
  const bookingId = url.searchParams.get('id')

  if (!bookingId) {
    return new Response(
      renderPage('\u30a8\u30e9\u30fc', '\u4e88\u7d04ID\u304c\u6307\u5b9a\u3055\u308c\u3066\u3044\u307e\u305b\u3093\u3002'),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // 予約を取得
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    return new Response(
      renderPage('\u4e88\u7d04\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093', '\u4e88\u7d04\u60c5\u5831\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3067\u3057\u305f\u3002'),
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  // 最大2時間（120分）チェック
  const currentDuration = diffMinutes(booking.start_time, booking.end_time)
  if (currentDuration + 30 > 120) {
    return new Response(
      renderPage(
        '\u5ef6\u9577\u3067\u304d\u307e\u305b\u3093',
        `\u6700\u5927\u5229\u7528\u6642\u9593\uff082\u6642\u9593\uff09\u306b\u9054\u3057\u3066\u3044\u308b\u305f\u3081\u5ef6\u9577\u3067\u304d\u307e\u305b\u3093\u3002\uff08\u73fe\u5728${currentDuration}\u5206\u4f7f\u7528\u4e2d\uff09`,
      ),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  const newEndTime = addMinutes(booking.end_time, 30)

  // 後続予約との競合チェック（現在の end_time から開始する予約が存在するか）
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id')
    .eq('facility_id', booking.facility_id)
    .eq('date', booking.date)
    .eq('start_time', booking.end_time)
    .neq('id', bookingId)

  if ((conflicts?.length ?? 0) > 0) {
    return new Response(
      renderPage(
        '\u5ef6\u9577\u3067\u304d\u307e\u305b\u3093',
        '\u3053\u306e\u5f8c\u306b\u5225\u306e\u4e88\u7d04\u304c\u5165\u3063\u3066\u3044\u308b\u305f\u3081\u5ef6\u9577\u3067\u304d\u307e\u305b\u3093\u3002',
      ),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  // 予約を延長
  const { error: updateError } = await supabase
    .from('bookings')
    .update({ end_time: newEndTime })
    .eq('id', bookingId)

  if (updateError) {
    return new Response(
      renderPage('\u30a8\u30e9\u30fc', '\u5ef6\u9577\u51e6\u7406\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002'),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  return new Response(
    renderPage(
      '\u5ef6\u9577\u5b8c\u4e86',
      `${booking.facility_name}\u306e\u4e88\u7d04\u6642\u9593\u3092 ${newEndTime} \u307e\u3067\u5ef6\u9577\u3057\u307e\u3057\u305f\u3002`,
      true,
    ),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
})
