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
      <span style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 52 }}>{label}</span>
      <span style={{ fontSize: 11, color: '#ccc', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
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
      background: '#141414',
      border: '1px solid #2a2a2a',
      borderRadius: 7,
      padding: '8px 12px',
      pointerEvents: 'none',
      minWidth: 180,
      boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
    }}>
      <Row label="Local"    value={data.localInterface} mono />
      <Row label="Remote"   value={data.remoteInterface} mono />
      <Row label="Protocol" value={(data.protocol ?? 'lldp').toUpperCase()} />
      {data.collectedAt && <Row label="Seen" value={timeAgo(data.collectedAt)} />}
    </div>
  )
}
