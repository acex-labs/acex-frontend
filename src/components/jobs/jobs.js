export const JOB_STATES = ['scheduled', 'queued', 'running', 'paused', 'succeeded', 'failed', 'cancelled']

// The backend stores UTC without saying so; read it as UTC.
export function parseTime(value) {
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`)
}

// A time from the backend, in local time.
export function formatTime(value) {
  if (!value) return '—'
  return parseTime(value).toLocaleString()
}

// "850 ms", "42 s", "3 min 4 s" or "1 h 2 min".
export function formatDuration(ms) {
  if (ms < 1000) return `${Math.max(0, Math.round(ms))} ms`
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s} s`
  if (s < 3600) return `${Math.floor(s / 60)} min ${s % 60} s`
  return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`
}

// "3 queued · 1 running · 12 succeeded" for a batch's parent; empty states left out.
export function childSummary(children) {
  if (!children) return null
  return JOB_STATES.filter(s => children[s]).map(s => `${children[s]} ${s}`).join(' · ')
}
