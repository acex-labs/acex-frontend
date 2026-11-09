import { useEffect, useState } from 'react'

const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i

function parse(iso) {
  return new Date(HAS_ZONE.test(iso) ? iso : `${iso}Z`)
}

function formatAge(iso) {
  const seconds = Math.max(0, Math.floor((Date.now() - parse(iso).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  const days = Math.floor(hours / 24)
  return `${days} ${days === 1 ? 'day' : 'days'} ago`
}

function formatTimestamp(iso) {
  return parse(iso).toLocaleString('sv-SE', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export function Age({ iso }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => tick(n => n + 1), 30_000)
    return () => clearInterval(timer)
  }, [])
  return <span title={formatTimestamp(iso)}>{formatAge(iso)}</span>
}

const NOT_RECORDED = 'Recorded the next time the collection agent polls this node'

export function LastSynced({ snapshot }) {
  if (!snapshot) return 'Never collected'
  if (!snapshot.last_collected_at) return <span title={NOT_RECORDED}>Not recorded yet</span>
  return <Age iso={snapshot.last_collected_at} />
}

export function SyncSummary({ snapshot }) {
  if (!snapshot) return 'Never collected'
  return (
    <>
      {snapshot.last_collected_at
        ? <>Last synced <Age iso={snapshot.last_collected_at} /></>
        : <span title={NOT_RECORDED}>Last sync not recorded yet</span>}
      {' · '}config changed <Age iso={snapshot.created_at} />
    </>
  )
}
