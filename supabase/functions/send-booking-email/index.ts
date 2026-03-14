import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS プリフライト
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, name, facilityName, date, timeRange, duration, bookingNumber } =
      await req.json()

    const html = `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #f9fafb; margin: 0; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
    <!-- ヘッダー -->
    <div style="background: #2563eb; padding: 24px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 20px; font-weight: 700;">予約完了のお知らせ</h1>
    </div>

    <!-- 本文 -->
    <div style="padding: 24px;">
      <p style="color: #374151; font-size: 15px; margin: 0 0 20px;">
        ${name} 様<br>
        以下の内容でご予約が完了しました。
      </p>

      <!-- 予約内容 -->
      <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 80px; vertical-align: top;">施設</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 600;">${facilityName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; border-top: 1px solid #f3f4f6; vertical-align: top;">日付</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 600; border-top: 1px solid #f3f4f6;">${date}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; border-top: 1px solid #f3f4f6; vertical-align: top;">時間</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 600; border-top: 1px solid #f3f4f6;">${timeRange}（${duration}分）</td>
          </tr>
        </table>
      </div>

      <!-- 予約番号 -->
      <div style="background: #eff6ff; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #bfdbfe; margin-bottom: 20px;">
        <p style="margin: 0 0 6px; color: #6b7280; font-size: 12px;">予約番号</p>
        <p style="margin: 0; font-size: 26px; font-weight: 700; color: #2563eb; font-family: 'Courier New', monospace; letter-spacing: 3px;">${bookingNumber}</p>
        <p style="margin: 10px 0 0; color: #ef4444; font-size: 12px; font-weight: 600;">⚠ キャンセル時に必要です。大切に保管してください。</p>
      </div>

      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        このメールは自動送信です。心当たりのない場合は無視してください。
      </p>
    </div>
  </div>
</body>
</html>
`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: `【予約完了】${facilityName}  ${bookingNumber}`,
        html,
      }),
    })

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
