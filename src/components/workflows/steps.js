import { Activity, Calculator, CircleCheck, Hourglass, Radar, Split, Terminal } from 'lucide-react'

// The kinds of step. `onNodes` says whether it runs on nodes the workflow gives it: always, never, or (probe)
// when it has some. `result` is what the step's own artifact rows read as `result`.
export const STEP_TYPES = {
  execute: {
    label: 'Execute',
    icon: Terminal,
    onNodes: 'always',
    about: 'Raw commands on each node, in order. Output is masked before it is stored.',
    result: 'result.output (every command\'s output), result.outputs',
    config: () => ({ type: 'execute', commands: [], artifacts: [] }),
  },
  action: {
    label: 'Action',
    icon: Activity,
    onNodes: 'always',
    about: 'A vendor-agnostic action run from each node, the same whatever the driver. Ping from the node for now.',
    result: 'result.success, result.success_rate, result.sent, result.received, result.rtt_avg_ms',
    config: () => ({ type: 'action', action: 'ping', params: {}, artifacts: [] }),
  },
  probe: {
    label: 'Probe',
    icon: Radar,
    onNodes: 'optional',
    about: 'A ping from ACEX itself: to each chosen node\'s management IP, or to an address.',
    result: 'result.success, result.success_rate, result.sent, result.received, result.rtt_avg_ms, result.address',
    config: () => ({ type: 'probe', method: 'ping', address: null, count: 3, timeout: 2, artifacts: [] }),
  },
  compute: {
    label: 'Compute',
    icon: Calculator,
    onNodes: 'never',
    about: 'Computes new artifacts from earlier ones: grep lines, regex, a column, counts.',
    result: null,
    config: () => ({ type: 'compute', artifacts: [{ name: '', expression: '' }] }),
  },
  assert: {
    label: 'Assert',
    icon: CircleCheck,
    onNodes: 'never',
    about: 'Checks earlier artifacts. When the checks don\'t pass, the step fails and so does the run.',
    result: 'result.passed, result.checks',
    config: () => ({ type: 'assert', checks: [], require: 'all', artifacts: [] }),
  },
  condition: {
    label: 'Condition',
    icon: Split,
    onNodes: 'never',
    about: 'Chooses the way on: the arrows from its true side or its false side. It must give one answer for the whole run.',
    result: 'result.value',
    config: () => ({ type: 'condition', check: '', artifacts: [] }),
  },
  wait: {
    label: 'Wait',
    icon: Hourglass,
    onNodes: 'never',
    about: 'Waits before the steps after it start, without holding a worker. In a loop, it sets the pace.',
    result: null,
    config: () => ({ type: 'wait', seconds: 60, artifacts: [] }),
  },
}

// How a run goes: through, pausing after each step, or without reaching any device.
export const MODES = { run: 'Run', evaluate: 'Evaluate', dry_run: 'Dry run' }

// The abstract actions an action step can run, with their params. Every param takes text, so a value can come
// from an earlier step: `{target_ip}`.
export const ACTIONS = {
  ping: {
    label: 'Ping from the node',
    params: [
      { key: 'target', label: 'Target', placeholder: '10.0.0.1 or {address}' },
      { key: 'count', label: 'Count', placeholder: '1', hint: '1–100' },
      { key: 'timeout', label: 'Timeout', placeholder: '2', hint: 'Seconds per reply' },
      { key: 'vrf', label: 'VRF', placeholder: 'Global table' },
      { key: 'source', label: 'Source interface', placeholder: 'Loopback0' },
      { key: 'size', label: 'Size', placeholder: 'Default', hint: '36–9216 bytes' },
    ],
  },
}

// Whether a box runs on nodes, as the backend decides it.
export function onNodes(step, targets) {
  const kind = STEP_TYPES[step.type].onNodes
  return kind === 'always' || (kind === 'optional' && targets.length > 0)
}

// What a node's NED must support to run a step on it, or null for a probe, which only needs its IP.
export function capabilityOf(step) {
  if (step.type === 'execute') return ['operations', 'execute']
  if (step.type === 'action') return ['actions', step.action]
  return null
}

// A step as the API saves it. The form keeps what is typed as it is: blank lines, numbers as text, artifact rows
// not named yet. Those lines and rows are left out, and whole-number params sent as numbers.
export function cleanStep(step) {
  const lines = list => list.map(line => line.trim()).filter(Boolean)
  const cleaned = { ...step, artifacts: step.artifacts.filter(a => a.name.trim() !== '') }
  if (step.type === 'execute') return { ...cleaned, commands: lines(step.commands) }
  if (step.type === 'assert') return { ...cleaned, checks: lines(step.checks) }
  if (step.type === 'action') {
    const params = Object.entries(step.params)
      .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
      .filter(([, value]) => value !== '' && value != null)
      .map(([key, value]) => [key, typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value])
    return { ...cleaned, params: Object.fromEntries(params) }
  }
  return cleaned
}

// What a step does, in one line.
export function stepSummary(step) {
  if (step.type === 'execute') return step.commands.join('; ')
  if (step.type === 'action') return [step.action, step.params?.target].filter(Boolean).join(' ')
  if (step.type === 'probe') return `ping ${step.address || 'management IP'}`
  if (step.type === 'compute') return step.artifacts.map(a => a.name).filter(Boolean).join(', ')
  if (step.type === 'assert') return step.checks.join(step.require === 'all' ? ' and ' : ' or ')
  if (step.type === 'condition') return step.check
  return `${step.seconds} s`
}

// A box's key and an artifact's name.
export const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

// Words an artifact can't be called: the expression language's own.
export const RESERVED = ['and', 'or', 'not', 'contains', 'matches', 'true', 'false', 'null', 'result']

// A key for a box called `name`, not among `taken`: "Show version" gives show_version, then show_version_2.
export function newKey(name, taken) {
  let base = name.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'step'
  if (/^\d/.test(base)) base = `step_${base}`
  if (!taken.includes(base)) return base
  let n = 2
  while (taken.includes(`${base}_${n}`)) n++
  return `${base}_${n}`
}
