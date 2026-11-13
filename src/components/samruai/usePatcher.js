import { useEffect, useRef, useState } from 'react'

// Changes typed into a form, sent a moment after typing stops (and when the page is left). Changes to the same
// record are merged; one that the backend refuses stays pending, with its error, and goes again with the next
// change, so the form can be put right. `apply(id, fields)` shows changes before they are saved, `send(id, patch)`
// saves them and returns the record as saved.
export default function usePatcher({ send, apply }) {
  const pending = useRef(new Map())
  const timers = useRef(new Map())
  const [busy, setBusy] = useState(0)
  const [waiting, setWaiting] = useState(0)
  const counted = () => setWaiting(pending.current.size)
  const [errors, setErrors] = useState({})
  const fns = useRef({ send, apply })
  fns.current = { send, apply }

  const flush = async id => {
    clearTimeout(timers.current.get(id))
    const patch = pending.current.get(id)
    if (!patch) return
    pending.current.delete(id)
    counted()
    setBusy(b => b + 1)
    try {
      const saved = await fns.current.send(id, patch)
      // What was typed while this was on its way stays as typed.
      fns.current.apply(id, { ...saved, ...pending.current.get(id) })
      setErrors(({ [id]: _, ...rest }) => rest)
    } catch (err) {
      pending.current.set(id, { ...patch, ...pending.current.get(id) })
      counted()
      setErrors(e => ({ ...e, [id]: err.detail ?? err.message }))
    } finally {
      setBusy(b => b - 1)
    }
  }
  const flushRef = useRef(flush)
  flushRef.current = flush

  const patch = (id, changes) => {
    pending.current.set(id, { ...pending.current.get(id), ...changes })
    counted()
    fns.current.apply(id, changes)
    clearTimeout(timers.current.get(id))
    timers.current.set(id, setTimeout(() => flushRef.current(id), 500))
  }

  useEffect(() => () => { [...pending.current.keys()].forEach(id => flushRef.current(id)) }, [])

  const unsaved = Object.keys(errors).length > 0
  return { patch, flush: id => flushRef.current(id), errors, state: unsaved ? 'error' : busy + waiting > 0 ? 'saving' : 'saved' }
}
