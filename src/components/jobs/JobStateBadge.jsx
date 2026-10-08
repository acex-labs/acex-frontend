const STYLES = {
  queued:    'bg-surface-hi text-subtle',
  running:   'bg-brand/10 text-brand',
  succeeded: 'bg-green-500/10 text-green-400',
  failed:    'bg-red-500/10 text-red-400',
  cancelled: 'bg-surface-hi text-content',
}

export default function JobStateBadge({ state }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${STYLES[state] ?? 'bg-surface-hi text-subtle'}`}
    >
      {state}
    </span>
  )
}
