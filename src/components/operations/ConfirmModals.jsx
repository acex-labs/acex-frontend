import { useState } from 'react'

function Modal({ title, children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div className="w-full max-w-lg bg-surface border border-edge rounded-xl p-6 flex flex-col gap-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-semibold text-content">{title}</div>
        {children}
      </div>
    </div>
  )
}

// Raw commands go to the devices as they are: the user sees what will run where, and types the phrase to go on.
// The phrase is "execute on N" unless the caller names its own, e.g. a workflow's.
export function ExecuteConfirmModal({ commands, hostnames, onConfirm, onClose, phrase = `execute on ${hostnames.length}`, title }) {
  const [typed, setTyped] = useState('')
  const counts = `${commands.length} command${commands.length === 1 ? '' : 's'} on ${hostnames.length} node${hostnames.length === 1 ? '' : 's'}`
  return (
    <Modal title={title ?? `Run ${counts}`} onClose={onClose}>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-subtle mb-1">Commands, in order</div>
        <pre className="max-h-40 overflow-auto px-3 py-2 text-xs font-mono bg-surface-hi border border-edge rounded text-content">{commands.join('\n')}</pre>
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-subtle mb-1">Nodes</div>
        <div className="max-h-32 overflow-auto text-xs text-content">{hostnames.join(', ')}</div>
      </div>
      <label className="text-[11px] text-subtle">
        The commands run as written, on every node. Type <span className="font-mono text-content">{phrase}</span> to go on.
        <input
          autoFocus
          value={typed}
          onChange={e => setTyped(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && typed === phrase && onConfirm()}
          className="mt-1.5 w-full px-3 py-2 text-xs font-mono bg-surface-hi border border-edge rounded-md text-content focus:outline-none focus:border-brand/50"
        />
      </label>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 text-xs rounded border border-edge text-subtle hover:text-content">Cancel</button>
        <button
          onClick={onConfirm}
          disabled={typed !== phrase}
          className="px-3 py-1.5 text-xs font-semibold rounded bg-red-500/15 border border-red-500/40 text-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Execute
        </button>
      </div>
    </Modal>
  )
}

export function ConfirmModal({ title, children, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="text-xs text-subtle">{children}</div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 text-xs rounded border border-edge text-subtle hover:text-content">No</button>
        <button autoFocus onClick={onConfirm} className="px-3 py-1.5 text-xs font-semibold rounded bg-brand text-white hover:bg-brand/90">Yes</button>
      </div>
    </Modal>
  )
}
