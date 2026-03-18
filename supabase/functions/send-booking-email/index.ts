import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'info@crqt.work'
const BCC_EMAIL = 'info@crqt.work'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendEmail(payload: object): Promise<Response> {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // req.json() の文字化け対策：ArrayBuffer → TextDecoder で明示的に UTF-8 デコード
    const buffer = await req.arrayBuffer()
    const text = new TextDecoder('utf-8').decode(buffer)
    const { email, name, facilityName, date, timeRange, duration, appUrl } = JSON.parse(text)

    const cancelUrl = appUrl ?? 'https://crqt-reserve.vercel.app'

    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #f9fafb; margin: 0; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
    <div style="background: #2563eb; padding: 24px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 20px; font-weight: 700;">予約完了のお知らせ</h1>
      <p style="color: #bfdbfe; margin: 6px 0 0; font-size: 13px;">三島クロケット</p>
    </div>
    <div style="padding: 24px;">
      <p style="color: #374151; font-size: 15px; margin: 0 0 20px;">
        ${name} 様<br>
        以下の内容でご予約が完了しました。
      </p>
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
      <div style="background: #fff7ed; border-radius: 8px; padding: 16px; margin-bottom: 20px; border: 1px solid #fed7aa; text-align: center;">
        <p style="margin: 0 0 10px; color: #92400e; font-size: 13px;">予約内容の確認・キャンセルはこちら</p>
        <a href="${cancelUrl}"
          style="display: inline-block; background: #ea580c; color: #fff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          予約のキャンセルはこちらから
        </a>
        <p style="margin: 10px 0 0; color: #b45309; font-size: 11px;">
          ページを開いてヘッダーの「予約確認」からメールアドレスで検索できます
        </p>
      </div>
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        このメールは自動送信です。心当たりのない場合は無視してください。
      </p>
    </div>
  </div>
</body>
</html>
`

    const basePayload = {
      from: FROM_EMAIL,
      to: email,
      subject: `【予約完了】${facilityName} ${date}`,
      html,
    }

    // まずBCC付きで送信を試みる
    let res = await sendEmail({ ...basePayload, bcc: [BCC_EMAIL] })

    // BCCが原因で失敗した場合はBCCなしで再送
    if (!res.ok) {
      const errBody = await res.json()
      console.warn('BCC付き送信失敗、BCCなしで再試行:', JSON.stringify(errBody))
      res = await sendEmail(basePayload)
    }

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      status: res.ok ? 200 : 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
