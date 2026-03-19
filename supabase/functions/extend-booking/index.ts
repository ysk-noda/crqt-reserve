import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Supabase ゲートウェイは Content-Type: text/html を text/plain に強制上書きする。
// そのためレスポンス HTML は返さず、302 リダイレクトで React アプリ側に結果を渡す。
const APP_URL = 'https://crqt-reserve.vercel.app'

function redirect(path: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: `${APP_URL}${path}` },
  })
}

// HH:MM に 30 分加算した時刻文字列を返す
function addThirtyMin(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + 30
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

serve(async (req) => {
  const url = new URL(req.url)
  const bookingId = url.searchParams.get('id')

  if (!bookingId) {
    return redirect('/extend-result?result=error&reason=no_id')
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // 予約を取得
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    return redirect('/extend-result?result=error&reason=not_found')
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
    return redirect('/extend-result?result=error&reason=conflict')
  }

  const newEndTime = addThirtyMin(booking.end_time)

  // 延長実行
  const { error: updateError } = await supabase
    .from('bookings')
    .update({ end_time: newEndTime })
    .eq('id', bookingId)

  if (updateError) {
    return redirect('/extend-result?result=error&reason=db_error')
  }

  return redirect(`/extend-result?result=success&newEnd=${encodeURIComponent(newEndTime)}&facility=${encodeURIComponent(booking.facility_name)}`)
})
