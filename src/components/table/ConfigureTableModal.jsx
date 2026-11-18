import { useEffect, useState } from 'react'
import { ArrowRight, ArrowLeft, ArrowUp, ArrowDown, X } from 'lucide-react'

const BUTTON = 'flex items-center justify-center gap-1.5 px-3 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors disabled:opacity-40 disabled:hover:text-subtle'

function toggled(set, key) {
  const next = new Set(set)
  next.has(key) ? next.delete(key) : next.add(key)
  return next
}

// One step up (or down) for each picked item, keeping their order and never past another picked item.
function moved(keys, picked, direction) {
  const next = [...keys]
  const order = direction < 0 ? next.map((_, i) => i) : next.map((_, i) => next.length - 1 - i)
  for (const i of order) {
    const j = i + direction
    if (picked.has(next[i]) && j >= 0 && j < next.length && !picked.has(next[j])) {
      ;[next[i], next[j]] = [next[j], next[i]]
    }
  }
  return next
}

function Column({ title, columns, picked, onPick, onOpen }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle mb-1.5">{title}</span>
      <ul
        role="listbox"
        aria-label={title}
        aria-multiselectable="true"
        className="h-72 overflow-auto border border-edge rounded bg-surface-hi py-1"
      >
        {columns.map(column => (
          <li key={column.key}>
            <button
              type="button"
              role="option"
              aria-selected={picked.has(column.key)}
              onClick={() => onPick(column.key)}
              onDoubleClick={() => onOpen(column.key)}
              className={[
                'w-full text-left px-3 py-1.5 text-xs transition-colors',
                picked.has(column.key) ? 'bg-brand/10 text-brand' : 'text-content hover:bg-surface',
              ].join(' ')}
            >
              {column.label}
            </button>
          </li>
        ))}
        {columns.length === 0 && <li className="px-3 py-1.5 text-xs text-subtle">None</li>}
      </ul>
    </div>
  )
}

// Choose which columns a table shows and in which order: pick on the left and add them, pick on the right and remove
// or move them. Nothing changes in the table until Apply.
export default function ConfigureTableModal({ allColumns, selectedKeys, defaultKeys, onApply, onClose }) {
  const [selected, setSelected] = useState(selectedKeys)
  const [pickedAvailable, setPickedAvailable] = useState(new Set())
  const [pickedSelected, setPickedSelected] = useState(new Set())

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const label = (key) => allColumns.find(column => column.key === key)
  const available = allColumns.filter(column => !selected.includes(column.key))
  const chosen = selected.map(label).filter(Boolean)

  const add = (keys) => {
    setSelected(prev => [...prev, ...keys])
    setPickedAvailable(new Set())
  }
  const remove = (keys) => {
    setSelected(prev => prev.filter(key => !keys.has(key)))
    setPickedSelected(new Set())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Configure Table"
        className="bg-canvas border border-edge rounded-xl w-[640px] max-w-[95vw] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge">
          <h3 className="text-sm font-semibold text-content">Configure Table</h3>
          <button onClick={onClose} className="p-1 rounded text-subtle hover:text-content hover:bg-surface-hi transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4 grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
          <Column
            title="Available columns"
            columns={available}
            picked={pickedAvailable}
            onPick={key => setPickedAvailable(prev => toggled(prev, key))}
            onOpen={key => add([key])}
          />

          <div className="flex flex-col gap-2 self-center pt-5">
            <button
              type="button"
              className={BUTTON}
              disabled={pickedAvailable.size === 0}
              onClick={() => add(available.filter(c => pickedAvailable.has(c.key)).map(c => c.key))}
            >
              Add <ArrowRight size={12} />
            </button>
            <button
              type="button"
              className={BUTTON}
              disabled={pickedSelected.size === 0}
              onClick={() => remove(pickedSelected)}
            >
              <ArrowLeft size={12} /> Remove
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <Column
              title="Selected columns"
              columns={chosen}
              picked={pickedSelected}
              onPick={key => setPickedSelected(prev => toggled(prev, key))}
              onOpen={key => remove(new Set([key]))}
            />
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                className={BUTTON}
                disabled={pickedSelected.size === 0}
                onClick={() => setSelected(prev => moved(prev, pickedSelected, -1))}
              >
                <ArrowUp size={12} /> Move up
              </button>
              <button
                type="button"
                className={BUTTON}
                disabled={pickedSelected.size === 0}
                onClick={() => setSelected(prev => moved(prev, pickedSelected, 1))}
              >
                <ArrowDown size={12} /> Move down
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-edge">
          <button
            type="button"
            onClick={() => { setSelected(defaultKeys); setPickedAvailable(new Set()); setPickedSelected(new Set()) }}
            className="px-3 py-1 rounded text-xs border border-red-500/30 text-red-400/80 hover:text-red-400 hover:border-red-500/50 transition-colors"
          >
            Reset
          </button>
          <div className="flex items-center gap-2">
            {selected.length === 0 && <span className="text-[11px] text-subtle">Select at least one column</span>}
            <button type="button" onClick={onClose} className={BUTTON}>Cancel</button>
            <button
              type="button"
              disabled={selected.length === 0}
              onClick={() => onApply(selected)}
              className="px-3 py-1 rounded text-xs font-semibold bg-brand text-white hover:bg-brand/90 transition-colors disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
