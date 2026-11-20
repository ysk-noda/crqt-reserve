import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 管理画面（AdminPage）専用のAPI。
// 以前は管理画面がanonキーで bookings を直接 select/delete していたが、
// RLSを締めた（2026-10-28）のでここに移した。パスワード照合はサーバー側で行う。
// パスワードは Edge Function の secret「ADMIN_PASSWORD」。変更は：
//   npx supabase secrets set ADMIN_PASSWORD=新しい値 --project-ref jldhnoohjtwhzavjqgub

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const buffer = await req.arrayBuffer()
    const text = new TextDecoder('utf-8').decode(buffer)
    const { password, action, id } = JSON.parse(text)
    // ※ action: list / delete / release

    const expected = Deno.env.get('ADMIN_PASSWORD') ?? ''
    if (!expected || password !== expected) {
      return json({ error: 'unauthorized' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    if (action === 'list') {
      // Supabaseは1リクエスト最大1000行のため、ページングで全件取得する
      // （1000件で切れて新しい予約が管理画面に出ない不具合の修正。2026-11-05）
      const PAGE = 1000
      const all: unknown[] = []
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .order('date', { ascending: true })
          .order('start_time', { ascending: true })
          .range(from, from + PAGE - 1)
        if (error) return json({ error: error.message }, 500)
        all.push(...(data ?? []))
        if (!data || data.length < PAGE) break
      }
      return json({ bookings: all })
    }

    if (action === 'delete') {
      if (!id) return json({ error: 'id required' }, 400)
      const { error } = await supabase.from('bookings').delete().eq('id', id)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    // 解放：予定より早く終わった予約を「今ここで終了」にする（2026-11-20）。
    // 使用中なら終了時刻を「いまの30分枠の始まり」に縮める（いまの枠から次の人が予約できるように。
    // 予約画面は30分枠単位で「start<=枠<end」を埋まりと判定するため、分単位で縮めても今の枠は空かない）。
    // まだ始まっていない／縮めると0分になる場合は削除（＝取り消し）。過去日・終了済みは触らない。
    // 時刻はブラウザではなくサーバーの日本時間で判定する。
    if (action === 'release') {
      if (!id) return json({ error: 'id required' }, 400)
      const { data: b, error: e1 } = await supabase
        .from('bookings').select('id, date, start_time, end_time').eq('id', id).maybeSingle()
      if (e1) return json({ error: e1.message }, 500)
      if (!b) return json({ error: 'not found' }, 404)

      const jst = new Date(Date.now() + 9 * 60 * 60 * 1000)
      const today = jst.toISOString().slice(0, 10)
      const nowMin = jst.getUTCHours() * 60 + jst.getUTCMinutes()
      const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
      const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
      const s = toMin(b.start_time), e = toMin(b.end_time)

      if (b.date < today || (b.date === today && nowMin >= e)) {
        return json({ error: 'already ended' }, 409)
      }
      const floor = Math.floor(nowMin / 30) * 30
      if (b.date > today || floor <= s) {
        const { error } = await supabase.from('bookings').delete().eq('id', id)
        if (error) return json({ error: error.message }, 500)
        return json({ ok: true, result: 'deleted' })
      }
      const newEnd = hhmm(floor)
      const { error } = await supabase.from('bookings').update({ end_time: newEnd }).eq('id', id)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true, result: 'shortened', end_time: newEnd })
    }

    return json({ error: 'unknown action' }, 400)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
