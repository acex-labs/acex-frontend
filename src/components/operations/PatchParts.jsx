import { changeCounts } from './runs'

const OPS = {
  add: { sign: '+', className: 'text-green-400' },
  change: { sign: '~', className: 'text-amber-400' },
  remove: { sign: '−', className: 'text-red-400' },
}

// A patch as it is sent to the device, in the device's own syntax.
export function PatchText({ patch }) {
  return (
    <pre className="px-3 py-2 text-[11px] font-mono whitespace-pre-wrap break-all bg-surface-hi text-content">{patch || ' '}</pre>
  )
}

// The components a patch adds, changes and removes, with the attributes that change.
export function PatchChanges({ changes }) {
  return (
    <div className="px-3 py-2 space-y-0.5 text-[11px] font-mono">
      {changes.map((c, i) => (
        <div key={i} className={OPS[c.op]?.className ?? 'text-content'}>
          {OPS[c.op]?.sign ?? '?'} {c.path}
          {c.attributes?.length > 0 && <span className="text-subtle"> ({c.attributes.join(', ')})</span>}
        </div>
      ))}
    </div>
  )
}

// How many components a patch adds, changes and removes, in short; removals stand out.
export function ChangeCounts({ changes }) {
  const counts = changeCounts(changes)
  return (
    <span className="text-[11px] font-mono tabular-nums">
      {Object.entries(counts).filter(([, n]) => n > 0).map(([op, n]) => (
        <span key={op} className={`${OPS[op].className} mr-2`}>{OPS[op].sign}{n}</span>
      ))}
    </span>
  )
}

// What differs that the node's driver has no syntax for, so the patch leaves it out.
export function Unrendered({ changes }) {
  return (
    <div className="border-t border-edge">
      <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-widest text-subtle">Its driver can't write</div>
      <div className="px-3 py-2 space-y-0.5 text-[11px] font-mono text-subtle">
        {changes.map((c, i) => <div key={i}>{OPS[c.op]?.sign ?? '?'} {c.path}</div>)}
      </div>
    </div>
  )
}
