const STEPS = ['施設・日時選択', '内容確認', '予約完了']

export default function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-start justify-center py-2">
      {STEPS.map((label, idx) => {
        const step = idx + 1
        const isActive = step === currentStep
        const isDone = step < currentStep

        return (
          <div key={step} className="flex items-start">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${isDone
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-400'}
                `}
              >
                {isDone ? '✓' : step}
              </div>
              <span
                className={`text-xs mt-1 text-center max-w-[60px] leading-tight
                  ${isActive ? 'text-blue-600 font-semibold' : isDone ? 'text-green-600' : 'text-gray-400'}
                `}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-8 mt-3.5 mx-1 flex-shrink-0
                  ${isDone ? 'bg-green-400' : 'bg-gray-200'}
                `}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
