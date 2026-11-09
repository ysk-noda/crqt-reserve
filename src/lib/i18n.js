// 文言辞書（2026-11-09 デジタルノマド受け入れ用に /en を追加）
// 日本語は従来のページに表示していた文言と一字一句同じにすること（会員ページの見た目を変えないため）。
// 予約データ（facility_name）は言語によらず日本語の正式名で保存する → utils.js の FACILITY_NAME_JA

// 英語ページで予約できる施設（フォンボックスのみ。会議室は会員専用のため出さない）
export const FACILITIES_EN = [
  { id: 'phoneboxA', name: 'Phone Booth — Entrance' },
  { id: 'phoneboxB', name: 'Phone Booth — Basement (front)' },
  { id: 'phoneboxC', name: 'Phone Booth — Basement (back)' },
]

// "YYYY-MM-DD" → "Fri, Nov 13, 2026"
export function formatDateEN(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${dows[date.getDay()]}, ${months[m - 1]} ${d}, ${y}`
}

export const STR = {
  ja: {
    // ヘッダー
    headerTitle: '施設予約',
    dropinBadge: 'ドロップイン専用',
    siteName: '三島クロケット',
    termsLabel: '利用規約',
    myLong: '予約確認・キャンセル',
    myShort: '確認・取消',
    // STEP 1
    s1Facility: '① 施設を選ぶ',
    s1Date: '② 日付を選ぶ',
    s1Time: '③ 時間を選ぶ',
    timeHint: '開始時刻をクリック → 終了時刻をクリック（例: 10:00 → 11:30 で 90分）',
    pendingMsg: (t) => `開始: ${t} — 終了時刻をクリックしてください`,
    pendingCancel: '同じ時刻をクリックするとキャンセルできます',
    selecting: '選択中: ',
    minutes: (n) => `（${n}分）`,
    reselectHint: '再選択するには開始時間をクリックしてください',
    selectDatePrompt: '← 日付を選択すると時間が表示されます',
    nextBtn: '次へ（内容確認）',
    // STEP 2
    reviewTitle: '予約内容の確認',
    facility: '施設',
    date: '日付',
    time: '時間',
    nameLabel: 'お名前',
    namePlaceholder: '山田 太郎',
    emailLabel: 'メールアドレス',
    optional: '（任意）',
    emailHint: '入力すると確認メールが届き、後から予約の確認・キャンセルができます',
    submitError: '予約に失敗しました。時間を置いて再度お試しください。',
    back: '戻る',
    confirmBtn: '予約を確定する',
    submitting: '予約中...',
    // STEP 3
    doneTitle: '予約完了！',
    doneSub: 'ご予約を承りました',
    doneMail: (email) => `確認メールを ${email} に送信しました`,
    doneBox: '予約内容',
    doneName: 'お名前',
    doneEmail: 'メール',
    colon: '：',
    again: '続けて予約する',
    // ステップ表示
    steps: ['施設・日時選択', '内容確認', '予約完了'],
    // カレンダー
    dows: ['日', '月', '火', '水', '木', '金', '土'],
    monthLabel: (y, m) => `${y}年${m}月`,
    // 時間スロット
    hourLabel: (h) => `${h}時`,
    hour24: '24時',
    legendBooked: '埋まっています',
    legendStart: '開始時刻',
    legendSelected: '選択中',
    legendEnd: '終了時刻',
    // 予約確認・キャンセル
    myTitle: '予約確認・キャンセル',
    myEmailLabel: '予約時に入力したメールアドレス',
    myEmailHint: 'メールアドレスを入力すると、ご自身の予約一覧が表示されます',
    search: '検索',
    searching: '検索中...',
    notFound: '予約が見つかりませんでした',
    notFoundNote: '※ 過去の予約・メール未入力の予約は表示されません',
    found: (n) => `${n}件の予約が見つかりました`,
    cancel: 'キャンセル',
    canceling: '処理中...',
    confirmCancel: (b) =>
      `以下の予約をキャンセルしますか？\n\n${b.facility_name}\n${b.date}  ${b.start_time} 〜 ${b.end_time}\n${b.name} 様`,
    cancelFailed: 'キャンセルに失敗しました。',
  },

  en: {
    // Header
    headerTitle: 'Facility Booking',
    dropinBadge: '',
    siteName: 'Mishima CROQUET',
    termsLabel: 'Terms (Japanese)',
    myLong: 'My bookings / Cancel',
    myShort: 'My bookings',
    // STEP 1
    s1Facility: '① Choose a facility',
    s1Date: '② Pick a date',
    s1Time: '③ Pick a time',
    timeHint: 'Click a start time, then an end time (e.g. 10:00 → 11:30 = 90 min)',
    pendingMsg: (t) => `Start: ${t} — now click an end time`,
    pendingCancel: 'Click the same time again to cancel',
    selecting: 'Selected: ',
    minutes: (n) => ` (${n} min)`,
    reselectHint: 'Click a new start time to change your selection',
    selectDatePrompt: '← Pick a date to see available times',
    nextBtn: 'Next (review)',
    // STEP 2
    reviewTitle: 'Review your booking',
    facility: 'Facility',
    date: 'Date',
    time: 'Time',
    nameLabel: 'Your name',
    namePlaceholder: 'e.g. Jane Smith',
    emailLabel: 'Email',
    optional: ' (optional)',
    emailHint: 'Enter it to get a confirmation email and to view or cancel your booking later. Note: emails arrive in Japanese — please keep them as your booking record.',
    submitError: 'Booking failed. Please try again in a moment.',
    back: 'Back',
    confirmBtn: 'Confirm booking',
    submitting: 'Booking...',
    // STEP 3
    doneTitle: 'Booking complete!',
    doneSub: 'Your booking has been received',
    doneMail: (email) => `A confirmation email (in Japanese) was sent to ${email}`,
    doneBox: 'Booking details',
    doneName: 'Name',
    doneEmail: 'Email',
    colon: ': ',
    again: 'Make another booking',
    // Steps
    steps: ['Facility & time', 'Review', 'Done'],
    // Calendar
    dows: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    monthLabel: (y, m) => {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      return `${months[m - 1]} ${y}`
    },
    // Time slots
    hourLabel: (h) => `${h}:00`,
    hour24: '24:00',
    legendBooked: 'Booked',
    legendStart: 'Start',
    legendSelected: 'Selected',
    legendEnd: 'End',
    // My bookings
    myTitle: 'My Bookings',
    myEmailLabel: 'Email address you used when booking',
    myEmailHint: 'Enter your email to see your upcoming bookings',
    search: 'Search',
    searching: 'Searching...',
    notFound: 'No bookings found',
    notFoundNote: 'Past bookings and bookings made without an email are not shown',
    found: (n) => `${n} booking(s) found`,
    cancel: 'Cancel',
    canceling: '...',
    confirmCancel: (b) =>
      `Cancel this booking?\n\n${b.facility_name}\n${b.date}  ${b.start_time} – ${b.end_time}\n${b.name}`,
    cancelFailed: 'Could not cancel. Please try again.',
  },
}
