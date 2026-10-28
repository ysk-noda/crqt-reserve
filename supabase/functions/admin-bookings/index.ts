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

    const expected = Deno.env.get('ADMIN_PASSWORD') ?? ''
    if (!expected || password !== expected) {
      return json({ error: 'unauthorized' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    if (action === 'list') {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
      if (error) return json({ error: error.message }, 500)
      return json({ bookings: data })
    }

    if (action === 'delete') {
      if (!id) return json({ error: 'id required' }, 400)
      const { error } = await supabase.from('bookings').delete().eq('id', id)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    return json({ error: 'unknown action' }, 400)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
