import { useQuery } from '@tanstack/react-query'
import { fetchObservedHistory } from '../api/config'

// The latest observed configuration of a node, without its content: created_at is when it last changed,
// last_collected_at when the node was last polled and still had it.
export function useConfigSync(nodeId) {
  return useQuery({
    queryKey: ['config-observed-latest', nodeId],
    queryFn: () => fetchObservedHistory(nodeId, 1).then(rows => rows[0] ?? null),
    refetchInterval: 60_000,
  })
}
