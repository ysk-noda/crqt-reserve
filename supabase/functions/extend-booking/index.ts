import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const HTML_HEADERS = { 'Content-Type': 'text/html; charset=utf-8' }

// HH:MM に 30 分加算した時刻文字列を返す
function addThirtyMin(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + 30
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function page(body: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>\u4e09\u5cf6\u30af\u30ed\u30b1\u30c3\u30c8 \u65bd\u8a2d\u4e88\u7d04</title>
</head>
<body style="font-family:sans-serif;background:#f3f4f6;margin:0;padding:48px 16px;text-align:center;">
<div style="max-width:400px;margin:0 auto;background:#fff;border-radius:12px;padding:32px 24px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
${body}
<div style="margin-top:24px;">
<a href="https://crqt-reserve.vercel.app" style="color:#2563eb;font-size:14px;">\u4e88\u7d04\u30da\u30fc\u30b8\u3078\u623b\u308b</a>
</div>
</div>
</body>
</html>`
}

serve(async (req) => {
  const url = new URL(req.url)
  const bookingId = url.searchParams.get('id')

  if (!bookingId) {
    const html = page('<p style="font-size:16px;color:#dc2626;">\u4e88\u7d04ID\u304c\u6307\u5b9a\u3055\u308c\u3066\u3044\u307e\u305b\u3093\u3002</p>')
    return new Response(html, { status: 400, headers: HTML_HEADERS })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // 予約を取得
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    const html = page('<p style="font-size:16px;color:#dc2626;">\u4e88\u7d04\u60c5\u5831\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3067\u3057\u305f\u3002</p>')
    return new Response(html, { status: 404, headers: HTML_HEADERS })
  }

  // 後続予約との競合チェック
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id')
    .eq('facility_id', booking.facility_id)
    .eq('date', booking.date)
    .eq('start_time', booking.end_time)
    .neq('id', bookingId)

  if ((conflicts?.length ?? 0) > 0) {
    const html = page(`
<p style="font-size:20px;margin:0 0 12px;">&#10060;</p>
<p style="font-size:16px;font-weight:bold;color:#dc2626;margin:0 0 8px;">\u5ef6\u9577\u3067\u304d\u307e\u305b\u3093</p>
<p style="font-size:14px;color:#6b7280;margin:0;">\u3053\u306e\u5f8c\u306b\u5225\u306e\u4e88\u7d04\u304c\u5165\u3063\u3066\u3044\u308b\u305f\u3081\u5ef6\u9577\u3067\u304d\u307e\u305b\u3093\u3002</p>`)
    return new Response(html, { status: 200, headers: HTML_HEADERS })
  }

  const newEndTime = addThirtyMin(booking.end_time)

  // 延長実行
  const { error: updateError } = await supabase
    .from('bookings')
    .update({ end_time: newEndTime })
    .eq('id', bookingId)

  if (updateError) {
    const html = page(`
<p style="font-size:20px;margin:0 0 12px;">&#10060;</p>
<p style="font-size:16px;font-weight:bold;color:#dc2626;margin:0 0 8px;">\u5ef6\u9577\u306b\u5931\u6557\u3057\u307e\u3057\u305f</p>
<p style="font-size:14px;color:#6b7280;margin:0;">\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002</p>`)
    return new Response(html, { status: 500, headers: HTML_HEADERS })
  }

  const html = page(`
<p style="font-size:20px;margin:0 0 12px;">&#9989;</p>
<p style="font-size:16px;font-weight:bold;color:#16a34a;margin:0 0 8px;">\u5ef6\u9577\u3057\u307e\u3057\u305f</p>
<p style="font-size:14px;color:#374151;margin:0;">\u65b0\u3057\u3044\u7d42\u4e86\u6642\u523b\uff1a<strong>${newEndTime}</strong></p>`)
  return new Response(html, { status: 200, headers: HTML_HEADERS })
})
