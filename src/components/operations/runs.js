import { parseTime } from '../jobs/jobs'

// What a run was ordered to do, in one line: its commands, its action and target, or the patch's paths.
export function runSummary(run) {
  const request = run.request ?? {}
  if (run.type.endsWith('.patch.render')) return ['render', scopeText(request.paths), request.prune && 'prune'].filter(Boolean).join(' ')
  if (run.type.endsWith('.patch.apply')) return `apply plan ${request.plan_id}`
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

// How long a run took, from being ordered to its last job finishing; while it runs, until `now`.
export function runDuration(run, now = Date.now()) {
  const end = run.finished_at ? parseTime(run.finished_at).getTime() : now
  return end - parseTime(run.created_at).getTime()
}

// Why ordering a run failed, from the API's answer: a message, or the fields that didn't validate.
export function orderError(err) {
  if (err.status === 503) return 'No message broker is configured, so nothing can run.'
  if (Array.isArray(err.detail)) return err.detail.map(d => `${d.loc?.slice(-1)[0]}: ${d.msg}`).join(' · ')
  return err.detail ?? err.message
}

// A plan's nodes by what they would get: one group per distinct patch, largest first; the nodes already in sync;
// those that differ only where their driver can't write; those whose read or render failed; and those not done yet.
export function planGroups(responses) {
  const patches = new Map()
  const groups = { patches: [], inSync: [], unwritable: [], failed: [], pending: [] }
  for (const r of responses) {
    if (r.state === 'failed' || r.state === 'cancelled') groups.failed.push(r)
    else if (!r.result) groups.pending.push(r)
    else if (r.result.in_sync) groups.inSync.push(r)
    else if (!r.result.patch_hash) groups.unwritable.push(r)
    else {
      const hash = r.result.patch_hash
      if (!patches.has(hash)) {
        patches.set(hash, { hash, patch: r.result.patch, changes: r.result.changes, unrendered: r.result.unrendered ?? [], nodes: [] })
      }
      patches.get(hash).nodes.push(r)
    }
  }
  groups.patches = [...patches.values()].sort((a, b) => b.nodes.length - a.nodes.length)
  return groups
}

// How many components a patch adds, changes and removes.
export function changeCounts(changes) {
  const count = op => changes.filter(c => c.op === op).length
  return { add: count('add'), change: count('change'), remove: count('remove') }
}

// A patch's paths in one line; none is the whole tree.
export const scopeText = paths => (paths?.length ? paths.join(', ') : 'whole tree')
