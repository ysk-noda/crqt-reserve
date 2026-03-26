import { useNavigate } from 'react-router-dom'

export default function WelcomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* ロゴ・タイトル */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">施設予約</h1>
          <p className="text-sm text-gray-500 mt-1">三島クロケット</p>
        </div>

        {/* 選択 */}
        <p className="text-center text-gray-600 font-medium mb-6">ご利用の種別を選んでください</p>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 text-white rounded-2xl px-6 py-5 text-center shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            <p className="text-lg font-bold">会員の方</p>
            <p className="text-sm text-blue-200 mt-0.5">会議室・フォンボックスを予約</p>
          </button>

          <button
            onClick={() => navigate('/drop-in')}
            className="w-full bg-white text-gray-800 rounded-2xl px-6 py-5 text-center shadow-sm border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <p className="text-lg font-bold">ドロップインの方</p>
            <p className="text-sm text-gray-400 mt-0.5">フォンボックスを予約</p>
          </button>
        </div>

        {/* フッター */}
        <p className="text-center mt-8">
          <a href="/terms" className="text-xs text-gray-400 hover:text-gray-600 underline">
            利用規約
          </a>
        </p>
      </div>
    </div>
  )
}
