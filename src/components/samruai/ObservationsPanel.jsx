import { ArrowLeft, Eye, Network, Plus, ThumbsDown, ThumbsUp, Trash2, X } from 'lucide-react'
import { STATUSES, observationTitle } from './hypotree'
import NodeChips, { NodeToggle } from './NodeChips'

const LABEL = 'text-[10px] font-semibold uppercase tracking-widest text-subtle'
const INPUT = 'w-full px-2.5 py-1.5 text-xs bg-surface-hi border border-edge rounded-md text-content placeholder:text-subtle focus:outline-none focus:border-brand/50'

// "2026-11-13T08:30" for a datetime-local input, in local time, from an ISO time; and back.
const toLocalInput = iso => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
const fromLocalInput = value => (value ? new Date(value).toISOString() : null)

// How many hypotheses an observation supports and contradicts.
function LinkCounts({ links }) {
  const supports = links.filter(l => l.effect === 'supports').length
  const contradicts = links.length - supports
  if (!links.length) return <span className="text-subtle">Not used yet</span>
  return (
    <span className="flex items-center gap-2">
      {supports > 0 && <span className="flex items-center gap-0.5 text-green-400"><ThumbsUp size={10} /> {supports}</span>}
      {contradicts > 0 && <span className="flex items-center gap-0.5 text-red-400"><ThumbsDown size={10} /> {contradicts}</span>}
    </span>
  )
}

function List({ observations, onSelect, onAdd }) {
  if (!observations.length) {
    return (
      <div className="p-4 space-y-3 text-center">
        <p className="text-[11px] text-subtle">What has been seen: symptoms, log lines, alarms, what users report. Use them as evidence for or against hypotheses.</p>
        <button onClick={onAdd} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border border-edge text-subtle hover:text-content"><Plus size={12} /> Add observation</button>
      </div>
    )
  }
  return (
    <ul className="divide-y divide-edge">
      {observations.map(o => (
        <li key={o.id}>
          <button onClick={() => onSelect(o.id)} className="w-full text-left px-3 py-2 space-y-0.5 hover:bg-surface-hi">
            <div className={`text-xs truncate ${o.title.trim() ? 'text-content font-semibold' : 'text-subtle'}`}>{observationTitle(o)}</div>
            <div className="flex items-center gap-2 text-[10px] text-subtle">
              {o.source && <span className="truncate">{o.source}</span>}
              {(o.node_ids?.length ?? 0) > 0 && (
                <span className="shrink-0 flex items-center gap-0.5" title="Observed on these ACEX nodes"><Network size={10} /> {o.node_ids.length}</span>
              )}
              <span className="shrink-0">{new Date(o.observed_at ?? o.created_at).toLocaleString()}</span>
              <span className="ml-auto shrink-0"><LinkCounts links={o.links} /></span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}

// One hypothesis, and whether the observation supports or contradicts it. Choosing the chosen effect again unlinks.
function HypothesisRow({ step, effect, onLink, onUnlink, onOpen }) {
  const toggle = e => (effect === e ? onUnlink() : onLink(e))
  const status = STATUSES[step.status] ?? STATUSES.open
  return (
    <li className="flex items-center gap-2 py-1.5">
      <button onClick={onOpen} className="min-w-0 flex-1 text-left" title="Show in the hypotree">
        <div className={`text-xs truncate ${step.title ? 'text-content' : 'text-subtle'} ${step.status === 'not_root_cause' ? 'line-through' : ''}`}>{step.title || 'Untitled hypothesis'}</div>
        {step.status !== 'open' && <div className={`text-[10px] ${status.className.split(' ')[0]}`}>{status.label}</div>}
      </button>
      <button onClick={() => toggle('supports')} title="Supports it"
        className={`p-1.5 rounded border ${effect === 'supports' ? 'border-green-500/60 bg-green-500/10 text-green-400' : 'border-edge text-subtle hover:text-green-400'}`}>
        <ThumbsUp size={12} />
      </button>
      <button onClick={() => toggle('contradicts')} title="Contradicts it"
        className={`p-1.5 rounded border ${effect === 'contradicts' ? 'border-red-500/60 bg-red-500/10 text-red-400' : 'border-edge text-subtle hover:text-red-400'}`}>
        <ThumbsDown size={12} />
      </button>
    </li>
  )
}

function Detail({ observation, hypotheses, triageNodeIds, error, onPatch, onLink, onUnlink, onOpenStep, onDelete }) {
  const effects = new Map(observation.links.map(l => [l.step_id, l.effect]))
  const nodeIds = observation.node_ids ?? []
  const setNodes = ids => onPatch({ node_ids: ids })
  return (
    <div className="p-3 space-y-3">
      <label className="block space-y-1">
        <span className={LABEL}>What was seen</span>
        <input autoFocus={!observation.title} value={observation.title} onChange={e => onPatch({ title: e.target.value })} placeholder="E.g. TCN counter rising on sw-kista-01" className={INPUT} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className={LABEL}>Source</span>
          <input value={observation.source} onChange={e => onPatch({ source: e.target.value })} placeholder="Device, log, person" className={INPUT} />
        </label>
        <label className="block space-y-1">
          <span className={LABEL}>Seen at</span>
          <input type="datetime-local" value={toLocalInput(observation.observed_at)} onChange={e => onPatch({ observed_at: fromLocalInput(e.target.value) })} className={INPUT} />
        </label>
      </div>
      <label className="block space-y-1">
        <span className={LABEL}>Notes</span>
        <textarea rows={4} value={observation.body} onChange={e => onPatch({ body: e.target.value })} placeholder="Output, numbers, how it was seen." className={`${INPUT} resize-y`} />
      </label>
      <div className="space-y-1">
        <span className={LABEL}>Observed on</span>
        {triageNodeIds.length === 0 ? (
          <p className="text-[11px] text-subtle">Add affected nodes to the triage first, then mark where this was seen.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-1">
              <NodeChips ids={nodeIds} onRemove={id => setNodes(nodeIds.filter(i => i !== id))} />
              {nodeIds.length === 0 && <span className="text-[11px] text-subtle">Not tied to a node.</span>}
            </div>
            <NodeToggle availableIds={triageNodeIds} selectedIds={nodeIds} onToggle={id => setNodes([...nodeIds, id])} />
          </>
        )}
      </div>
      <div className="text-[10px] text-subtle">Written down {new Date(observation.created_at).toLocaleString()}{observation.created_by && ` by ${observation.created_by}`}</div>
      {error && <p className="text-[11px] text-red-400">Not saved: {error}</p>}

      <div className="pt-3 border-t border-edge space-y-1">
        <div className={LABEL}>Evidence for hypotheses</div>
        {hypotheses.length === 0 ? (
          <p className="text-[11px] text-subtle">No hypotheses yet. Add one to the hypotree to use this observation for or against it.</p>
        ) : (
          <>
            <p className="text-[11px] text-subtle">Mark which hypotheses it supports or contradicts; one observation can bear on several.</p>
            <ul className="divide-y divide-edge">
              {hypotheses.map(h => (
                <HypothesisRow key={h.id} step={h} effect={effects.get(h.id)} onLink={e => onLink(h.id, e)} onUnlink={() => onUnlink(h.id)} onOpen={() => onOpenStep(h.id)} />
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="pt-3 border-t border-edge">
        <button onClick={onDelete} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border border-red-500/40 text-red-400 hover:bg-red-500/10">
          <Trash2 size={12} /> Remove observation
        </button>
      </div>
    </div>
  )
}

// The triage's observations, from the right beside the hypotree: the list, or one of them to fill in and use as
// evidence.
export default function ObservationsPanel({ observations, hypotheses, selected, triageNodeIds = [], errors, onSelect, onAdd, onClose, onPatch, onLink, onUnlink, onOpenStep, onDelete }) {
  const observation = selected != null && observations.find(o => o.id === selected)
  return (
    <aside className="w-80 shrink-0 flex flex-col border-l border-edge bg-surface overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-edge">
        {observation
          ? <button onClick={() => onSelect(null)} className="text-subtle hover:text-content" title="All observations"><ArrowLeft size={14} /></button>
          : <Eye size={13} className="text-brand" />}
        <h2 className="text-xs font-semibold text-content truncate">{observation ? observationTitle(observation) : `Observations (${observations.length})`}</h2>
        {!observation && <button onClick={onAdd} className="ml-auto text-subtle hover:text-brand" title="Add observation"><Plus size={14} /></button>}
        <button onClick={onClose} className={`${observation ? 'ml-auto' : ''} text-subtle hover:text-content`} title="Close"><X size={14} /></button>
      </div>
      <div className="flex-1 overflow-auto">
        {observation ? (
          <Detail
            key={observation.id}
            observation={observation}
            hypotheses={hypotheses}
            triageNodeIds={triageNodeIds}
            error={errors[`obs:${observation.id}`]}
            onPatch={p => onPatch(observation.id, p)}
            onLink={(stepId, effect) => onLink(observation.id, stepId, effect)}
            onUnlink={stepId => onUnlink(observation.id, stepId)}
            onOpenStep={onOpenStep}
            onDelete={() => onDelete(observation.id)}
          />
        ) : (
          <List observations={observations} onSelect={onSelect} onAdd={onAdd} />
        )}
      </div>
    </aside>
  )
}
