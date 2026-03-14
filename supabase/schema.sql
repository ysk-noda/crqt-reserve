-- 施設予約システム Supabase スキーマ
-- Supabase の SQL エディタにこれをコピペして実行してください

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT UNIQUE NOT NULL,
  facility_id TEXT NOT NULL,
  facility_name TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,  -- 例: "09:00"
  end_time TEXT NOT NULL,    -- 例: "10:30"
  name TEXT NOT NULL,
  email TEXT,                -- メールアドレス（任意）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 同一施設・同一日・同一開始時刻の重複を防ぐインデックス
CREATE UNIQUE INDEX idx_bookings_unique_start
  ON bookings (facility_id, date, start_time);

-- RLS（Row Level Security）を有効化
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 匿名ユーザーに全操作を許可（シンプルな社内ツール向け）
CREATE POLICY "allow_all_anon" ON bookings
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- メール検索用インデックス
CREATE INDEX idx_bookings_email ON bookings (email);

-- 確認用クエリ（実行後に予約データを確認できます）
-- SELECT * FROM bookings ORDER BY created_at DESC LIMIT 10;
