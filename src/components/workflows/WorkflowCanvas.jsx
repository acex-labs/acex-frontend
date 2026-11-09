import { Background, BackgroundVariant, Controls, Handle, Position, ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { CircleAlert, Flag, Play, TriangleAlert } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import JobStateBadge from '../jobs/JobStateBadge'
import { STEP_TYPES, onNodes } from './steps'

const HANDLE = { width: 9, height: 9, background: 'var(--surface)', border: '1.5px solid var(--subtle)' }

// A box's border by how its latest round went, in a run.
const BORDERS = {
  scheduled: 'border-amber-400/60',
  queued: 'border-edge',
  running: 'border-brand ring-2 ring-brand/25',
  succeeded: 'border-green-500/60',
  failed: 'border-red-500/70 ring-2 ring-red-500/20',
  cancelled: 'border-edge opacity-70',
}

function Terminal({ label, icon: Icon, selected, source, target }) {
  return (
    <div className={`flex items-center gap-1.5 px-4 py-2 rounded-full border bg-surface text-xs font-semibold text-content ${selected ? 'border-brand' : 'border-edge'}`}>
      {target && <Handle type="target" position={Position.Left} style={HANDLE} />}
      <Icon size={12} className="text-brand" /> {label}
      {source && <Handle type="source" position={Position.Right} style={HANDLE} />}
    </div>
  )
}

const StartNode = ({ selected }) => <Terminal label="Start" icon={Play} selected={selected} source />
const EndNode = ({ selected }) => <Terminal label="End" icon={Flag} selected={selected} target />

// A condition's two ways out: true above, false below.
function Sides({ taken }) {
  return [['true', '30%', 'text-green-400'], ['false', '70%', 'text-red-400']].map(([side, top, color]) => (
    <div key={side}>
      <Handle id={side} type="source" position={Position.Right} style={{ ...HANDLE, top }} />
      <span className={`absolute right-2 text-[9px] font-semibold ${color} ${taken && taken !== side ? 'opacity-30' : ''}`} style={{ top, transform: 'translateY(-50%)' }}>
        {side}
      </span>
    </div>
  ))
}

// A step: what it is, its key, and its nodes. In the builder, what keeps it from running or deserves a look;
// in a run, how its latest round went, whether it waits for continue, and which side a condition took.
function StepNode({ data, selected }) {
  const kind = STEP_TYPES[data.step.type]
  const condition = data.step.type === 'condition'
  const border = data.pending ? 'border-amber-400/70 ring-2 ring-amber-400/20'
    : data.state ? BORDERS[data.state] ?? 'border-edge'
    : data.problems?.length ? 'border-red-500/50'
    : 'border-edge'
  return (
    <div className={`relative w-[230px] rounded-lg border bg-surface px-3 py-2 space-y-1 ${condition ? 'pr-10' : ''} ${border} ${selected ? 'outline outline-2 outline-brand/60 outline-offset-2' : ''}`}>
      <Handle type="target" position={Position.Left} style={HANDLE} />
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-subtle">
        <kind.icon size={11} className="text-brand" />
        {kind.label}
        {data.round > 1 && <span className="normal-case tracking-normal">· round {data.round}</span>}
        {data.state && <span className="ml-auto"><JobStateBadge state={data.state} /></span>}
        {!data.state && data.problems?.length > 0 && (
          <span className="ml-auto flex items-center gap-0.5 text-red-400 normal-case" title={data.problems.join('\n')}>
            <CircleAlert size={11} /> {data.problems.length}
          </span>
        )}
        {!data.state && data.warnings?.length > 0 && (
          <span className={`${data.problems?.length ? '' : 'ml-auto'} flex items-center gap-0.5 text-amber-400 normal-case`} title={data.warnings.join('\n')}>
            <TriangleAlert size={11} /> {data.warnings.length}
          </span>
        )}
      </div>
      <div className="text-xs font-semibold text-content truncate">{data.name || kind.label}</div>
      <div className="flex items-center gap-2 text-[10px]">
        <span className="font-mono text-subtle truncate">{data.key}</span>
        {onNodes(data.step, data.targets) && (
          <span className="ml-auto shrink-0 text-subtle">{data.targets.length} node{data.targets.length === 1 ? '' : 's'}</span>
        )}
      </div>
      {data.pending && <div className="text-[10px] text-amber-400">Waits for continue</div>}
      {data.waitsUntil && <div className="text-[10px] text-amber-400">Waits until {data.waitsUntil}</div>}
      {data.artifactCount > 0 && <div className="text-[10px] text-brand">{data.artifactCount} artifact{data.artifactCount === 1 ? '' : 's'}</div>}
      {condition ? <Sides taken={data.branch} /> : <Handle type="source" position={Position.Right} style={HANDLE} />}
    </div>
  )
}

const NODE_TYPES = { start: StartNode, end: EndNode, step: StepNode }

// The workflow's boxes and arrows. In the builder boxes move, connect and delete; in a run they only select.
export default function WorkflowCanvas({ editable = false, ...props }) {
  const { resolved } = useTheme()
  const light = resolved === 'light'
  return (
    <ReactFlow
      nodeTypes={NODE_TYPES}
      colorMode={resolved}
      style={{ backgroundColor: 'transparent' }}
      fitView
      fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
      minZoom={0.2}
      maxZoom={2}
      nodesDraggable={editable}
      nodesConnectable={editable}
      deleteKeyCode={editable ? ['Backspace', 'Delete'] : null}
      {...props}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color={light ? '#c9ccd1' : '#2A2E38'} />
      <Controls showInteractive={false} style={light ? { background: '#fff', border: '1px solid #DFE1E5' } : { background: 'var(--surface)', border: '1px solid var(--edge)' }} />
    </ReactFlow>
  )
}
