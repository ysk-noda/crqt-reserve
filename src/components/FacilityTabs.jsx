export default function FacilityTabs({ facilities, selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 pb-1">
      {facilities.map((f) => (
        <button
          key={f.id}
          onClick={() => onChange(f)}
          className={`
            flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-all
            ${selected.id === f.id
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-400 hover:text-blue-600 active:bg-blue-50'}
          `}
        >
          {f.name}
        </button>
      ))}
    </div>
  )
}
