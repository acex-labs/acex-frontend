import { X, Zap } from 'lucide-react'

export default function BulkSelectionTray({
  selectedCount,
  totalMatching,
  selectingAll,
  selectAllProgress,
  onSelectAllMatching,
  onCancelSelectAll,
  onClearSelection,
  onApplyAction,
  entity = 'node',
  entityPlural,
}) {
  const plural = entityPlural ?? entity + 's'
  return (
    <div className="shrink-0 flex items-center gap-3 px-4 py-2 bg-surface border-b border-brand/20 text-xs">
      {/* Count */}
      <span className="font-semibold text-content tabular-nums">
        {selectedCount.toLocaleString()} {selectedCount === 1 ? entity : plural} selected
      </span>

      {/* Select all matching */}
      {totalMatching > 0 && selectedCount < totalMatching && (
        selectingAll ? (
          <span className="flex items-center gap-2 text-subtle">
            <span className="inline-block w-3 h-3 border border-brand border-t-transparent rounded-full animate-spin" />
            {selectAllProgress
              ? `${selectAllProgress.fetched.toLocaleString()} / ${selectAllProgress.total.toLocaleString()}`
              : 'Fetching…'}
            <button
              onClick={onCancelSelectAll}
              className="text-subtle hover:text-content transition-colors"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={onSelectAllMatching}
            className="text-brand hover:text-brand-soft transition-colors"
          >
            Select all {totalMatching.toLocaleString()} matching {plural}
          </button>
        )
      )}

      {/* Clear */}
      {selectedCount > 0 && !selectingAll && (
        <button
          onClick={onClearSelection}
          className="flex items-center gap-1 text-subtle hover:text-content transition-colors"
        >
          <X size={11} />
          Clear
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Apply action */}
      <button
        onClick={onApplyAction}
        disabled={selectedCount === 0}
        className="flex items-center gap-1.5 px-3 py-1 rounded bg-brand/10 border border-brand/30 text-brand font-semibold hover:bg-brand/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Zap size={11} />
        Apply action
      </button>
    </div>
  )
}
