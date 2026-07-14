import { useState, useRef, useCallback } from 'react'
import { apiFetch } from '../api/client'

export function useBulkSelect({ endpoint, params, total, rowKey = 'id' }) {
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [selectingAll, setSelectingAll] = useState(false)
  const [selectAllProgress, setSelectAllProgress] = useState(null)
  const cancelSelectAll = useRef(false)

  const toggleId = useCallback((row) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      const key = row[rowKey]
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [rowKey])

  const toggleAll = useCallback((rows) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      const allSelected = rows.every(r => next.has(r[rowKey]))
      rows.forEach(r => allSelected ? next.delete(r[rowKey]) : next.add(r[rowKey]))
      return next
    })
  }, [rowKey])

  const clearSelection = () => setSelectedIds(new Set())

  const toggleBulkMode = () => {
    if (bulkMode) { setBulkMode(false); clearSelection() }
    else setBulkMode(true)
  }

  const handleSelectAllMatching = async () => {
    if (!total) return
    cancelSelectAll.current = false
    setSelectingAll(true)
    setSelectAllProgress({ fetched: 0, total })

    const PAGE = 100
    let offset = 0
    const allIds = new Set()

    while (offset < total) {
      if (cancelSelectAll.current) break
      try {
        const qs = new URLSearchParams()
        Object.entries({ ...params, limit: PAGE, offset }).forEach(([k, v]) => {
          if (v !== '' && v !== undefined && v !== null) qs.append(k, v)
        })
        const data = await apiFetch(`${endpoint}?${qs}`)
        ;(data.items ?? []).forEach(item => allIds.add(item[rowKey]))
        offset += PAGE
        setSelectAllProgress({ fetched: Math.min(offset, total), total })
      } catch { break }
    }

    if (!cancelSelectAll.current) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        allIds.forEach(id => next.add(id))
        return next
      })
    }
    setSelectingAll(false)
    setSelectAllProgress(null)
  }

  const allVisibleSelected = (rows) =>
    rows.length > 0 && rows.every(r => selectedIds.has(r[rowKey]))

  return {
    bulkMode,
    toggleBulkMode,
    selectedIds,
    toggleId,
    toggleAll,
    clearSelection,
    selectingAll,
    selectAllProgress,
    cancelSelectAll,
    handleSelectAllMatching,
    allVisibleSelected,
  }
}
