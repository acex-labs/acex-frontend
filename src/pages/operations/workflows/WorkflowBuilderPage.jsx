import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ReactFlowProvider, useEdgesState, useNodesState, useReactFlow } from '@xyflow/react'
import { ArrowLeft, CircleAlert, FlaskConical, History, Play, Plus, Save, StepForward, Trash2, TriangleAlert } from 'lucide-react'
import { fetchAllNodes } from '../../../api/inventory'
import { fetchNeds } from '../../../api/operations'
import { checkGraph, deleteWorkflow, fetchWorkflow, startRun, updateWorkflow } from '../../../api/workflows'
import NodePicker from '../../../components/operations/NodePicker'
import { ConfirmModal, ExecuteConfirmModal } from '../../../components/operations/ConfirmModals'
import { orderError } from '../../../components/operations/runs'
import Drawer from '../../../components/workflows/Drawer'
import StepForm from '../../../components/workflows/StepForm'
import WorkflowCanvas from '../../../components/workflows/WorkflowCanvas'
import { flowEdge, toFlow, toGraph } from '../../../components/workflows/graph'
import { MODES, NAME_PATTERN, STEP_TYPES, capabilityOf, cleanStep, newKey } from '../../../components/workflows/steps'

const INPUT = 'w-full px-3 py-2 text-xs bg-surface-hi border border-edge rounded-md text-content placeholder:text-subtle focus:outline-none focus:border-brand/50'
const QUIET = 'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border border-edge text-subtle hover:text-content disabled:opacity-40 disabled:cursor-not-allowed'
const LABEL = 'text-[10px] font-semibold uppercase tracking-widest text-subtle'

// The nodes a step runs on, picked as in Bulk Actions. Nodes whose NED can't run the step would stop the run
// from starting, so they are pointed out with a way to drop them.
function Targets({ step, targets, nodesById, canRun, onChange }) {
  const selected = new Map(targets.map(id => [id, nodesById.get(id) ?? { id, hostname: `#${id}` }]))
  const unable = nodesById.size ? targets.filter(id => !nodesById.has(id) || !canRun(step, nodesById.get(id))) : []
  const shown = [...selected.values()].slice(0, 30)
  return (
    <div className="space-y-2">
      {targets.length > 0 && (
        <div className="text-[11px] text-content">
          {shown.map(n => n.hostname).join(', ')}
          {targets.length > shown.length && <span className="text-subtle"> and {targets.length - shown.length} more</span>}
        </div>
      )}
      {unable.length > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-amber-400">
          {unable.length} can't run it, so the run won't start.
          <button onClick={() => onChange(targets.filter(id => !unable.includes(id)))} className="underline hover:no-underline">Remove them</button>
        </div>
      )}
      <NodePicker selected={selected} onChange={map => onChange([...map.keys()])} />
    </div>
  )
}

// What keeps a step from running, and what deserves a second look.
function Findings({ problems = [], warnings = [] }) {
  if (!problems.length && !warnings.length) return null
  return (
    <div className="space-y-1">
      {problems.map(p => <div key={p} className="flex items-start gap-1.5 text-[11px] text-red-400"><CircleAlert size={12} className="shrink-0 mt-0.5" />{p}</div>)}
      {warnings.map(w => <div key={w} className="flex items-start gap-1.5 text-[11px] text-amber-400"><TriangleAlert size={12} className="shrink-0 mt-0.5" />{w}</div>)}
    </div>
  )
}

// A box: its name, its key, its step's fields and artifacts, and for a step on nodes, its nodes.
function StepPanel({ node, check, keys, taken, nodesById, canRun, onChange, onRename, onRemove }) {
  const [key, setKey] = useState(node.id)
  const { step, targets, name } = node.data
  const kind = STEP_TYPES[step.type]
  const keyError = key === node.id ? null
    : !NAME_PATTERN.test(key) ? 'Letters, digits and _, not starting with a digit'
    : keys.includes(key) ? 'Another step has this key' : null
  const rename = () => key !== node.id && !keyError && onRename(node.id, key)

  return (
    <>
      <Findings problems={check.problems[node.id]} warnings={check.warnings[node.id]} />
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className={LABEL}>Name</span>
          <input value={name} onChange={e => onChange(node.id, { name: e.target.value })} placeholder={kind.label} className={INPUT} />
        </label>
        <label className="space-y-1">
          <span className={LABEL}>Key</span>
          <input value={key} onChange={e => setKey(e.target.value)} onBlur={rename} onKeyDown={e => e.key === 'Enter' && rename()} className={`${INPUT} font-mono`} />
          {keyError && <span className="block text-[10px] text-red-400">{keyError}</span>}
        </label>
      </div>
      <StepForm step={step} upstream={check.upstream[node.id] ?? []} taken={taken} onChange={next => onChange(node.id, { step: next })} />
      {kind.onNodes !== 'never' && (
        <div className="space-y-2">
          <div className={LABEL}>Runs on{kind.onNodes === 'optional' && ' (optional)'}</div>
          {kind.onNodes === 'optional' && targets.length === 0 && (
            <p className="text-[11px] text-subtle">No nodes: the address above is pinged once.</p>
          )}
          <Targets step={step} targets={targets} nodesById={nodesById} canRun={canRun} onChange={next => onChange(node.id, { targets: next })} />
        </div>
      )}
      <div className="pt-4 border-t border-edge">
        <button onClick={() => onRemove(node.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-red-500/40 text-red-400 hover:bg-red-500/10">
          <Trash2 size={12} /> Remove step
        </button>
      </div>
    </>
  )
}

// The kinds of step to add; the new box opens to be filled in.
function AddPanel({ onAdd }) {
  return (
    <div className="space-y-1.5">
      {Object.entries(STEP_TYPES).map(([type, kind]) => (
        <button key={type} onClick={() => onAdd(type)} className="w-full text-left px-3 py-2 rounded-md border border-edge hover:border-brand/40 hover:bg-surface-hi space-y-0.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-content"><kind.icon size={13} className="text-brand" /> {kind.label}</div>
          <div className="text-[11px] text-subtle">{kind.about}</div>
        </button>
      ))}
    </div>
  )
}

// What is about to run and where, before it does. Raw commands need the workflow's name typed: "execute <name>".
function RunConfirm({ mode, name, nodes, nodesById, onConfirm, onClose }) {
  const hostname = id => nodesById.get(id)?.hostname ?? `#${id}`
  const steps = nodes.filter(n => n.type === 'step')
  const executes = steps.filter(n => n.data.step.type === 'execute')
  if (executes.length > 0) {
    const commands = executes.flatMap(n => cleanStep(n.data.step).commands.map(c => `${n.id}: ${c}`))
    const hostnames = [...new Set(executes.flatMap(n => n.data.targets))].map(hostname)
    return (
      <ExecuteConfirmModal
        commands={commands}
        hostnames={hostnames}
        phrase={`execute ${name}`}
        title={`${MODES[mode]} ${name}: ${commands.length} command${commands.length === 1 ? '' : 's'} on ${hostnames.length} node${hostnames.length === 1 ? '' : 's'}`}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    )
  }
  const targets = new Set(steps.flatMap(n => n.data.targets))
  return (
    <ConfirmModal title="Are you sure?" onConfirm={onConfirm} onClose={onClose}>
      {MODES[mode]} {name}: {steps.length} step{steps.length === 1 ? '' : 's'} on {targets.size} node{targets.size === 1 ? '' : 's'}.
    </ConfirmModal>
  )
}

function Builder({ workflow }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { screenToFlowPosition } = useReactFlow()
  const canvas = useRef(null)
  const initial = useMemo(() => toFlow(workflow.graph), [workflow])
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)
  const [name, setName] = useState(workflow.name)
  const [maxRounds, setMaxRounds] = useState(workflow.max_rounds)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  // What keeps the workflow from running, kept up to date as it is drawn.
  const [check, setCheck] = useState(workflow.check)
  const [checkError, setCheckError] = useState(null)
  // null, { add: true }, or { key } of the step whose panel is open.
  const [panel, setPanel] = useState(null)
  // The run mode waiting for confirmation, or 'delete'.
  const [confirming, setConfirming] = useState(null)

  const { data: allNodes } = useQuery({ queryKey: ['nodes', 'all'], queryFn: () => fetchAllNodes({}), staleTime: 60_000 })
  const { data: neds = [] } = useQuery({ queryKey: ['neds'], queryFn: fetchNeds, staleTime: 300_000 })
  const nodesById = useMemo(() => new Map((allNodes ?? []).map(n => [n.id, n])), [allNodes])
  const canRun = (step, node) => {
    const capability = capabilityOf(step)
    if (!capability) return true
    const [kind, what] = capability
    return neds.some(n => n.name === node.ned_id && n.capabilities?.[kind]?.includes(what))
  }

  // The graph without positions: a box moving changes nothing to check.
  const content = useMemo(() => JSON.stringify(toGraph(nodes, edges), (k, v) => (k === 'position' ? undefined : v)), [nodes, edges])
  useEffect(() => {
    const timer = setTimeout(() => {
      checkGraph(JSON.parse(content))
        .then(result => { setCheck(result); setCheckError(null) })
        .catch(err => setCheckError(orderError(err)))
    }, 300)
    return () => clearTimeout(timer)
  }, [content])

  useEffect(() => {
    if (!dirty) return
    const warn = e => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const shown = nodes.map(n => (n.type !== 'step' ? n : {
    ...n,
    data: { ...n.data, key: n.id, problems: check.problems[n.id], warnings: check.warnings[n.id] },
  }))

  const changed = () => setDirty(true)
  const changeNodes = changes => {
    onNodesChange(changes)
    if (changes.some(c => c.type !== 'select' && c.type !== 'dimensions')) changed()
  }
  const changeEdges = changes => {
    onEdgesChange(changes)
    if (changes.some(c => c.type !== 'select')) changed()
  }
  const connect = ({ source, target, sourceHandle }) => {
    const branch = sourceHandle ?? null
    if (source === target || edges.some(e => e.source === source && e.target === target && (e.sourceHandle ?? null) === branch)) return
    setEdges(es => [...es, flowEdge({ source, target, branch })])
    changed()
  }

  // A new box of `type` in the middle of the view, its panel open to fill it in.
  const add = type => {
    const label = STEP_TYPES[type].label
    const key = newKey(label, nodes.map(n => n.id))
    const box = canvas.current.getBoundingClientRect()
    const center = screenToFlowPosition({ x: box.left + box.width / 3, y: box.top + box.height / 2 })
    const nudge = (nodes.length % 5) * 18
    const position = { x: center.x - 115 + nudge, y: center.y - 48 + nudge }
    setNodes(ns => [
      ...ns.map(n => ({ ...n, selected: false })),
      { id: key, type: 'step', position, selected: true, data: { name: '', step: STEP_TYPES[type].config(), targets: [] } },
    ])
    changed()
    setPanel({ key })
  }
  const update = (key, patch) => {
    setNodes(ns => ns.map(n => (n.id === key ? { ...n, data: { ...n.data, ...patch } } : n)))
    changed()
  }
  const rename = (from, to) => {
    setNodes(ns => ns.map(n => (n.id === from ? { ...n, id: to } : n)))
    setEdges(es => es.map(e => flowEdge({
      source: e.source === from ? to : e.source,
      target: e.target === from ? to : e.target,
      branch: e.sourceHandle ?? null,
    })))
    setPanel({ key: to })
    changed()
  }
  const remove = key => {
    setNodes(ns => ns.filter(n => n.id !== key))
    setEdges(es => es.filter(e => e.source !== key && e.target !== key))
    setPanel(null)
    changed()
  }

  const save = async () => {
    setSaving(true)
    try {
      const saved = await updateWorkflow(workflow.id, { name: name.trim() || workflow.name, max_rounds: maxRounds, graph: toGraph(nodes, edges) })
      queryClient.setQueryData(['workflow', String(workflow.id)], saved)
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      setCheck(saved.check)
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }
  const trySave = () => {
    setError(null)
    save().catch(err => setError(orderError(err)))
  }

  // Saves what's on the canvas first, since a run runs the workflow as saved.
  const run = async mode => {
    setConfirming(null)
    setError(null)
    try {
      if (dirty) await save()
      const started = await startRun(workflow.id, mode)
      queryClient.invalidateQueries({ queryKey: ['workflow-runs'] })
      navigate(`/operations/workflows/run/${started.id}`)
    } catch (err) {
      setError(orderError(err))
    }
  }
  const removeWorkflow = async () => {
    try {
      await deleteWorkflow(workflow.id)
      queryClient.removeQueries({ queryKey: ['workflow', String(workflow.id)] })
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      navigate('/operations/workflows/workflows')
    } catch (err) {
      setConfirming(null)
      setError(orderError(err))
    }
  }

  const open = panel?.key && nodes.find(n => n.id === panel.key)
  const problems = Object.values(check.problems).flat().length
  const blocked = problems > 0 || !!checkError
  const why = checkError ?? (problems ? `${problems} problem${problems === 1 ? '' : 's'} to fix first` : undefined)
  const artifactNames = key => nodes.filter(n => n.type === 'step' && n.id !== key).flatMap(n => n.data.step.artifacts.map(a => a.name)).filter(Boolean)

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-edge shrink-0">
        <Link to="/operations/workflows/workflows" className="text-subtle hover:text-content" title="Workflows"><ArrowLeft size={14} /></Link>
        <input
          value={name}
          onChange={e => { setName(e.target.value); changed() }}
          className="min-w-0 w-64 px-2 py-1 text-sm font-semibold bg-transparent border border-transparent rounded hover:border-edge focus:border-brand/50 focus:outline-none text-heading"
        />
        {dirty && <span className="text-[11px] text-amber-400">Unsaved changes</span>}
        <button onClick={trySave} disabled={!dirty || saving} className={QUIET}><Save size={12} /> Save</button>
        <button onClick={() => setPanel({ add: true })} className={QUIET}><Plus size={12} /> Add step</button>
        <label className="flex items-center gap-1.5 text-[11px] text-subtle" title="How often a step may run in one run before the run fails: a guard against loops that never end">
          Max rounds
          <input type="number" min={1} max={100000} value={maxRounds} onChange={e => { setMaxRounds(Number(e.target.value) || 1); changed() }} className="w-16 px-2 py-1 text-xs bg-surface-hi border border-edge rounded text-content focus:outline-none focus:border-brand/50" />
        </label>
        <div className="ml-auto flex items-center gap-2">
          <Link to={`/operations/workflows/runs?workflow=${workflow.id}`} className={QUIET}><History size={12} /> Runs</Link>
          <button onClick={() => setConfirming('delete')} className={QUIET} title="Delete workflow"><Trash2 size={12} /></button>
          <span className="w-px h-5 bg-edge mx-1" />
          <button onClick={() => run('dry_run')} disabled={blocked} className={QUIET} title={why ?? 'Walk the workflow without reaching any device'}><FlaskConical size={12} /> Dry run</button>
          <button onClick={() => setConfirming('evaluate')} disabled={blocked} className={QUIET} title={why ?? 'Pause after each step'}><StepForward size={12} /> Evaluate</button>
          <button
            onClick={() => setConfirming('run')}
            disabled={blocked}
            title={why}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-brand text-white hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play size={12} /> Run
          </button>
        </div>
      </div>
      {error && <div className="px-4 py-1.5 text-xs text-red-400 border-b border-edge break-words">{error}</div>}
      {checkError && <div className="px-4 py-1.5 text-xs text-red-400 border-b border-edge break-words">{checkError}</div>}
      {check.problems[''] && <div className="px-4 py-1.5 text-xs text-amber-400 border-b border-edge">{check.problems[''].join(' · ')}</div>}
      <div className="px-4 py-1 text-[10px] text-subtle border-b border-edge">
        Drag from a box's right edge to the next box; a condition has a true and a false side. Arrows out of one box run in parallel; a box with several arrows in waits for all of them. Select an arrow or box and press Delete to remove it.
      </div>
      <div ref={canvas} className="flex-1 relative">
        <WorkflowCanvas
          editable
          nodes={shown}
          edges={edges}
          onNodesChange={changeNodes}
          onEdgesChange={changeEdges}
          onConnect={connect}
          onNodeClick={(_, n) => setPanel(n.type === 'step' ? { key: n.id } : null)}
          onPaneClick={() => setPanel(null)}
        />
        {panel?.add && (
          <Drawer title="Add step" backdrop={false} onClose={() => setPanel(null)}>
            <AddPanel onAdd={add} />
          </Drawer>
        )}
        {open && (
          <Drawer title={open.data.name || STEP_TYPES[open.data.step.type].label} backdrop={false} onClose={() => setPanel(null)}>
            <StepPanel
              key={open.id}
              node={open}
              check={check}
              keys={nodes.map(n => n.id)}
              taken={artifactNames(open.id)}
              nodesById={nodesById}
              canRun={canRun}
              onChange={update}
              onRename={rename}
              onRemove={remove}
            />
          </Drawer>
        )}
      </div>
      {confirming === 'delete' && (
        <ConfirmModal title="Delete this workflow?" onConfirm={removeWorkflow} onClose={() => setConfirming(null)}>
          {workflow.name} is deleted; its runs are kept.
        </ConfirmModal>
      )}
      {confirming && confirming !== 'delete' && (
        <RunConfirm mode={confirming} name={name} nodes={nodes} nodesById={nodesById} onConfirm={() => run(confirming)} onClose={() => setConfirming(null)} />
      )}
    </div>
  )
}

// A saved workflow on a canvas: add steps, connect them, fill them in, choose their nodes, and run it.
export default function WorkflowBuilderPage() {
  const { id } = useParams()
  const { data: workflow, error } = useQuery({ queryKey: ['workflow', id], queryFn: () => fetchWorkflow(id), staleTime: Infinity })
  if (error) return <p className="p-6 text-xs text-red-400">{error.status === 404 ? 'No such workflow.' : orderError(error)}</p>
  if (!workflow) return <p className="p-6 text-xs text-subtle">Loading…</p>
  return (
    <ReactFlowProvider>
      <Builder key={workflow.id} workflow={workflow} />
    </ReactFlowProvider>
  )
}
