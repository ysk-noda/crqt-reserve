-- 既存DBへのマイグレーション: emailカラムを追加
-- Supabase SQL エディタで実行してください

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings (email);
