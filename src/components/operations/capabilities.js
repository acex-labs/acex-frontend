import { useQuery } from '@tanstack/react-query'
import { fetchNeds } from '../../api/operations'

// Whether a node's NED can run an operation: capability is ['operations', 'execute'] or ['actions', 'ping'].
export function useSupports(capability) {
  const { data: neds = [] } = useQuery({ queryKey: ['neds'], queryFn: fetchNeds, staleTime: 300_000 })
  const [kind, name] = capability
  const supported = new Set(neds.filter(n => n.capabilities?.[kind]?.includes(name)).map(n => n.name))
  return node => supported.has(node.ned_id)
}
