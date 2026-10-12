export const JOB_STATES = ['queued', 'running', 'succeeded', 'failed', 'cancelled']

// The backend stores UTC without saying so; read it as UTC, show it in local time.
export function formatTime(value) {
  if (!value) return '—'
  const utc = /[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`
  return new Date(utc).toLocaleString()
}

// "3 queued · 1 running · 12 succeeded" for a batch's parent; empty states left out.
export function childSummary(children) {
  if (!children) return null
  return JOB_STATES.filter(s => children[s]).map(s => `${children[s]} ${s}`).join(' · ')
}
