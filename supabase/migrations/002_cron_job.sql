-- 終了5分前通知 Cron Job セットアップ
-- Supabase Dashboard の SQL Editor でこのファイルの内容を実行してください
--
-- 前提条件:
--   Supabase Dashboard > Database > Extensions で以下を有効化してください:
--     - pg_cron
--     - pg_net
--
-- 実行前に YOUR_PROJECT_REF を実際のプロジェクトリファレンス ID に置換してください

-- 既存のジョブがある場合は削除して再作成
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-ending-soon') THEN
    PERFORM cron.unschedule('notify-ending-soon');
  END IF;
END $$;

-- 1分ごとに notify-ending-soon Edge Function を呼び出す
-- ※ verify_jwt = false の設定により認証ヘッダー不要
SELECT cron.schedule(
  'notify-ending-soon',
  '* * * * *',
  $$
  SELECT net.http_post(
    url        := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-ending-soon',
    headers    := '{"Content-Type": "application/json"}'::jsonb,
    body       := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  $$
);

-- 登録確認
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'notify-ending-soon';
