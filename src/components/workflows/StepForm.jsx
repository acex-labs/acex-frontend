import { useRef, useState } from 'react'
import { ChevronRight, Plus, X } from 'lucide-react'
import { ACTIONS, NAME_PATTERN, RESERVED, STEP_TYPES } from './steps'

// Without a width, for fields sized by where they sit; INPUT fills its row.
const BOX = 'px-3 py-2 text-xs bg-surface-hi border border-edge rounded-md text-content placeholder:text-subtle focus:outline-none focus:border-brand/50'
const INPUT = `w-full ${BOX}`
const MONO = `${INPUT} font-mono`
const LABEL = 'text-[10px] font-semibold uppercase tracking-widest text-subtle'

function Field({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-subtle">
      {label}
      {children}
      {hint && <span className="text-[10px] text-subtle/70">{hint}</span>}
    </label>
  )
}

// A text field the artifact picker can insert into, where the cursor is: `{name}` in text that is rendered, the
// bare name in an expression.
function Insertable({ as: Tag = 'input', value, onChange, braces = false, picker, ...rest }) {
  return (
    <Tag
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={e => { picker.current = { el: e.target, braces, onChange } }}
      {...rest}
    />
  )
}

function Chip({ label, hint, title, onPick, quiet = false }) {
  return (
    <button
      type="button"
      // Keeps the field's focus and cursor, so the name lands where the cursor was.
      onMouseDown={e => e.preventDefault()}
      onClick={onPick}
      title={title}
      className={`px-2 py-0.5 rounded border text-[11px] font-mono hover:border-brand/50 hover:text-brand ${quiet ? 'border-transparent text-subtle' : 'border-edge text-content'}`}
    >
      {label}{hint && <span className="text-subtle"> · {hint}</span>}
    </button>
  )
}

// Artifacts of earlier steps, and the fields of one that is a whole result; a click puts it into the field last in
// focus.
function Picker({ upstream, picker }) {
  const insert = name => {
    const target = picker.current
    if (!target) return
    const { el, braces, onChange } = target
    const text = braces ? `{${name}}` : name
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? start
    onChange(el.value.slice(0, start) + text + el.value.slice(end))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + text.length, start + text.length)
    })
  }
  return (
    <div className="space-y-1.5">
      <div className={LABEL}>Artifacts from earlier steps</div>
      {upstream.length === 0 ? (
        <p className="text-[11px] text-subtle">None yet: steps before this one name the artifacts they leave.</p>
      ) : (
        <div className="space-y-1.5">
          {upstream.map(a => (
            <div key={a.name} className="flex flex-wrap items-center gap-1">
              <Chip label={a.name} hint={a.step} title={`From ${a.step}${a.per_node ? ', a value per node' : ', one value'}`} onPick={() => insert(a.name)} />
              {a.fields.map(field => (
                <Chip key={field} label={`.${field}`} title={`${a.name}.${field}`} onPick={() => insert(`${a.name}.${field}`)} quiet />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ExecuteFields({ step, set, picker }) {
  return (
    <Field label="Commands" hint="One per line, run in order. {artifact} is filled in for each node.">
      <Insertable as="textarea" rows={5} braces picker={picker} value={step.commands.join('\n')} onChange={v => set({ commands: v.split('\n') })} placeholder={'show version\nshow interface {iface}'} className={`${MONO} resize-y`} />
    </Field>
  )
}

function ActionFields({ step, set, picker }) {
  const action = ACTIONS[step.action] ?? { params: [] }
  const setParam = key => value => set({ params: { ...step.params, [key]: value } })
  return (
    <>
      <Field label="Action">
        <select value={step.action} onChange={e => set({ action: e.target.value, params: {} })} className={INPUT}>
          {!ACTIONS[step.action] && <option value={step.action}>{step.action}</option>}
          {Object.entries(ACTIONS).map(([key, a]) => <option key={key} value={key}>{a.label}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        {action.params.map(p => (
          <Field key={p.key} label={p.label} hint={p.hint}>
            <Insertable braces picker={picker} value={String(step.params[p.key] ?? '')} onChange={setParam(p.key)} placeholder={p.placeholder} className={MONO} />
          </Field>
        ))}
      </div>
    </>
  )
}

function ProbeFields({ step, set, picker }) {
  return (
    <>
      <Field label="Address" hint="Empty pings each chosen node's management IP. An address with no nodes is pinged once.">
        <Insertable braces picker={picker} value={step.address ?? ''} onChange={v => set({ address: v || null })} placeholder="Management IP, or 10.0.0.1 or {new_ip}" className={MONO} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Count" hint="1–100"><input type="number" min={1} max={100} value={step.count} onChange={e => set({ count: Number(e.target.value) })} className={INPUT} /></Field>
        <Field label="Timeout" hint="Seconds per reply"><input type="number" min={1} max={60} value={step.timeout} onChange={e => set({ timeout: Number(e.target.value) })} className={INPUT} /></Field>
      </div>
    </>
  )
}

function AssertFields({ step, set, picker }) {
  return (
    <>
      <Field label="Checks" hint="One per line. A check that reads per-node values must hold on every node.">
        <Insertable as="textarea" rows={4} picker={picker} value={step.checks.join('\n')} onChange={v => set({ checks: v.split('\n') })} placeholder={'percent(reachable) >= 95\nversion == "17.9.4"'} className={`${MONO} resize-y`} />
      </Field>
      <Field label="Passes when">
        <select value={step.require} onChange={e => set({ require: e.target.value })} className={INPUT}>
          <option value="all">All checks pass</option>
          <option value="any">Any check passes</option>
        </select>
      </Field>
    </>
  )
}

function ConditionFields({ step, set, picker }) {
  return (
    <Field label="Condition" hint="One answer for the run: read per-node values through all(), any(), percent() or count().">
      <Insertable picker={picker} value={step.check} onChange={v => set({ check: v })} placeholder="all(reachable)" className={MONO} />
    </Field>
  )
}

function WaitFields({ step, set }) {
  return (
    <Field label="Seconds" hint={step.seconds >= 60 ? `${Math.floor(step.seconds / 60)} min ${step.seconds % 60} s` : 'Up to 7 days'}>
      <input type="number" min={1} max={604800} value={step.seconds} onChange={e => set({ seconds: Number(e.target.value) })} className={INPUT} />
    </Field>
  )
}

const FIELDS = { execute: ExecuteFields, action: ActionFields, probe: ProbeFields, compute: null, assert: AssertFields, condition: ConditionFields, wait: WaitFields }

// The artifacts a step leaves: each a name later steps read it by, and an expression over `result`, what the step
// just did. A name must be unique in the workflow; `taken` holds those of the other steps.
function Artifacts({ step, set, picker, taken }) {
  const kind = STEP_TYPES[step.type]
  const rows = step.artifacts
  const setRow = (i, patch) => set({ artifacts: rows.map((row, j) => (j === i ? { ...row, ...patch } : row)) })
  const problem = (name, i) => {
    if (!name) return null
    if (!NAME_PATTERN.test(name)) return 'Letters, digits and _, not starting with a digit'
    if (RESERVED.includes(name)) return 'A word of the expression language'
    if (taken.includes(name) || rows.some((row, j) => j !== i && row.name === name)) return 'Another artifact has this name'
    return null
  }
  return (
    <div className="space-y-2">
      <div className={LABEL}>Leaves artifacts</div>
      {kind.result && (
        <p className="text-[10px] text-subtle">
          Leave the expression empty to keep all of what this step did, or pick from <code className="text-content">{kind.result}</code>.
        </p>
      )}
      {rows.map((row, i) => (
        <div key={i} className="space-y-1">
          <div className="flex gap-2">
            <input value={row.name} onChange={e => setRow(i, { name: e.target.value })} placeholder="name" className={`${BOX} font-mono w-36 shrink-0`} />
            <Insertable picker={picker} value={row.expression} onChange={v => setRow(i, { expression: v })} placeholder={kind.result ? 'Empty: all of result' : 'column(lines(output, "down"), 1)'} className={`${BOX} font-mono flex-1 min-w-0`} />
            <button type="button" onClick={() => set({ artifacts: rows.filter((_, j) => j !== i) })} className="text-subtle hover:text-red-400" title="Remove"><X size={13} /></button>
          </div>
          {problem(row.name, i) && <p className="text-[10px] text-red-400">{problem(row.name, i)}</p>}
        </div>
      ))}
      <button type="button" onClick={() => set({ artifacts: [...rows, { name: '', expression: '' }] })} className="flex items-center gap-1 text-[11px] text-brand hover:underline">
        <Plus size={11} /> Add artifact
      </button>
    </div>
  )
}

// How expressions read artifacts, folded away until asked for.
function ExpressionHelp() {
  const [open, setOpen] = useState(false)
  return (
    <div className="text-[11px] text-subtle">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center gap-1 hover:text-content">
        <ChevronRight size={11} className={`transition-transform ${open ? 'rotate-90' : ''}`} /> Expressions
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 pl-4 leading-relaxed">
          <div>An artifact is read by its name, node by node: <code className="text-content">reachable</code>, <code className="text-content">ping.rtt_avg_ms</code>; one named node: <code className="text-content">config[core-1]</code>.</div>
          <div>Compare with <code className="text-content">== != &lt; &lt;= &gt; &gt;= contains matches</code>, combine with <code className="text-content">and or not</code>.</div>
          <div>Functions: <code className="text-content">regex(text, pattern) lines(text, pattern) count(text, pattern) column(text, n, sep)</code>; across nodes <code className="text-content">all(x) any(x) percent(x) count(x)</code>.</div>
          <div>In commands, params and addresses, put expressions in braces: <code className="text-content">show interface {'{iface}'}</code>.</div>
        </div>
      )}
    </div>
  )
}

// A step's own fields, the artifacts it leaves, and the artifacts it can read. Changes go straight to `onChange`.
export default function StepForm({ step, upstream, taken, onChange }) {
  const picker = useRef(null)
  const set = patch => onChange({ ...step, ...patch })
  const Fields = FIELDS[step.type]
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-subtle">{STEP_TYPES[step.type].about}</p>
      {step.type !== 'wait' && <Picker upstream={upstream} picker={picker} />}
      {Fields && <Fields step={step} set={set} picker={picker} />}
      {step.type !== 'wait' && <Artifacts step={step} set={set} picker={picker} taken={taken} />}
      {step.type !== 'wait' && <ExpressionHelp />}
    </div>
  )
}
