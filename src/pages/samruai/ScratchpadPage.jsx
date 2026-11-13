import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Handle, MarkerType, Position, ReactFlowProvider, useReactFlow } from '@xyflow/react'
import {
  ArrowLeft, CircleCheck, CircleX, Eye, Gavel, GitFork, Handshake, Lightbulb, Network, Plus, RotateCcw, Stethoscope,
  ThumbsDown, ThumbsUp, Trash2, UserRound, Wrench,
} from 'lucide-react'
import {
  createObservation, createStep, deleteObservation, deleteStep, deleteTriage, fetchObservations, fetchSteps, fetchTriage,
  linkObservation, unlinkObservation, updateObservation, updateStep, updateTriage,
} from '../../api/samruai'
import { useAuth } from '../../auth/AuthContext'
import { ConfirmModal } from '../../components/operations/ConfirmModals'
import Assessment, { PriorityBadge } from '../../components/samruai/Assessment'
import { KINDS, ROOT, STATUSES, analyse, layout, observationTitle, participants } from '../../components/samruai/hypotree'
import ObservationsPanel from '../../components/samruai/ObservationsPanel'
import NodeChips from '../../components/samruai/NodeChips'
import ParticipantsBar from '../../components/samruai/ParticipantsBar'
import { TRIAGES_KEY, TRIAGE_STATUSES, triageKey, triageTitle } from '../../components/samruai/triage'
import usePatcher from '../../components/samruai/usePatcher'
import Drawer from '../../components/workflows/Drawer'
import NodePicker from '../../components/operations/NodePicker'
import WorkflowCanvas from '../../components/workflows/WorkflowCanvas'

const LABEL = 'text-[10px] font-semibold uppercase tracking-widest text-subtle'
const INPUT = 'w-full px-3 py-2 text-xs bg-surface-hi border border-edge rounded-md text-content placeholder:text-subtle focus:outline-none focus:border-brand/50'
const QUIET = 'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border border-edge text-subtle hover:text-content disabled:opacity-40 disabled:cursor-not-allowed'
// Edges only need somewhere to attach: nothing is connected by hand.
const HANDLE = { width: 1, height: 1, minWidth: 0, minHeight: 0, opacity: 0, border: 0 }
const stepsKey = id => ['samruai', 'steps', String(id)]
const observationsKey = id => ['samruai', 'observations', String(id)]
// Ring around a hypothesis the open observation bears on.
const HIGHLIGHT = { supports: 'ring-2 ring-green-500/70', contradicts: 'ring-2 ring-red-500/70' }

// Who owns a node: its own assignee, or the one it inherits from upstream, shown fainter.
function Owner({ own, inherited }) {
  const who = own ?? inherited
  if (!who) return <span className="text-amber-400">Nobody owns this</span>
  return (
    <span className={`flex items-center gap-1 min-w-0 ${own ? 'text-content' : 'text-subtle'}`} title={own ? 'Assignee' : 'Inherited from upstream'}>
      <UserRound size={10} className="shrink-0" /> <span className="truncate">{who}</span>
    </span>
  )
}

// A node's buttons for what comes after it: the next action (one at most), and a hypothesis (any number).
function AddAfter({ data }) {
  const button = 'nodrag w-6 h-6 flex items-center justify-center rounded-full border border-edge bg-surface text-subtle hover:text-brand hover:border-brand/60'
  return (
    <div className="absolute -right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1">
      {data.canAddAction && (
        <button onClick={e => { e.stopPropagation(); data.onAdd('action') }} title="Add the next action" className={button}><Wrench size={11} /></button>
      )}
      <button onClick={e => { e.stopPropagation(); data.onAdd('hypothesis') }} title="Add a hypothesis: a new hypobranch" className={button}>
        <GitFork size={11} className="rotate-90" />
      </button>
    </div>
  )
}

// The triage: its fault description and its lead.
function TriageNode({ data, selected }) {
  const description = data.triage.description.trim()
  return (
    <div className={`relative w-[270px] rounded-lg border bg-surface px-3 py-2 space-y-1 ${description ? 'border-brand/50' : 'border-amber-400/60'} ${selected ? 'outline outline-2 outline-brand/60 outline-offset-2' : ''}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-subtle">
        <Stethoscope size={11} className="text-brand" /> Triage
        <PriorityBadge priority={data.triage.priority} />
        <span className="ml-auto normal-case tracking-normal text-[10px]"><Owner own={data.triage.assignee} /></span>
      </div>
      {description
        ? <div className="text-xs text-content line-clamp-3 whitespace-pre-line">{description}</div>
        : <div className="text-xs text-amber-400">Describe the fault</div>}
      {(data.triage.node_ids?.length ?? 0) > 0 && (
        <div className="flex items-center gap-1 min-w-0" title="Affected ACEX nodes">
          <Network size={10} className="shrink-0 text-subtle" />
          <NodeChips ids={data.triage.node_ids.slice(0, 3)} className="flex-1" />
          {data.triage.node_ids.length > 3 && <span className="shrink-0 text-[10px] text-subtle">+{data.triage.node_ids.length - 3}</span>}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={HANDLE} />
      <AddAfter data={data} />
    </div>
  )
}

function StepNode({ data, selected }) {
  const { step } = data
  const kind = KINDS[step.kind] ?? KINDS.action
  const status = STATUSES[step.status] ?? STATUSES.open
  const hypothesis = step.kind === 'hypothesis'
  return (
    <div className={`relative w-[250px] rounded-lg border px-3 py-2 space-y-1 ${hypothesis ? 'bg-brand/5' : 'bg-surface'} ${status.className.split(' ')[1]} ${data.ruledOut ? 'opacity-45' : ''} ${selected ? 'outline outline-2 outline-brand/60 outline-offset-2' : ''} ${HIGHLIGHT[data.highlight] ?? ''}`}>
      <Handle type="target" position={Position.Left} style={HANDLE} />
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-subtle">
        <kind.icon size={11} className="text-brand" /> {kind.label}
        {hypothesis && <span className="normal-case tracking-normal text-brand/80">· hypobranch</span>}
        {step.status !== 'open' && <span className={`ml-auto normal-case tracking-normal ${status.className.split(' ')[0]}`}>{status.label}</span>}
      </div>
      <div className={`text-xs font-semibold text-content line-clamp-2 ${step.status === 'not_root_cause' ? 'line-through' : ''}`}>
        {step.title || <span className="font-normal text-subtle">{kind.placeholder}</span>}
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <Owner own={step.assignee} inherited={data.inherited} />
        {data.evidence && (data.evidence.supports.length > 0 || data.evidence.contradicts.length > 0) && (
          <span className="shrink-0 flex items-center gap-1.5" title="Observations for and against it">
            {data.evidence.supports.length > 0 && <span className="flex items-center gap-0.5 text-green-400"><ThumbsUp size={10} /> {data.evidence.supports.length}</span>}
            {data.evidence.contradicts.length > 0 && <span className="flex items-center gap-0.5 text-red-400"><ThumbsDown size={10} /> {data.evidence.contradicts.length}</span>}
          </span>
        )}
        {step.external_party && (
          <span className="ml-auto flex items-center gap-1 min-w-0 text-subtle" title={`With ${step.external_party}${step.external_ref ? `, case ${step.external_ref}` : ''}`}>
            <Handshake size={10} className="shrink-0" /> <span className="truncate">{step.external_party}</span>
          </span>
        )}
      </div>
      {data.validates && (
        <button onClick={e => { e.stopPropagation(); data.onValidate() }}
          className="nodrag flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border border-brand/50 text-brand hover:bg-brand/10"
          title={`End of the hypobranch: validate "${data.validates.title || 'the hypothesis'}"`}>
          <Gavel size={10} /> Validate
        </button>
      )}
      <Handle type="source" position={Position.Right} style={HANDLE} />
      <AddAfter data={data} />
    </div>
  )
}

// Where a validated hypobranch ends: root cause or not.
function VerdictNode({ data }) {
  const root = data.status === 'root_cause'
  return (
    <div className={`w-[150px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-full border text-xs font-semibold ${root ? 'border-green-500/60 bg-green-500/10 text-green-400' : 'border-red-500/50 bg-red-500/5 text-red-400 opacity-60'}`}
      title={data.validatedBy ? `Validated by ${data.validatedBy}` : undefined}>
      <Handle type="target" position={Position.Left} style={HANDLE} />
      {root ? <CircleCheck size={12} /> : <CircleX size={12} />} {root ? 'Root cause' : 'Not root cause'}
    </div>
  )
}

const NODE_TYPES = { triage: TriageNode, step: StepNode, verdict: VerdictNode }

// A name typed or picked from the people already in the triage, or the signed-in user.
function PersonField({ label, value, placeholder, people, me, error, hint, onChange }) {
  return (
    <label className="block space-y-1">
      <span className={LABEL}>{label}</span>
      <div className="flex gap-2">
        <input list="triage-people" value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={`${INPUT} ${error ? 'border-red-500/60' : ''}`} />
        {me && value !== me && <button type="button" onClick={() => onChange(me)} className={`${QUIET} shrink-0`}>Me</button>}
      </div>
      <datalist id="triage-people">{people.map(p => <option key={p} value={p} />)}</datalist>
      {error ? <span className="block text-[11px] text-red-400">{error}</span> : hint && <span className="block text-[11px] text-subtle">{hint}</span>}
    </label>
  )
}

// What can come after a node: the next action, if it has none yet, and a hypothesis.
function AddButtons({ canAddAction, onAdd }) {
  return (
    <>
      <button onClick={() => onAdd('action')} disabled={!canAddAction} className={QUIET}
        title={canAddAction ? undefined : 'There is an action after this already; add a hypothesis to open another thread'}>
        <Wrench size={12} /> Add the next action
      </button>
      <button onClick={() => onAdd('hypothesis')} className={QUIET}><Lightbulb size={12} /> Add a hypothesis</button>
    </>
  )
}

function TriagePanel({ triage, tree, me, error, onPatch, onAdd, onPickNodes }) {
  return (
    <>
      <label className="block space-y-1">
        <span className={LABEL}>Description</span>
        <textarea
          autoFocus={!triage.description}
          rows={7}
          value={triage.description}
          onChange={e => onPatch({ description: e.target.value })}
          placeholder="What is wrong, where, and since when? E.g. users at the Kista office lose connectivity a few times an hour since 08:00."
          className={`${INPUT} resize-y`}
        />
      </label>
      <PersonField
        label="Lead"
        value={triage.assignee}
        placeholder="Who leads this triage?"
        people={tree.people}
        me={me}
        hint="Owns every node that has no assignee of its own."
        onChange={assignee => onPatch({ assignee })}
      />
      <label className="block space-y-1">
        <span className={LABEL}>What is affected</span>
        <textarea rows={3} value={triage.impact_description ?? ''} onChange={e => onPatch({ impact_description: e.target.value })}
          placeholder="Sites, services, customers, users." className={`${INPUT} resize-y`} />
      </label>
      <div className="space-y-1">
        <span className={LABEL}>Affected nodes</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <NodeChips ids={triage.node_ids ?? []} onRemove={id => onPatch({ node_ids: (triage.node_ids ?? []).filter(i => i !== id) })} />
          <button type="button" onClick={onPickNodes} className={QUIET}><Network size={12} /> Add nodes</button>
        </div>
        <p className="text-[11px] text-subtle">Devices from the ACEX network module that the fault is on.</p>
      </div>
      <Assessment impact={triage.impact} urgency={triage.urgency} onChange={onPatch} />
      {error && <p className="text-[11px] text-red-400">Not saved: {error}</p>}
      <div className="pt-4 border-t border-edge flex flex-wrap gap-2">
        <AddButtons canAddAction={tree.actionAfter(ROOT) == null} onAdd={onAdd} />
      </div>
    </>
  )
}

// The observations used for and against a hypothesis; each opens in the observations panel.
function Evidence({ evidence, onOpen, onBrowse }) {
  const rows = [...evidence.supports.map(o => [o, 'supports']), ...evidence.contradicts.map(o => [o, 'contradicts'])]
  return (
    <div className="space-y-1">
      <div className={LABEL}>Evidence</div>
      {rows.length === 0
        ? <p className="text-[11px] text-subtle">No observations for or against it yet.</p>
        : (
          <ul className="space-y-1">
            {rows.map(([o, effect]) => (
              <li key={o.id}>
                <button onClick={() => onOpen(o.id)} className="w-full flex items-center gap-2 text-left px-2 py-1 rounded hover:bg-surface-hi">
                  {effect === 'supports' ? <ThumbsUp size={11} className="shrink-0 text-green-400" /> : <ThumbsDown size={11} className="shrink-0 text-red-400" />}
                  <span className="text-xs text-content truncate">{observationTitle(o)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      <button onClick={onBrowse} className="text-[11px] text-brand hover:underline">Use an observation…</button>
    </div>
  )
}

// At the end of a hypobranch: whether its hypothesis is the root cause. Choosing the given verdict again reopens it.
function Validate({ hypothesis, evidence, onValidate }) {
  const verdict = hypothesis.status === 'open' ? null : hypothesis.status
  const choice = (status, Icon, label, active) => (
    <button onClick={() => onValidate(verdict === status ? 'open' : status)}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded border ${verdict === status ? active : 'border-edge text-subtle hover:text-content'}`}>
      <Icon size={13} /> {label}
    </button>
  )
  return (
    <div className="space-y-2 p-3 rounded-md border border-brand/40 bg-brand/5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-content"><Gavel size={13} className="text-brand" /> Validate the hypobranch</div>
      <p className="text-[11px] text-subtle">
        This is where <span className="text-content">{hypothesis.title || 'the hypothesis'}</span> is worked through to.
        {' '}Evidence: {evidence.supports.length} for, {evidence.contradicts.length} against.
      </p>
      <div className="flex gap-2">
        {choice('root_cause', CircleCheck, 'Root cause', 'border-green-500/60 bg-green-500/10 text-green-400')}
        {choice('not_root_cause', CircleX, 'Not root cause', 'border-red-500/60 bg-red-500/10 text-red-400')}
      </div>
      {verdict && (
        <p className="text-[11px] text-subtle">
          Validated{hypothesis.validated_by && ` by ${hypothesis.validated_by}`}{hypothesis.validated_at && `, ${new Date(hypothesis.validated_at).toLocaleString()}`}. Choose it again to reopen.
        </p>
      )}
    </div>
  )
}

function StepPanel({ step, tree, me, error, onPatch, onAdd, onRemove, onValidate, onOpen, onOpenObservation, onBrowseObservations }) {
  const kind = KINDS[step.kind] ?? KINDS.action
  const inherited = tree.upstreamOwner(step)
  const hasNext = tree.children.get(step.id).length > 0
  const ends = tree.endOf(step.id)
  const branch = step.kind === 'hypothesis' ? null : tree.branchOf(step.id)
  const needsContact = step.external_party && !step.assignee
  // An external party is never the owner: someone in the triage keeps in touch with them, the owner by default.
  const setExternal = external_party => onPatch(external_party && !step.assignee && inherited ? { external_party, assignee: inherited } : { external_party })
  return (
    <>
      <div className="flex items-center gap-1.5 text-xs text-subtle">
        <kind.icon size={13} className="text-brand" /> <span className="font-semibold text-content">{kind.label}</span> · {kind.about}
      </div>
      {branch && (
        <p className="text-[11px] text-subtle">
          In the hypobranch of <button onClick={() => onOpen(branch.id)} className="text-brand hover:underline">{branch.title || 'a hypothesis'}</button>.
        </p>
      )}
      {ends && <Validate hypothesis={ends} evidence={tree.evidence.get(ends.id)} onValidate={status => onValidate(ends.id, status)} />}
      <label className="block space-y-1">
        <span className={LABEL}>Title</span>
        <input autoFocus={!step.title} value={step.title} onChange={e => onPatch({ title: e.target.value })} placeholder={kind.placeholder} className={INPUT} />
      </label>
      <label className="block space-y-1">
        <span className={LABEL}>Notes</span>
        <textarea rows={4} value={step.body} onChange={e => onPatch({ body: e.target.value })}
          placeholder={step.kind === 'hypothesis' ? 'Why it could be the cause, and how to find out.' : 'What was done, what came back, what it means.'}
          className={`${INPUT} resize-y`} />
      </label>
      {step.kind === 'action' && (
        <div className="space-y-1">
          <div className={LABEL}>Status</div>
          <div className="flex gap-1.5">
            {['open', 'done'].map(s => (
              <button key={s} onClick={() => onPatch({ status: s })}
                className={`px-2.5 py-1 text-xs rounded border ${s === step.status ? `${STATUSES[s].className} bg-surface-hi font-semibold` : 'border-edge text-subtle hover:text-content'}`}>
                {STATUSES[s].label}
              </button>
            ))}
          </div>
        </div>
      )}
      {step.kind === 'hypothesis' && !ends && (
        <p className="text-[11px] text-subtle">
          {step.status === 'open' ? 'Validated at the end of its hypobranch, after its last action.' : `${STATUSES[step.status].label}, validated at the end of its hypobranch.`}
        </p>
      )}
      {step.kind === 'hypothesis' && <Evidence evidence={tree.evidence.get(step.id)} onOpen={onOpenObservation} onBrowse={onBrowseObservations} />}
      <PersonField
        label="Assignee"
        value={step.assignee}
        placeholder={inherited ? `${inherited} (inherited)` : 'Nobody upstream owns it'}
        people={tree.people}
        me={me}
        error={needsContact && `Someone in the triage must keep in touch with ${step.external_party}.`}
        hint={step.assignee ? 'Owns this and everything after it that has no assignee of its own.' : 'Empty: owned by whoever owns the node before it.'}
        onChange={assignee => onPatch({ assignee })}
      />
      <div className="space-y-1">
        <div className={LABEL}>External party</div>
        <div className="grid grid-cols-[1fr_9rem] gap-2">
          <input value={step.external_party ?? ''} onChange={e => setExternal(e.target.value)} placeholder="Carrier, vendor TAC, customer…" className={INPUT} />
          <input value={step.external_ref ?? ''} onChange={e => onPatch({ external_ref: e.target.value })} placeholder="Case number" className={INPUT} />
        </div>
        <p className="text-[11px] text-subtle">When the work is with someone outside the triage. The assignee keeps in touch with them.</p>
      </div>
      {error && <p className="text-[11px] text-red-400">Not saved: {error}</p>}
      <div className="pt-4 border-t border-edge flex flex-wrap gap-2">
        <AddButtons canAddAction={tree.actionAfter(step.id) == null} onAdd={onAdd} />
        <button onClick={onRemove} disabled={hasNext} title={hasNext ? 'Only a node without anything after it can be removed' : undefined}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed">
          <Trash2 size={12} /> Remove
        </button>
      </div>
    </>
  )
}

function Scratchpad({ triage, steps, observations }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { fitView } = useReactFlow()
  const { user } = useAuth()
  const me = user?.profile?.preferred_username ?? null
  // ROOT, a node's id, or null: whose panel is open. A new triage opens on its fault description.
  const [open, setOpen] = useState(triage.description ? null : ROOT)
  // The observations panel beside the canvas, and the observation open in it (null: the list).
  const [observing, setObserving] = useState(false)
  const [observation, setObservation] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState(null)
  // Picking affected nodes: the Map of choices lives here until the picker closes, then it is saved.
  const [picking, setPicking] = useState(false)
  const [pickMap, setPickMap] = useState(() => new Map())

  // The list of triages is fetched again when it is shown, so only this triage is kept up to date here.
  const setTriage = fields => queryClient.setQueryData(triageKey(triage.id), t => ({ ...t, ...fields }))
  const setStep = (id, fields) => queryClient.setQueryData(stepsKey(triage.id), ss => ss.map(s => (s.id === id ? { ...s, ...fields } : s)))
  const setObservationData = (id, fields) => queryClient.setQueryData(observationsKey(triage.id), os => os.map(o => (o.id === id ? { ...o, ...fields } : o)))
  // Keys: ROOT for the triage, step:<id>, obs:<id>.
  const patcher = usePatcher({
    send: (key, patch) => {
      if (key === ROOT) return updateTriage(triage.id, patch)
      const [what, id] = key.split(':')
      return what === 'obs' ? updateObservation(triage.id, Number(id), patch) : updateStep(triage.id, Number(id), patch)
    },
    apply: (key, fields) => {
      if (key === ROOT) return setTriage(fields)
      const [what, id] = key.split(':')
      return what === 'obs' ? setObservationData(Number(id), fields) : setStep(Number(id), fields)
    },
  })
  // A verdict is a click, not typing: saved at once.
  const validate = (hypothesisId, status) => {
    patcher.patch(`step:${hypothesisId}`, { status })
    patcher.flush(`step:${hypothesisId}`)
  }

  const tree = useMemo(() => analyse(triage, steps, observations), [triage, steps, observations])
  const involved = useMemo(() => participants(triage, steps, observations), [triage, steps, observations])
  // The ends of validated hypobranches, drawn after their last node.
  const verdicts = [...tree.ends].filter(([, h]) => h.status !== 'open').map(([end, h]) => ({ id: `verdict:${h.id}`, after: end, hypothesis: h }))
  const shape = [...steps.map(s => `${s.id}:${s.parent_id}`), ...verdicts.map(v => `${v.id}:${v.after}`)].join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const positions = useMemo(() => layout(steps, verdicts), [shape])
  useEffect(() => {
    const frame = requestAnimationFrame(() => fitView({ padding: 0.25, maxZoom: 1, duration: 250 }))
    return () => cancelAnimationFrame(frame)
  }, [steps.length, fitView])

  const run = async fn => {
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err.detail ?? err.message)
    }
  }
  // A new action or hypothesis after `parentId` (ROOT for the triage), its panel open to fill it in.
  const add = (parentId, kind) => run(async () => {
    const step = await createStep(triage.id, { parent_id: parentId === ROOT ? null : parentId, kind })
    queryClient.setQueryData(stepsKey(triage.id), ss => [...ss, step])
    setOpen(step.id)
  })
  const removeStep = id => run(async () => {
    await deleteStep(triage.id, id)
    queryClient.setQueryData(stepsKey(triage.id), ss => ss.filter(s => s.id !== id))
    queryClient.invalidateQueries({ queryKey: observationsKey(triage.id) })
    setOpen(null)
  })
  // Observations: a new one opens in the panel to be filled in; links answer with the observation as it is now.
  const addObservation = () => run(async () => {
    const created = await createObservation(triage.id)
    queryClient.setQueryData(observationsKey(triage.id), os => [created, ...os])
    setObserving(true)
    setObservation(created.id)
  })
  const showObservation = id => {
    setObserving(true)
    setObservation(id)
  }
  const link = (id, stepId, effect) => run(async () => setObservationData(id, await linkObservation(triage.id, id, stepId, effect)))
  const unlink = (id, stepId) => run(async () => setObservationData(id, await unlinkObservation(triage.id, id, stepId)))
  const removeObservation = id => run(async () => {
    await deleteObservation(triage.id, id)
    queryClient.setQueryData(observationsKey(triage.id), os => os.filter(o => o.id !== id))
    setObservation(null)
  })
  const removeTriage = async () => {
    await deleteTriage(triage.id)
    queryClient.removeQueries({ queryKey: triageKey(triage.id) })
    queryClient.removeQueries({ queryKey: stepsKey(triage.id) })
    queryClient.removeQueries({ queryKey: observationsKey(triage.id) })
    queryClient.invalidateQueries({ queryKey: TRIAGES_KEY })
    navigate('/samruai/triage')
  }

  // The node picker edits a copy: saved against the triage only when it closes, and only when anything changed.
  const pickNodes = () => {
    setPickMap(new Map((triage.node_ids ?? []).map(id => [id, null])))
    setPicking(true)
  }
  const closePicker = () => {
    setPicking(false)
    const ids = [...pickMap.keys()].sort((a, b) => a - b)
    if (JSON.stringify(ids) !== JSON.stringify(triage.node_ids ?? [])) patcher.patch(ROOT, { node_ids: ids })
  }

  // The hypotheses the observation open in the panel bears on, and how.
  const shownObservation = observing && observation != null ? observations.find(o => o.id === observation) : null
  const highlighted = new Map((shownObservation?.links ?? []).map(l => [l.step_id, l.effect]))

  const nodes = [
    {
      id: ROOT, type: 'triage', position: positions.get(ROOT), selected: open === ROOT,
      data: { triage, canAddAction: tree.actionAfter(ROOT) == null, onAdd: kind => add(ROOT, kind) },
    },
    ...steps.map(s => {
      const ends = tree.endOf(s.id)
      return {
        id: String(s.id), type: 'step', position: positions.get(s.id), selected: open === s.id,
        data: {
          step: s,
          inherited: tree.upstreamOwner(s),
          ruledOut: tree.ruledOut.has(s.id),
          canAddAction: tree.actionAfter(s.id) == null,
          evidence: s.kind === 'hypothesis' ? tree.evidence.get(s.id) : null,
          highlight: highlighted.get(s.id),
          // The end of an open hypobranch: validated here.
          validates: ends && ends.status === 'open' ? ends : null,
          onValidate: () => setOpen(s.id),
          onAdd: kind => add(s.id, kind),
        },
      }
    }),
    ...verdicts.map(v => ({
      id: v.id, type: 'verdict', position: positions.get(v.id), selectable: false,
      data: { status: v.hypothesis.status, validatedBy: v.hypothesis.validated_by },
    })),
  ]
  const edges = [
    ...steps.map(s => {
      const source = s.parent_id == null ? ROOT : String(s.parent_id)
      return {
        id: `${source}>${s.id}`, source, target: String(s.id), type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        // A hypothesis opens a thread: its arrow is dashed.
        style: { ...(s.kind === 'hypothesis' && { strokeDasharray: '5 4' }), ...(tree.ruledOut.has(s.id) && { opacity: 0.35 }) },
      }
    }),
    ...verdicts.map(v => ({
      id: `${v.after}>${v.id}`, source: String(v.after), target: v.id, type: 'smoothstep',
      style: { opacity: v.hypothesis.status === 'root_cause' ? 0.8 : 0.35 },
    })),
  ]

  const openStep = typeof open === 'number' && tree.byId.get(open)
  // A triage cached from before triages had a status is ongoing.
  const status = TRIAGE_STATUSES[triage.status] ?? TRIAGE_STATUSES.ongoing
  const state = patcher.state === 'error' ? 'Not saved' : patcher.state === 'saving' ? 'Saving…' : 'Saved'

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-edge shrink-0">
        <Link to="/samruai/triage" className="text-subtle hover:text-content" title="All triages"><ArrowLeft size={14} /></Link>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-sm font-semibold text-heading">
            <PriorityBadge priority={triage.priority} />
            <span className="truncate">{triageTitle(triage)}</span>
            <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-normal rounded border ${status.className}`}>{status.label}</span>
          </h1>
          <p className="text-[11px] text-subtle truncate">
            Triage #{triage.id} · started {new Date(triage.created_at).toLocaleString()}{triage.created_by && ` by ${triage.created_by}`}
            {tree.rootCauses.length > 0 && (
              <span className="text-green-400"> · Root cause: {tree.rootCauses.map(h => h.title || 'untitled hypothesis').join(', ')}</span>
            )}
          </p>
        </div>
        <span className={`ml-auto text-[11px] ${patcher.state === 'error' ? 'text-red-400' : 'text-subtle'}`}>{state}</span>
        <button onClick={addObservation} className={QUIET}><Plus size={12} /> Add observation</button>
        <button onClick={() => setObserving(o => !o)} className={`${QUIET} ${observing ? 'border-brand/50 text-content' : ''}`} title="Show or hide the observations">
          <Eye size={12} /> Observations ({observations.length})
        </button>
        {triage.status !== 'closed'
          ? <button onClick={() => patcher.patch(ROOT, { status: 'closed' })} className={QUIET}><CircleCheck size={12} /> Close triage</button>
          : <button onClick={() => patcher.patch(ROOT, { status: 'ongoing' })} className={QUIET}><RotateCcw size={12} /> Reopen</button>}
        <button onClick={() => setConfirming(true)} className={QUIET} title="Delete triage"><Trash2 size={12} /></button>
      </div>
      {error && <div className="px-4 py-1.5 text-xs text-red-400 border-b border-edge">{error}</div>}
      <div className="px-4 py-1 text-[10px] text-subtle border-b border-edge">
        Actions follow one another (<Wrench size={9} className="inline" />); only a hypothesis opens another thread, a hypobranch (<GitFork size={9} className="inline rotate-90" />). A hypobranch is validated at its end: root cause or not. Observations sit beside the tree, as evidence for or against hypotheses.
      </div>
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 relative">
            <WorkflowCanvas
              nodeTypes={NODE_TYPES}
              nodes={nodes}
              edges={edges}
              onNodeClick={(_, n) => n.type !== 'verdict' && setOpen(n.id === ROOT ? ROOT : Number(n.id))}
              onPaneClick={() => setOpen(null)}
            />
            {open === ROOT && (
              <Drawer title="Triage" backdrop={false} onClose={() => setOpen(null)}>
                <TriagePanel triage={triage} tree={tree} me={me} error={patcher.errors[ROOT]} onPatch={p => patcher.patch(ROOT, p)} onAdd={kind => add(ROOT, kind)} onPickNodes={pickNodes} />
              </Drawer>
            )}
            {picking && (
              <Drawer title="Affected nodes" backdrop={false} onClose={closePicker}>
                <p className="text-[11px] text-subtle">Devices from the ACEX network module that the triage is about. Saved when the picker is closed.</p>
                <NodePicker selected={pickMap} onChange={setPickMap} />
                <button onClick={closePicker} className={QUIET}>Done</button>
              </Drawer>
            )}
            {openStep && (
              <Drawer title={openStep.title || KINDS[openStep.kind]?.label} backdrop={false} onClose={() => setOpen(null)}>
                <StepPanel
                  key={openStep.id}
                  step={openStep}
                  tree={tree}
                  me={me}
                  error={patcher.errors[`step:${openStep.id}`]}
                  onPatch={p => patcher.patch(`step:${openStep.id}`, p)}
                  onAdd={kind => add(openStep.id, kind)}
                  onRemove={() => removeStep(openStep.id)}
                  onValidate={validate}
                  onOpen={setOpen}
                  onOpenObservation={showObservation}
                  onBrowseObservations={() => showObservation(null)}
                />
              </Drawer>
            )}
          </div>
          <ParticipantsBar people={involved} />
        </div>
        {observing && (
          <ObservationsPanel
            observations={observations}
            hypotheses={tree.hypotheses}
            selected={observation}
            triageNodeIds={triage.node_ids ?? []}
            errors={patcher.errors}
            onSelect={setObservation}
            onAdd={addObservation}
            onClose={() => setObserving(false)}
            onPatch={(id, p) => patcher.patch(`obs:${id}`, p)}
            onLink={link}
            onUnlink={unlink}
            onOpenStep={id => setOpen(id)}
            onDelete={removeObservation}
          />
        )}
      </div>
      {confirming && (
        <ConfirmModal title="Delete this triage?" onConfirm={removeTriage} onClose={() => setConfirming(false)}>
          {triageTitle(triage)}, its {steps.length} node{steps.length === 1 ? '' : 's'} and {observations.length} observation{observations.length === 1 ? '' : 's'} are deleted.
        </ConfirmModal>
      )}
    </div>
  )
}

// A triage's scratchpad, at /samruai/triage/:id.
export default function ScratchpadPage() {
  const { id } = useParams()
  const triage = useQuery({ queryKey: triageKey(id), queryFn: () => fetchTriage(id), retry: false, staleTime: Infinity })
  const steps = useQuery({ queryKey: stepsKey(id), queryFn: () => fetchSteps(id), retry: false, staleTime: Infinity })
  const observations = useQuery({ queryKey: observationsKey(id), queryFn: () => fetchObservations(id), retry: false, staleTime: Infinity })
  const error = triage.error || steps.error || observations.error
  if (error) return <p className="p-6 text-xs text-red-400">{error.status === 404 ? 'No such triage.' : error.detail ?? error.message}</p>
  if (!triage.data || !steps.data || !observations.data) return <p className="p-6 text-xs text-subtle">Loading…</p>
  return (
    <ReactFlowProvider key={id}>
      <Scratchpad triage={triage.data} steps={steps.data} observations={observations.data} />
    </ReactFlowProvider>
  )
}
