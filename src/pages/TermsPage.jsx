import { useNavigate } from 'react-router-dom'

export default function TermsPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-blue-600 hover:text-blue-800 mb-6 inline-flex items-center gap-1"
        >
          ← 戻る
        </button>

        <h1 className="text-xl font-bold text-gray-800 mb-1">利用規約</h1>
        <p className="text-sm text-gray-400 mb-8">三島クロケット 施設予約システム</p>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-bold text-gray-800 mb-2">第1条（取得する情報）</h2>
            <p>本システムでは、施設の予約に際して以下の情報を取得します。</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
              <li>お名前</li>
              <li>メールアドレス（任意）</li>
              <li>予約内容（施設・日付・時間帯）</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-gray-800 mb-2">第2条（利用目的）</h2>
            <p>取得した情報は、以下の目的にのみ使用します。</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
              <li>施設予約の管理および重複防止</li>
              <li>予約確認メールの送信</li>
              <li>予約終了前アラートメールの送信</li>
            </ul>
            <p className="mt-2">取得した情報を第三者へ提供することはありません。</p>
          </section>

          <section>
            <h2 className="font-bold text-gray-800 mb-2">第3条（禁止事項）</h2>
            <p>利用者は以下の行為を行ってはなりません。</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
              <li>他の利用者の予約を妨害する行為</li>
              <li>虚偽の情報を入力する行為</li>
              <li>本システムの運営を妨げる行為</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-gray-800 mb-2">第4条（免責事項）</h2>
            <p>
              システムの障害・予約データの消失・通信障害その他の事由による損害について、
              運営は一切の責任を負いません。また、本システムの動作を保証するものではありません。
            </p>
          </section>

          <section>
            <h2 className="font-bold text-gray-800 mb-2">第5条（準拠法）</h2>
            <p>本規約は日本法に準拠し、日本法に従って解釈されます。</p>
          </section>

        </div>

        <p className="text-xs text-gray-400 mt-10 pt-6 border-t border-gray-100 text-right">
          三島クロケット
        </p>
      </div>
    </div>
  )
}
