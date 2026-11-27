import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchTopologyPositions, resetTopologyPositions, saveTopologyPositions } from '../api/topology'
import { SavedLayout } from '../components/topology/SavedLayout'

const KEY = ['topology-positions']

// The shared topology layout: what people saved, and how to save or reset it. Saving waits for the new layout.
export function useTopologyLayout() {
  const queryClient = useQueryClient()
  const { data } = useQuery({ queryKey: KEY, queryFn: () => fetchTopologyPositions(), staleTime: 30_000 })
  const saved = useMemo(() => new SavedLayout(data ?? []), [data])
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY })

  const save = useMutation({ mutationFn: saveTopologyPositions, onSuccess: refresh })
  // layouts: [{ container, item }] of the items shown; see SavedLayout.resets.
  const reset = useMutation({
    mutationFn: layouts => Promise.all(SavedLayout.resets(layouts).map(resetTopologyPositions)),
    onSuccess: refresh,
  })

  return { saved, save: save.mutateAsync, reset: reset.mutateAsync }
}
