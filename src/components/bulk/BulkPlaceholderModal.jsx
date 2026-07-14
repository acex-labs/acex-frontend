import { X } from 'lucide-react'

export default function BulkPlaceholderModal({ selectedCount, entity = 'item', entityPlural, onClose }) {
  const plural = entityPlural ?? entity + 's'
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-surface border border-edge rounded-xl p-6 flex flex-col gap-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-subtle mb-0.5">Bulk Action</div>
            <div className="text-sm font-semibold text-content">
              {selectedCount.toLocaleString()} {selectedCount === 1 ? entity : plural}
            </div>
          </div>
          <button onClick={onClose} className="text-subtle hover:text-content transition-colors">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-subtle">Bulk actions for {plural} are coming soon.</p>
      </div>
    </div>
  )
}
