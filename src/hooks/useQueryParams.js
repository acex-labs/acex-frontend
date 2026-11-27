import { useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef } from 'react'

// `fold` names the params a page used to filter on, one for each field, before it had one search box. An address
// that still carries one (a bookmark, a shared link) has its text moved into `q`, which looks in all those fields,
// so the link keeps finding what it did instead of showing everything with no filter in sight.
export function useQueryParams(defaults, { fold = [] } = {}) {
  const defaultsRef = useRef(defaults)
  const foldRef = useRef(fold)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const old = foldRef.current.filter(key => searchParams.get(key))
    if (old.length === 0) return
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      const text = next.get('q') || next.get(old[0])
      old.forEach(key => next.delete(key))
      next.set('q', text)
      return next
    }, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- once, for the address the page was opened with

  const params = useMemo(() => {
    const result = { ...defaultsRef.current }
    for (const key of Object.keys(defaultsRef.current)) {
      const raw = searchParams.get(key)
      if (raw !== null) {
        result[key] = typeof defaultsRef.current[key] === 'number' ? Number(raw) : raw
      }
    }
    return result
  }, [searchParams])

  const setParams = useCallback((updates) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined || v === null || v === '') {
          next.delete(k)
        } else {
          next.set(k, String(v))
        }
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  return [params, setParams]
}
