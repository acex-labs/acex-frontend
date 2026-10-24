// What a run was ordered to do, in one line: its commands, or its action and target.
export function runSummary(run) {
  const request = run.request ?? {}
  if (request.commands) return request.commands.join('; ')
  const action = run.type.split('.').pop()
  const p = request.params ?? {}
  return [action, p.target, p.vrf && `vrf ${p.vrf}`, p.count > 1 && `×${p.count}`, p.size && `${p.size} B`]
    .filter(Boolean).join(' ')
}

export const FINISHED = ['succeeded', 'failed', 'cancelled']

// How many of a run's jobs have finished, of how many.
export function runProgress(run) {
  const jobs = run.jobs ?? {}
  const total = Object.values(jobs).reduce((a, b) => a + b, 0)
  const done = FINISHED.reduce((a, s) => a + (jobs[s] ?? 0), 0)
  return { done, total, failed: jobs.failed ?? 0 }
}

// Why ordering a run failed, from the API's answer: a message, or the fields that didn't validate.
export function orderError(err) {
  if (err.status === 503) return 'No message broker is configured, so nothing can run.'
  if (Array.isArray(err.detail)) return err.detail.map(d => `${d.loc?.slice(-1)[0]}: ${d.msg}`).join(' · ')
  return err.detail ?? err.message
}
