import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ offset, limit, total, onChange }) {
  const page = Math.floor(offset / limit)
  const pageCount = Math.ceil(total / limit)
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + limit, total)

  return (
    <div className="flex items-center justify-between px-6 py-2 border-t border-edge shrink-0">
      <span className="text-[11px] text-subtle">
        {total === 0 ? 'No results' : `${from}–${to} of ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(offset - limit)}
          disabled={page === 0}
          className="p-1 rounded text-subtle hover:text-content hover:bg-surface-hi disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="text-[11px] text-subtle px-2">
          {pageCount === 0 ? '—' : `${page + 1} / ${pageCount}`}
        </span>
        <button
          onClick={() => onChange(offset + limit)}
          disabled={page >= pageCount - 1}
          className="p-1 rounded text-subtle hover:text-content hover:bg-surface-hi disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}
