function timeAgo(datetime) {
  const diffMs = Date.now() - new Date(datetime).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function Row({ label, value, mono }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 3 }}>
      <span style={{ fontSize: 9, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 52 }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--content)', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
  )
}

export default function EdgeTooltip({ tooltip }) {
  if (!tooltip) return null
  const { x, y, data } = tooltip
  return (
    <div style={{
      position: 'fixed',
      left: x + 14,
      top: y - 8,
      zIndex: 9999,
      background: 'var(--surface-hi)',
      border: '1px solid var(--edge)',
      borderRadius: 7,
      padding: '8px 12px',
      pointerEvents: 'none',
      minWidth: 180,
      boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
    }}>
      <Row label="Layer"    value={data.layer} />
      {data.links ? <LinkList links={data.links} /> : (
        <>
          <Row label="Local"    value={data.localInterface} mono />
          <Row label="Remote"   value={data.remoteInterface} mono />
          <Row label="Protocol" value={(data.protocol ?? 'lldp').toUpperCase()} />
          {data.collectedAt && <Row label="Seen" value={timeAgo(data.collectedAt)} />}
        </>
      )}
    </div>
  )
}

const MAX_LISTED = 8

// The links folded into an edge between two groups.
function LinkList({ links }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        {links.length} {links.length === 1 ? 'link' : 'links'}
      </div>
      {links.slice(0, MAX_LISTED).map((l, i) => (
        <div key={i} style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--content)', whiteSpace: 'nowrap', marginBottom: 2 }}>
          {l.a} ↔ {l.b}
        </div>
      ))}
      {links.length > MAX_LISTED && (
        <div style={{ fontSize: 10, color: 'var(--subtle)' }}>+{links.length - MAX_LISTED} more</div>
      )}
    </div>
  )
}
