import { useRef } from 'react'

// Explicit node membership via the declarative PUT …/nodes endpoint.
//
// Every edit sends the full desired list plus `expected_revision`, so a
// concurrent change by someone else fails with 409 instead of being
// overwritten. Edits are queued, and each one builds on the result of the
// previous PUT — clicking remove on several nodes quickly doesn't race the
// (polled) agent listing or resurrect a node that was just removed.
export function useAgentNodeSet(agent, putNodes, onSettled) {
  const latest = useRef(null) // { id, revision, nodes } after our last successful PUT
  const queue  = useRef(Promise.resolve())

  const base = (target) => {
    const l = latest.current
    if (l && l.id === target.id && l.revision >= (target.config_revision ?? 0)) return l
    return { id: target.id, revision: target.config_revision ?? 0, nodes: target.nodes ?? [] }
  }

  const apply = (target, next) => {
    const run = async () => {
      const b = base(target)
      const node_ids = next(b.nodes)
      try {
        const res = await putNodes(b.id, { node_ids, expected_revision: b.revision })
        latest.current = { id: b.id, revision: res.config_revision, nodes: node_ids }
      } catch (e) {
        latest.current = null // fall back to the refetched agent
        throw e
      } finally {
        onSettled()
      }
    }
    const p = queue.current.then(run, run)
    queue.current = p.catch(() => {})
    return p
  }

  return {
    add:    (ids) => apply(agent, cur => [...new Set([...cur, ...ids])]),
    remove: (id)  => apply(agent, cur => cur.filter(x => x !== id)),
    clear:  ()    => apply(agent, () => []),
  }
}

export function nodeSetErrorMessage(err) {
  if (err?.status === 409) return 'The agent was changed elsewhere — reloaded, please try again.'
  if (err?.status === 422 && err.detail?.node_ids)
    return `Unknown node${err.detail.node_ids.length !== 1 ? 's' : ''}: ${err.detail.node_ids.map(id => `#${id}`).join(', ')}`
  return err?.message ?? 'Failed to update nodes'
}
