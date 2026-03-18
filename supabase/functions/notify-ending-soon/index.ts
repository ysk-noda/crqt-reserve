import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'info@crqt.work'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// JST (UTC+9) の現在日付と、5分後の時刻文字列を取得
function getJSTTarget(): { date: string; targetTime: string } {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const date = jst.toISOString().split('T')[0] // YYYY-MM-DD

  const target = new Date(jst.getTime() + 5 * 60 * 1000)
  const h = String(target.getUTCHours()).padStart(2, '0')
  const m = String(target.getUTCMinutes()).padStart(2, '0')
  return { date, targetTime: `${h}:${m}` }
}

// HH:MM 同士の差分（分）を計算
function diffMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em) - (sh * 60 + sm)
}

// "YYYY-MM-DD" → "2025年1月15日（水）"
function formatDateJP(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const days = ['\u65e5', '\u6708', '\u706b', '\u6c34', '\u6728', '\u91d1', '\u571f']
  return `${y}\u5e74${m}\u6708${d}\u65e5\uff08${days[date.getDay()]}\uff09`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { date, targetTime } = getJSTTarget()

    // 終了時刻がちょうど5分後の予約を検索（メールあり）
    const { data: endingBookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('date', date)
      .eq('end_time', targetTime)
      .not('email', 'is', null)

    if (error) throw error

    const results = []

    for (const booking of (endingBookings ?? [])) {
      // 同じ施設・同日で直後の予約を検索
      const { data: nextBookings } = await supabase
        .from('bookings')
        .select('id, name')
        .eq('facility_id', booking.facility_id)
        .eq('date', date)
        .eq('start_time', booking.end_time)
        .limit(1)

      const hasNextBooking = (nextBookings?.length ?? 0) > 0

      // 延長可否：最大2時間（120分）を超えない場合のみ
      const currentDuration = diffMinutes(booking.start_time, booking.end_time)
      const canExtend = !hasNextBooking && currentDuration + 30 <= 120

      const extendUrl =
        `${SUPABASE_URL}/functions/v1/extend-booking?id=${encodeURIComponent(booking.id)}`
      const dateJP = formatDateJP(date)

      let extraSection = ''
      if (hasNextBooking) {
        extraSection = `
      <div style="background:#fef2f2;border-radius:8px;padding:16px;margin-bottom:20px;border:1px solid #fecaca;">
        <p style="margin:0;color:#991b1b;font-size:14px;">
          \u26a0\ufe0f \u3053\u306e\u5f8c\u3001\u540c\u3058\u65bd\u8a2d\u306e\u4e88\u7d04\u304c\u5165\u3063\u3066\u3044\u307e\u3059\u3002<br>
          \u3054\u5229\u7528\u6642\u9593\u7d42\u4e86\u5f8c\u306f\u304a\u65e9\u3081\u306b\u3054\u9000\u51fa\u304f\u3060\u3055\u3044\u3002
        </p>
      </div>`
      } else if (canExtend) {
        extraSection = `
      <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin-bottom:20px;border:1px solid #bbf7d0;text-align:center;">
        <p style="margin:0 0 12px;color:#166534;font-size:14px;">
          \u3053\u306e\u5f8c\u306e\u4e88\u7d04\u306f\u3042\u308a\u307e\u305b\u3093\u3002<br>30\u5206\u5ef6\u9577\u3067\u304d\u307e\u3059\u3002
        </p>
        <a href="${extendUrl}"
          style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;">
          30\u5206\u5ef6\u9577\u3059\u308b
        </a>
        <p style="margin:10px 0 0;color:#15803d;font-size:11px;">
          \u30dc\u30bf\u30f3\u3092\u30af\u30ea\u30c3\u30af\u3059\u308b\u3068\u4e88\u7d04\u304c30\u5206\u5ef6\u9577\u3055\u308c\u307e\u3059
        </p>
      </div>`
      } else {
        extraSection = `
      <div style="background:#fff7ed;border-radius:8px;padding:16px;margin-bottom:20px;border:1px solid #fed7aa;">
        <p style="margin:0;color:#92400e;font-size:14px;">
          \u3054\u5229\u7528\u6642\u9593\u7d42\u4e86\u5f8c\u306f\u304a\u65e9\u3081\u306b\u3054\u9000\u51fa\u304f\u3060\u3055\u3044\u3002
        </p>
      </div>`
      }

      const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#d97706;padding:24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">\u3082\u3046\u3059\u3050\u4e88\u7d04\u6642\u9593\u304c\u7d42\u4e86\u3057\u307e\u3059</h1>
      <p style="color:#fde68a;margin:6px 0 0;font-size:13px;">\u4e09\u5cf6\u30af\u30ed\u30b1\u30c3\u30c8</p>
    </div>
    <div style="padding:24px;">
      <p style="color:#374151;font-size:15px;margin:0 0 20px;">
        ${booking.name} \u69d8<br>
        \u3054\u4e88\u7d04\u306e\u7d42\u4e86\u6642\u9593\u307e\u3067\u3042\u30675\u5206\u3067\u3059\u3002
      </p>
      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;border:1px solid #e5e7eb;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:8px 0;color:#6b7280;width:80px;">\u65bd\u8a2d</td>
            <td style="padding:8px 0;color:#111827;font-weight:600;">${booking.facility_name}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;border-top:1px solid #f3f4f6;">\u65e5\u4ed8</td>
            <td style="padding:8px 0;color:#111827;font-weight:600;border-top:1px solid #f3f4f6;">${dateJP}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;border-top:1px solid #f3f4f6;">\u6642\u9593</td>
            <td style="padding:8px 0;color:#111827;font-weight:600;border-top:1px solid #f3f4f6;">${booking.start_time} 〜 ${booking.end_time}</td>
          </tr>
        </table>
      </div>
      ${extraSection}
      <p style="color:#9ca3af;font-size:12px;margin:0;">\u3053\u306e\u30e1\u30fc\u30eb\u306f\u81ea\u52d5\u9001\u4fe1\u3067\u3059\u3002</p>
    </div>
  </div>
</body>
</html>`

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: booking.email,
          subject: `\u3082\u3046\u3059\u3050\u4e88\u7d04\u6642\u9593\u304c\u7d42\u4e86\u3057\u307e\u3059 \uff08${booking.facility_name} ${dateJP}\uff09`,
          html,
        }),
      })

      const resBody = await res.json()
      results.push({ bookingId: booking.id, ok: res.ok, resend: resBody })
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  }
})
