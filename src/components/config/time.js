const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i

// The backend sends UTC without a zone; read it as UTC.
function parse(iso) {
  return new Date(HAS_ZONE.test(iso) ? iso : `${iso}Z`)
}

export function formatAge(iso) {
  const seconds = Math.max(0, Math.floor((Date.now() - parse(iso).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  const days = Math.floor(hours / 24)
  return `${days} ${days === 1 ? 'day' : 'days'} ago`
}

export function formatTimestamp(iso) {
  return parse(iso).toLocaleString('sv-SE', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}
