import { useSearchParams } from 'react-router-dom'

const REASON_MESSAGES = {
  conflict: 'この後に別の予約が入っているため延長できません。',
  not_found: '予約情報が見つかりませんでした。',
  no_id: '無効なリンクです。',
  db_error: '延長処理に失敗しました。もう一度お試しください。',
}

export default function ExtendResultPage() {
  const [params] = useSearchParams()
  const result = params.get('result')   // 'success' | 'error'
  const newEnd = params.get('newEnd')
  const facility = params.get('facility')
  const reason = params.get('reason')

  const isSuccess = result === 'success'
  const errorMessage = REASON_MESSAGES[reason] ?? '延長できませんでした。'

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 w-full max-w-sm text-center">

        {isSuccess ? (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">延長しました</h1>
            {facility && (
              <p className="text-sm text-gray-500 mb-1">{facility}</p>
            )}
            <p className="text-base text-gray-700 mb-6">
              新しい終了時刻：<span className="font-bold text-blue-600 text-lg">{newEnd}</span>
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">延長できません</h1>
            <p className="text-sm text-gray-500 mb-6">{errorMessage}</p>
          </>
        )}

        <a
          href="/"
          className="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          予約ページへ戻る
        </a>
      </div>
    </div>
  )
}
