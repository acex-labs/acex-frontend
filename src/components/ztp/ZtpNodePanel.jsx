import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Check, Circle, AlertTriangle, ExternalLink, Undo2, Loader2, Play, Ban, RotateCcw, Pause, Rocket } from 'lucide-react'
import { fetchZtpNode, canUnclaim, unclaimNode, enrollNode, provisionNode, cancelZtp, resetZtp } from '../../api/ztp'
import { formatTime } from '../jobs/jobs'
import JobStateBadge from '../jobs/JobStateBadge'
import { ProvisionStatusBadge } from '../nodes/NodeStatusBadge'

const REFRESH_MS = 10_000

const REVIEW_STYLES = {
  unreviewed: 'text-amber-400',
  approved:   'text-green-400',
  rejected:   'text-red-400',
}

// How far along each stage is: steps before it are done, it is the current one.
const STAGE_STEP = { awaiting_device: 1, awaiting_approval: 2, ready: 3, provisioning: 3, failed: 3, provisioned: 5, adopted: 5 }

const approvalLink = id => `/ztp/approvals?review_status=all&id=${id}`

function Section({ title, children, aside }) {
  return (
    <div className="px-4 py-3 border-b border-edge">
      <div className="mb-2 flex items-center">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">{title}</h3>
        {aside && <span className="ml-auto">{aside}</span>}
      </div>
      {children}
    </div>
  )
}

function StepIcon({ state }) {
  if (state === 'done') return <span className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500/15 text-green-400"><Check size={10} /></span>
  if (state === 'failed') return <span className="flex items-center justify-center w-4 h-4 rounded-full bg-red-500/15 text-red-400"><X size={10} /></span>
  // Held: nothing is running, the node waits for someone to start the step.
  if (state === 'waiting') return <span className="flex items-center justify-center w-4 h-4 rounded-full bg-sky-500/15 text-sky-400"><Pause size={10} /></span>
  if (state === 'current') return <span className="flex items-center justify-center w-4 h-4 rounded-full bg-brand/15 text-brand"><Loader2 size={10} className="animate-spin [animation-duration:2.5s]" /></span>
  return <span className="flex items-center justify-center w-4 h-4 text-edge"><Circle size={10} /></span>
}

function Steps({ steps }) {
  return (
    <ol className="relative">
      {steps.map((step, i) => (
        <li key={step.title} className="relative flex gap-3 pb-3 last:pb-0">
          {i < steps.length - 1 && <span className="absolute left-2 top-4 bottom-0 w-px bg-edge" />}
          <div className="relative z-10 pt-px"><StepIcon state={step.state} /></div>
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-medium ${step.state === 'pending' ? 'text-subtle' : 'text-content'}`}>{step.title}</p>
            {step.detail && <div className="mt-0.5 text-[11px] text-subtle break-words">{step.detail}</div>}
          </div>
        </li>
      ))}
    </ol>
  )
}

const mono = v => <span className="font-mono text-content">{v}</span>

function buildSteps(node) {
  const at = STAGE_STEP[node.stage] ?? 0
  const stuck = node.stage === 'failed' || node.stalled
  // Ready is held until provisioning is started by hand, not in progress.
  const now = stuck ? 'failed' : node.stage === 'ready' ? 'waiting' : 'current'
  const state = i => (i < at ? 'done' : i === at ? now : 'pending')
  const latest = node.discoveries[0]
  const approved = node.discoveries.find(d => d.review_status === 'approved')
  const pending = node.discoveries.find(d => d.review_status === 'unreviewed')
  const job = node.provision_jobs[0]
  const asset = node.asset

  return [
    {
      title: 'Asset claimed',
      state: asset ? 'done' : 'current',
      detail: asset
        ? <>{mono(asset.serial_number)} · {[asset.vendor, asset.hardware_model].filter(Boolean).join(' ') || 'unknown hardware'}</>
        : 'Bound to an asset cluster; ZTP tracks single assets only.',
    },
    {
      title: 'Device discovered',
      state: state(1),
      detail: latest
        ? <>Last seen at {mono(latest.source_ip)} · {formatTime(latest.created_at)}</>
        : at > 1 ? null : 'Waiting for the device to fetch its bootstrap.',
    },
    {
      title: 'Identity approved',
      state: state(2),
      detail: approved && at > 2
        ? <>At {mono(approved.source_ip)} by {approved.reviewed_by ?? '—'} · {formatTime(approved.reviewed_at)}</>
        : pending
          ? <Link to={approvalLink(pending.id)} className="text-brand hover:underline">Review the discovery from {pending.source_ip}</Link>
          : null,
    },
    {
      title: 'Provisioning',
      state: state(3),
      detail: job
        ? <span className="inline-flex items-center gap-1.5"><JobStateBadge state={job.state} /> job <Link to={`/activity/jobs/${job.id}`} className="text-brand hover:underline">#{job.id}</Link></span>
        : node.stage === 'ready' ? 'Not started. Waits here until it is started with Provision.' : null,
    },
    { title: 'Provisioned', state: node.stage === 'provisioned' || node.stage === 'adopted' ? 'done' : 'pending' },
  ]
}

// What happens next, and who it waits on.
function NextAction({ node }) {
  const pending = node.discoveries.find(d => d.review_status === 'unreviewed')
  const rejected = node.discoveries[0]?.review_status === 'rejected'
  const job = node.provision_jobs[0]

  const stalled = node.stalled && {
    tone: 'red',
    text: <>Stalled: {node.stalled}. Nothing is moving this node forward. Step it back to ready, or cancel ZTP.</>,
  }
  const content = stalled || {
    awaiting_device: {
      tone: 'brand',
      text: rejected
        ? 'The last discovery was rejected. Waiting for the right device to call in again.'
        : 'Waiting for the device. Once it boots with DHCP pointing at the ZTP bootstrap, a worker logs in and reports what it is.',
    },
    awaiting_approval: {
      tone: 'amber',
      text: 'The device has reported its identity. An administrator has to approve it before anything else happens.',
      action: pending && <Link to={approvalLink(pending.id)} className="text-brand hover:underline">Review discovery →</Link>,
    },
    ready: {
      tone: 'sky',
      text: <>Identity approved at {mono(node.approved_ip)}. Next step is provisioning: full configuration pushed and accounts rotated. It waits here until someone starts it.</>,
    },
    provisioning: { tone: 'brand', text: 'Full configuration is being pushed and verified.' },
    failed: {
      tone: 'red',
      text: job?.error ? <>Provisioning failed: <span className="font-mono">{job.error}</span></> : 'Provisioning failed.',
    },
    provisioned: { tone: 'green', text: 'Provisioned by ACEX and verified. Start ZTP to provision it again from scratch.' },
    adopted: { tone: 'subtle', text: 'Adopted: already running when it was brought under management. Not in ZTP.' },
    unprovisioned: { tone: 'subtle', text: 'Not in ZTP. Start ZTP to have the device discovered, approved and provisioned.' },
  }[node.stage]
  if (!content) return null

  const tones = {
    brand: 'border-brand/30 bg-brand/5',
    amber: 'border-amber-500/30 bg-amber-500/5',
    sky:   'border-sky-500/30 bg-sky-500/5',
    red:   'border-red-500/30 bg-red-500/5 text-red-300',
    green: 'border-green-500/30 bg-green-500/5',
    subtle: 'border-edge bg-surface-hi/40',
  }
  return (
    <div className={`rounded border px-3 py-2 text-xs text-content ${tones[content.tone]}`}>
      <p>{content.text}</p>
      {content.action && <p className="mt-1.5">{content.action}</p>}
    </div>
  )
}

function Discoveries({ discoveries }) {
  if (!discoveries.length) return <p className="text-xs text-subtle">No discoveries of this serial yet.</p>
  return (
    <ul className="space-y-1">
      {discoveries.map(d => (
        <li key={d.id}>
          <Link to={approvalLink(d.id)} className="flex items-center gap-2 px-2 py-1 -mx-2 rounded text-xs hover:bg-surface-hi">
            <span className="font-mono text-content">{d.source_ip}</span>
            <span className="text-subtle">{formatTime(d.created_at)}</span>
            {d.conflicts.length > 0 && (
              <span className="inline-flex items-center gap-0.5 text-amber-400" title={d.conflicts.map(c => c.message).join('\n')}>
                <AlertTriangle size={10} />{d.conflicts.length}
              </span>
            )}
            <span className={`ml-auto text-[10px] font-semibold uppercase tracking-wider ${REVIEW_STYLES[d.review_status]}`}>
              {d.review_status}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function Jobs({ jobs }) {
  if (!jobs.length) return <p className="text-xs text-subtle">None yet.</p>
  return (
    <ul className="space-y-1">
      {jobs.map(job => (
        <li key={job.id} className="text-xs">
          <Link to={`/activity/jobs/${job.id}`} className="flex items-center gap-2 px-2 py-1 -mx-2 rounded hover:bg-surface-hi">
            <span className="text-brand">#{job.id}</span>
            <JobStateBadge state={job.state} />
            <span className="ml-auto text-subtle">{formatTime(job.created_at)}</span>
          </Link>
          {job.error && <p className="px-2 text-[11px] text-red-400 font-mono break-all">{job.error}</p>}
        </li>
      ))}
    </ul>
  )
}

const IN_ZTP = ['enrolled', 'provisioning', 'failed']

// A button that takes a second click, with what it will do spelled out.
function ConfirmButton({ icon: Icon, label, confirm, tone = 'default', disabled, onConfirm }) {
  const [armed, setArmed] = useState(false)
  const tones = {
    primary: 'bg-brand text-white hover:bg-brand/90',
    default: 'text-content bg-surface-hi hover:bg-edge',
    danger:  'text-red-400 hover:bg-red-500/10',
  }
  return (
    <div className="space-y-1">
      <button
        onClick={() => (armed || !confirm ? onConfirm() : setArmed(true))}
        onBlur={() => setArmed(false)}
        disabled={disabled}
        className={[
          'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50',
          armed ? 'bg-red-500/15 text-red-400' : tones[tone],
        ].join(' ')}
      >
        <Icon size={12} />{armed ? `Confirm: ${label.toLowerCase()}` : label}
      </button>
      {armed && <p className="text-[11px] text-subtle max-w-xs">{confirm}</p>}
    </div>
  )
}

const statusWord = s => (s ?? 'unprovisioned').replaceAll('_', ' ')

function cancelText(node) {
  const job = node.provision_jobs[0]
  if (node.stage === 'provisioning' && job?.state === 'running') {
    return 'A worker may have started configuring the device. Its job is cancelled and the node is left failed; cancel again to take it out of ZTP.'
  }
  const back = `The node returns to ${statusWord(node.ztp_previous_status)}.`
  if (node.stage === 'failed') return `${back} The device's configuration is unknown.`
  if (node.stage === 'provisioning') return `${back} Its queued provisioning job is cancelled.`
  return `${back} The asset and its discoveries are kept.`
}

function Actions({ node, onUnclaimed }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ action }) => action(),
    onSettled: (_, __, { after }) => {
      ['ztp', 'nodes', 'assets', 'logical-nodes'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }))
      after?.()
    },
  })
  const run = (action, after) => mutation.mutate({ action, after })
  const busy = mutation.isPending
  const inZtp = IN_ZTP.includes(node.provision_status)
  const canStepBack = node.provision_status === 'provisioning' || node.provision_status === 'failed'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-2">
        {!inZtp && node.asset && (
          <ConfirmButton
            icon={Play}
            label="Start ZTP"
            tone="primary"
            disabled={busy}
            confirm={node.stage === 'provisioned'
              ? 'The node is provisioned. Enrolling it provisions it again from scratch once its device is discovered and approved.'
              : null}
            onConfirm={() => run(() => enrollNode(node.node_id))}
          />
        )}
        {node.stage === 'ready' && (
          <ConfirmButton
            icon={Rocket}
            label="Provision"
            tone="primary"
            disabled={busy}
            confirm="A provisioning job is queued: full configuration is pushed to the device and its accounts are rotated."
            onConfirm={() => run(() => provisionNode(node.node_id))}
          />
        )}
        {canStepBack && (
          <ConfirmButton
            icon={RotateCcw}
            label="Back to ready"
            disabled={busy}
            confirm="Any provisioning job is cancelled. The node stays in ZTP, at the stage its asset is in (usually ready)."
            onConfirm={() => run(() => resetZtp(node.node_id))}
          />
        )}
        {inZtp && (
          <ConfirmButton
            icon={Ban}
            label="Cancel ZTP"
            tone="danger"
            disabled={busy}
            confirm={cancelText(node)}
            onConfirm={() => run(() => cancelZtp(node.node_id))}
          />
        )}
        {canUnclaim(node) && (
          <ConfirmButton
            icon={Undo2}
            label="Unclaim"
            tone="danger"
            disabled={busy}
            confirm="The node instance is removed: the asset returns to Unclaimed and the logical node to planned."
            onConfirm={() => run(() => unclaimNode(node), onUnclaimed)}
          />
        )}
      </div>
      {mutation.isError && (
        <p className="text-[11px] text-red-400">
          {typeof mutation.error.detail === 'string' ? mutation.error.detail : mutation.error.message}
        </p>
      )}
    </div>
  )
}

// Where one node stands in ZTP: each step, what it waits on, and the evidence.
export default function ZtpNodePanel({ nodeId, onClose }) {
  const { data: node, isLoading, isError } = useQuery({
    queryKey: ['ztp', 'node', nodeId],
    queryFn: () => fetchZtpNode(nodeId),
    refetchInterval: REFRESH_MS,
  })

  if (isLoading) return <p className="px-4 py-3 text-xs text-subtle animate-pulse">Loading…</p>
  if (isError || !node) return <p className="px-4 py-3 text-xs text-red-400">Node {nodeId} could not be loaded.</p>

  return (
    <div className="flex flex-col">
      <div className="px-4 py-3 border-b border-edge">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-heading truncate">{node.hostname ?? `Node ${node.node_id}`}</span>
          <ProvisionStatusBadge status={node.stage} />
          <button onClick={onClose} className="ml-auto text-subtle hover:text-content" title="Close"><X size={13} /></button>
        </div>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-subtle">
          {node.site && <span>{node.site}</span>}
          <Link to={`/network/nodes/${node.node_id}`} className="inline-flex items-center gap-1 text-brand hover:underline">
            Node page <ExternalLink size={10} />
          </Link>
          {node.asset && (
            <Link to={`/network/assets/${node.asset.id}`} className="inline-flex items-center gap-1 text-brand hover:underline">
              Asset <ExternalLink size={10} />
            </Link>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-b border-edge space-y-3">
        <NextAction node={node} />
        <Actions node={node} onUnclaimed={onClose} />
      </div>

      <Section title="Progress"><Steps steps={buildSteps(node)} /></Section>

      <Section title={`Discoveries (${node.discoveries.length})`}><Discoveries discoveries={node.discoveries} /></Section>

      <Section title="Provisioning jobs"><Jobs jobs={node.provision_jobs} /></Section>

    </div>
  )
}
