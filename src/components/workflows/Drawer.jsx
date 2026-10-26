import { useEffect } from 'react'
import { X } from 'lucide-react'

// A panel from the right over the page, closed with Escape or its cross. With a backdrop a click beside it
// closes it too; without, what is beside it stays usable (the builder's canvas).
export default function Drawer({ title, badge, onClose, backdrop = true, children }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      {backdrop && <div className="absolute inset-0 z-20 bg-black/20" onClick={onClose} />}
      <aside className="absolute inset-y-0 right-0 z-30 w-full max-w-xl bg-surface border-l border-edge shadow-2xl overflow-auto">
        <div className="sticky top-0 z-10 bg-surface px-4 py-3 border-b border-edge flex items-center gap-2">
          <h2 className="text-sm font-semibold text-content truncate">{title}</h2>
          {badge}
          <button onClick={onClose} className="ml-auto text-subtle hover:text-content"><X size={14} /></button>
        </div>
        <div className="p-4 space-y-4">{children}</div>
      </aside>
    </>
  )
}
