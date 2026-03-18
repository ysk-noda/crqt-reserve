# crqt-reserve システム概要ドキュメント

> 三島クロケット 施設予約システム
> 最終更新: 2026-03-18

---

## 1. アプリの概要と目的

三島クロケットの社内向け施設予約システム。会議室・フォンボックスを、スタッフがスマートフォン・PCから手軽に予約できることを目的としている。外部サービスへの依存を最小限にしながら、予約・確認・キャンセル・延長通知までの一連のフローをカバーする。

**主な特徴**
- アカウント不要（名前とオプションのメールアドレスのみで予約）
- リアルタイムで空き状況を確認
- 予約時にメールを入力すると確認メール・終了5分前アラートが届く
- 予約終了5分前にメールから30分延長操作が可能
- `/admin` で予約一覧の確認・取り消しが可能

---

## 2. 画面構成と各画面の機能

### 2-1. 予約ページ (`/`)

3ステップの予約フロー。

#### Step 1 — 施設・日時選択

| エリア | 機能 |
|--------|------|
| 施設タブ | 5施設から選択。選択変更でカレンダー・時間をリセット |
| カレンダー | 月表示。予約が1件以上ある日は点マークで表示。過去日は選択不可 |
| 時間選択グリッド | 09:00〜18:00、30分単位の2クリック方式（後述）。予約済みスロットは赤表示 |

**時間選択の操作方法（2クリック方式）**
1. 開始時間をクリック → オレンジ色でハイライト、「終了時間をクリックしてください」と表示
2. 終了時間をクリック → 範囲が青色で確定（表示: 13:00〜14:30 など）
- 最大2時間（4スロット）まで
- 予約済みスロットをまたいだ選択は不可
- 同じ時間を再クリックでキャンセル

#### Step 2 — 予約者情報入力

- お名前（必須）
- メールアドレス（任意）: 入力時に確認メール送信、予約確認・キャンセルも可能

#### Step 3 — 予約完了

- 予約内容の表示
- 確認メール送信済みメッセージ（メール入力時）

#### 予約確認モーダル（ヘッダーの「予約確認」ボタン）

- メールアドレスで自分の予約（当日以降）を検索
- 各予約に「キャンセル」ボタン（メール照合でセキュリティ確保）

---

### 2-2. 管理者画面 (`/admin`)

パスワード認証（`VITE_ADMIN_PASSWORD` 環境変数、セッションストレージに保存）。

| 機能 | 詳細 |
|------|------|
| 予約一覧 | 施設・日付フィルター付き、日付・時刻順ソート |
| 取り消し | 確認ダイアログ付きで予約を即時削除 |
| フィルターリセット | ワンクリックで絞り込み解除 |

---

## 3. 使用技術スタック

### フロントエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| React | 18.3.1 | UIライブラリ |
| Vite | 5.4.1 | ビルドツール |
| Tailwind CSS | 3.4.10 | スタイリング |
| React Router DOM | 6.26.0 | SPAルーティング |
| @supabase/supabase-js | 2.45.0 | Supabase クライアント |

### バックエンド / データベース

| 技術 | 用途 |
|------|------|
| Supabase (PostgreSQL) | 予約データの永続化、RLS によるアクセス制御 |
| Supabase Edge Functions (Deno) | メール送信・予約延長処理 |
| pg_cron | 1分ごとのCronジョブ実行 |
| pg_net | CronジョブからのHTTPリクエスト送信 |

### インフラ

| サービス | 用途 |
|----------|------|
| Vercel | フロントエンドホスティング・SPA ルーティング |
| Supabase | BaaS（DB・認証・Edge Functions） |

### 外部サービス

| サービス | 用途 |
|----------|------|
| Resend API | トランザクションメール送信 |

---

## 4. システム構成図

```
┌─────────────────────────────────────────────────────────────┐
│                        ユーザー (ブラウザ)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        Vercel                                │
│   React SPA (Vite build)                                    │
│   ・/ → BookingPage                                         │
│   ・/admin → AdminPage                                      │
│   ・vercel.json でSPAフォールバック設定                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ Supabase JS SDK / fetch
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase                                │
│                                                             │
│  ┌──────────────┐    ┌────────────────────────────────────┐ │
│  │  PostgreSQL   │    │         Edge Functions (Deno)      │ │
│  │              │    │                                    │ │
│  │  bookings    │◄───┤  send-booking-email                │ │
│  │  テーブル    │    │    └─ 予約確認メール送信             │ │
│  │              │◄───┤  notify-ending-soon                │ │
│  │  RLS: anon   │    │    └─ 終了5分前アラートメール        │ │
│  │  全操作許可  │◄───┤  extend-booking                   │ │
│  │              │    │    └─ 予約時間の30分延長             │ │
│  └──────────────┘    └────────────────────────────────────┘ │
│         ▲                         │                         │
│         │ HTTP POST (pg_net)       │                         │
│  ┌──────┴─────────────────┐        │                         │
│  │  pg_cron               │        │                         │
│  │  毎分: notify-ending-soon       │                         │
│  └────────────────────────┘        │ Resend API              │
│                                    ▼                         │
└────────────────────────────────────┼────────────────────────┘
                                     │
                                     ▼
                          ┌──────────────────┐
                          │   Resend API     │
                          │  メール送信      │
                          │  from: info@     │
                          │       crqt.work  │
                          └──────────────────┘
```

---

## 5. データベーステーブル構造

### `bookings` テーブル

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | 内部ID（延長ボタンURL等で使用） |
| `booking_number` | TEXT | UNIQUE NOT NULL | 外部公開用予約番号（UUID形式、表示なし） |
| `facility_id` | TEXT | NOT NULL | 施設コード（例: `meeting1`） |
| `facility_name` | TEXT | NOT NULL | 施設表示名（例: `会議室（地下）`） |
| `date` | DATE | NOT NULL | 予約日（`YYYY-MM-DD`） |
| `start_time` | TEXT | NOT NULL | 開始時刻（`HH:MM` 形式、例: `09:00`） |
| `end_time` | TEXT | NOT NULL | 終了時刻（`HH:MM` 形式、例: `10:30`） |
| `name` | TEXT | NOT NULL | 予約者名 |
| `email` | TEXT | NULL許容 | メールアドレス（任意入力） |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 予約作成日時 |

### インデックス

| インデックス名 | 対象カラム | 目的 |
|--------------|-----------|------|
| `idx_bookings_unique_start` | `(facility_id, date, start_time)` | 同一施設・同日・同開始時刻の重複予約防止 |
| `idx_bookings_email` | `(email)` | メール検索の高速化 |

### セキュリティ

- RLS（Row Level Security）有効
- `anon` ロールに全操作を許可（社内ツールのため簡易設定）
- ユーザーのキャンセルはメールアドレス照合で自分の予約のみ削除可能

### マスタ定義（コード内）

施設マスタはDBではなく `src/lib/utils.js` に定数として定義:

```
meeting1   → 会議室（地下）
meeting2   → 会議室（2階）
phoneboxA  → フォンボックス（入口）
phoneboxB  → フォンボックス（地下・手前）
phoneboxC  → フォンボックス（地下・奥）
```

---

## 6. 外部サービスとの連携フロー

### 6-1. 予約確認メール（Resend）

```
ユーザーが予約を確定（Step2 → Step3）
    │
    ├─ Supabase DB に INSERT
    │
    └─ [メール入力時] fetch で send-booking-email Edge Function を呼び出し
           │
           │  payload: { email, name, facilityName, date, timeRange, duration, appUrl }
           │  ※ 日本語文字列は \uXXXX エスケープで文字化け防止
           │
           └─ Resend API → ユーザーメールアドレスへ確認メール
                          BCC: info@crqt.work
```

**メール内容:** 施設名・日付・時間の予約詳細 + キャンセルページへのリンク

---

### 6-2. 終了5分前アラートメール（pg_cron + Resend）

```
pg_cron（毎分実行）
    │
    └─ pg_net で notify-ending-soon Edge Function に HTTP POST
           │
           ├─ getJSTTarget(): 現在のJST時刻 + 5分 = targetTime を計算
           │
           ├─ bookings テーブルを検索
           │   WHERE end_time = targetTime AND date = 今日 AND email IS NOT NULL
           │
           └─ 該当予約ごとに:
               │
               ├─ 同施設・同日で直後の予約を確認（hasNextBooking）
               ├─ 現在の利用時間 + 30分 ≤ 120分 かを確認（canExtend）
               │
               └─ Resend API でアラートメール送信
                   ├─ 延長可能 → 緑: 「30分延長する」ボタン付き
                   ├─ 次の予約あり → 赤: 「次の予約があります」警告
                   └─ 延長不可 → 橙: 「時間内にご退出ください」
```

---

### 6-3. 予約延長（extend-booking Edge Function）

```
ユーザーがアラートメールの「30分延長する」ボタンをクリック
    │
    └─ GET /functions/v1/extend-booking?id={bookingId}
           │
           ├─ 予約の取得・存在確認
           ├─ 最大2時間（120分）チェック
           ├─ 後続予約との競合チェック
           │
           └─ OK → bookings.end_time を +30分に UPDATE
                   → HTMLページ（成功/失敗）を返す
                   → 予約ページ（crqt-reserve.vercel.app）へ誘導
```

---

## 7. 自動処理一覧（Cron Job）

| ジョブ名 | スケジュール | 処理内容 |
|---------|-------------|---------|
| `notify-ending-soon` | 毎分 (`* * * * *`) | 終了5分前の予約を検索し、アラートメールを送信 |

### セットアップ方法

1. Supabase Dashboard → Database → Extensions で以下を有効化:
   - `pg_cron`
   - `pg_net`

2. `supabase/migrations/002_cron_job.sql` の内容をSQL Editorで実行

3. Supabase Dashboard → Edge Functions の Secrets に以下を追加:
   - `RESEND_API_KEY`: Resend のAPIキー
   - `RESEND_FROM_EMAIL`: `info@crqt.work`

4. Edge Functions を `--no-verify-jwt` フラグ付きでデプロイ（`supabase/config.toml` で設定済み）

### 動作確認クエリ

```sql
-- ジョブの登録確認
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'notify-ending-soon';
```

---

## 8. 環境変数一覧

### フロントエンド（Vercel 環境変数）

| 変数名 | 説明 |
|--------|------|
| `VITE_SUPABASE_URL` | Supabase プロジェクトURL |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名キー（公開可） |
| `VITE_ADMIN_PASSWORD` | 管理者画面のログインパスワード |

### Edge Functions（Supabase Secrets）

| 変数名 | 説明 |
|--------|------|
| `RESEND_API_KEY` | Resend APIキー（秘密） |
| `RESEND_FROM_EMAIL` | 送信元アドレス（`info@crqt.work`） |
| `SUPABASE_URL` | 自動設定（Edge Functions 実行時） |
| `SUPABASE_SERVICE_ROLE_KEY` | 自動設定（Edge Functions 実行時） |

---

## 9. ファイル構成

```
crqt_reserve/
├── src/
│   ├── App.jsx                        # ルーター設定（/ と /admin）
│   ├── main.jsx                       # エントリポイント
│   ├── pages/
│   │   ├── BookingPage.jsx            # メイン予約画面（3ステップ）
│   │   └── AdminPage.jsx              # 管理者画面
│   ├── components/
│   │   ├── FacilityTabs.jsx           # 施設選択タブ
│   │   ├── Calendar.jsx               # カレンダーコンポーネント
│   │   ├── TimeSlots.jsx              # 時間選択グリッド（2クリック方式）
│   │   ├── StepIndicator.jsx          # ステップ進捗表示
│   │   └── MyReservations.jsx         # 予約確認・キャンセルモーダル
│   └── lib/
│       ├── supabase.js                # Supabase クライアント初期化
│       └── utils.js                   # 定数・ユーティリティ関数
│
├── supabase/
│   ├── config.toml                    # ローカル開発設定・JWT検証無効化設定
│   ├── schema.sql                     # 初期DDL
│   ├── migrations/
│   │   ├── 001_add_email.sql          # email カラム追加
│   │   └── 002_cron_job.sql           # Cron Job セットアップ
│   └── functions/
│       ├── send-booking-email/
│       │   └── index.ts               # 予約確認メール送信
│       ├── notify-ending-soon/
│       │   └── index.ts               # 終了5分前アラートメール
│       └── extend-booking/
│           └── index.ts               # 予約30分延長処理
│
├── docs/
│   └── system-overview.md             # 本ドキュメント
│
├── .env.example                       # 環境変数サンプル
├── vercel.json                        # SPA ルーティング設定
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 10. 今後の改善候補

### 機能面

| 優先度 | 改善内容 | 理由 |
|--------|---------|------|
| 高 | メール入力なしでもキャンセル可能にする | 現状、メール未入力の予約はキャンセル不可 |
| 高 | 予約のカレンダー表示（週次・日次ビュー） | 複数施設の空き状況を一覧確認したい |
| 中 | 繰り返し予約（毎週○曜日）のサポート | 定例会議などの予約を都度入力する手間を削減 |
| 中 | 管理者によるCSV出力 | 月次の利用実績集計に活用 |
| 低 | LINE通知オプション | メールを使わないユーザーへの通知手段 |

### 技術面

| 優先度 | 改善内容 | 理由 |
|--------|---------|------|
| 高 | 管理者パスワードをSupabase Auth に移行 | 現状はフロントエンドで平文比較のみ |
| 中 | 予約データのアーカイブ処理 | 過去データが蓄積し続けるためDB容量の圧迫が懸念 |
| 低 | E2E テストの追加（Playwright等） | 予約フロー・メール送信の回帰テスト |
