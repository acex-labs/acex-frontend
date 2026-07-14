import { useSearchParams } from 'react-router-dom'
import { useCallback, useMemo, useRef } from 'react'

export function useQueryParams(defaults) {
  const defaultsRef = useRef(defaults)
  const [searchParams, setSearchParams] = useSearchParams()

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
        if (v === undefined || v === null || v === '' || v === defaultsRef.current[k]) {
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
