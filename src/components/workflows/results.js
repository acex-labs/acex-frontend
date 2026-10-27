import { useQuery } from '@tanstack/react-query'
import { fetchStepResponses } from '../../api/workflows'

const UNFINISHED = ['scheduled', 'queued', 'running']

// The table's rows for a step that runs once: one per node for artifacts it has per node, and one for those it
// has once.
export function onceRows(stepResult) {
  const perNode = {}
  const once = {}
  for (const [name, a] of Object.entries(stepResult?.artifacts ?? {})) {
    if (a.nodes) Object.entries(a.nodes).forEach(([node, value]) => { (perNode[node] ??= {})[name] = value })
    else once[name] = a.value
  }
  const rows = Object.entries(perNode).map(([node, artifacts]) => ({ node, artifacts }))
  return Object.keys(once).length ? [{ node: '', artifacts: once }, ...rows] : rows
}

// The table's rows for a step on nodes: one per node that answered.
export function nodeRows(responses) {
  return responses.filter(r => r.result?.artifacts).map(r => ({ node: r.hostname ?? `#${r.node_id}`, artifacts: r.result.artifacts }))
}

// What each node answered in one round of a step on nodes, fetched once and kept fresh until the round is done.
export function useResponses(runId, stepRun, enabled = true) {
  return useQuery({
    queryKey: ['workflow-step-responses', runId, stepRun.job_id, stepRun.state],
    queryFn: () => fetchStepResponses(runId, stepRun.job_id),
    refetchInterval: UNFINISHED.includes(stepRun.state) ? 2000 : false,
    enabled,
  }).data
}
