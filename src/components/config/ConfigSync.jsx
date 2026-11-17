import { useEffect, useState } from 'react'
import { formatAge, formatTimestamp } from './time'

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
