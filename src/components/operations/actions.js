import { useQuery } from '@tanstack/react-query'
import { fetchActions } from '../../api/operations'

// The actions the API lists, all from devkit's one list: each with its label, the JSON schemas of its params and
// result, and for a result of rows, which field holds them and their columns. Standard Actions and workflow steps
// both read them here.
export function useActions() {
  const { data: actions = [], isLoading } = useQuery({ queryKey: ['actions'], queryFn: fetchActions, staleTime: Infinity })
  return { actions, byName: Object.fromEntries(actions.map(a => [a.name, a])), isLoading }
}

// The action a run of an action ran, from its type: acex.operations.actions.<name>.
export const actionOfRun = type => (type?.startsWith('acex.operations.actions.') ? type.split('.').pop() : null)

// Words written otherwise in a label; units left out, since a value shows its own.
const WORDS = { ip: 'IP', mac: 'MAC', vrf: 'VRF', vlan: 'VLAN', vlans: 'VLANs', ttl: 'TTL', rtt: 'RTT', mbps: '', ms: '', seconds: '' }

// A field's name as a label: max_entries gives "Max entries", vrf "VRF", rtt_ms "RTT".
export function humanize(key) {
  const words = key.split('_').map(w => WORDS[w] ?? w).filter(Boolean)
  const [first = key, ...rest] = words
  return [first === first.toLowerCase() ? first[0].toUpperCase() + first.slice(1) : first, ...rest].join(' ')
}

// The non-null type of a schema property that may be null.
const typeOf = prop => (prop.anyOf ?? [prop]).find(t => t.type !== 'null') ?? {}

// An action's params as form fields, required ones first and max_entries last. `kind` is integer, number, string,
// boolean, enum or list; a list is typed as text, "10, 20".
export function paramFields(action) {
  const schema = action?.params ?? { properties: {} }
  const required = schema.required ?? []
  const order = key => (required.includes(key) ? 0 : key === 'max_entries' ? 2 : 1)
  return Object.entries(schema.properties ?? {})
    .map(([key, prop]) => {
      const type = typeOf(prop)
      const range = type.minimum != null && type.maximum != null ? `${type.minimum}–${type.maximum}` : null
      // The API says None for a field left out; in a form it is left empty.
      const about = prop.description?.replace(/(^|\. )None\b/g, '$1Empty').replace(/\bNone\b/g, 'empty')
      return {
        key,
        label: humanize(key),
        hint: [range, about].filter(Boolean).join(' · '),
        kind: type.type === 'array' ? 'list' : type.enum ? 'enum' : type.type ?? 'string',
        items: type.items?.type,
        options: type.enum,
        required: required.includes(key),
        default: prop.default ?? null,
        min: type.minimum,
        max: type.maximum,
      }
    })
    .sort((a, b) => order(a.key) - order(b.key))
}

// A form's values to start from: each field's default, as text.
export function formDefaults(fields) {
  return Object.fromEntries(fields.map(f => [f.key, f.default == null ? '' : Array.isArray(f.default) ? f.default.join(', ') : String(f.default)]))
}

// Whether every required field has a value.
export const formReady = (fields, values) => fields.every(f => !f.required || String(values[f.key] ?? '').trim() !== '')

// A form's values as the API takes them: numbers as numbers, a list split on commas, empty fields left out so the
// API's defaults apply.
export function formParams(fields, values) {
  const params = {}
  for (const f of fields) {
    const text = String(values[f.key] ?? '').trim()
    if (text === '') continue
    if (f.kind === 'integer' || f.kind === 'number') params[f.key] = Number(text)
    else if (f.kind === 'boolean') params[f.key] = text === 'true'
    else if (f.kind === 'list') params[f.key] = text.split(/[\s,]+/).filter(Boolean).map(v => (f.items === 'integer' ? Number(v) : v))
    else params[f.key] = text
  }
  return params
}

// The fields of an action's result, for a workflow artifact that is all of it.
export const resultFields = action => Object.keys(action?.result?.properties ?? {})

// Seconds in short: 93600 gives "1d 2h".
function shortSeconds(seconds) {
  if (seconds < 60) return `${seconds}s`
  const parts = [[86400, 'd'], [3600, 'h'], [60, 'm']].reduce(
    ({ left, out }, [size, unit]) => (left >= size ? { left: left % size, out: [...out, `${Math.floor(left / size)}${unit}`] } : { left, out }),
    { left: seconds, out: [] },
  )
  return parts.out.slice(0, 2).join(' ')
}

// A result's value as text, its unit from its field's name: a list's items joined, an object's values in a row,
// and an object with nothing in it, such as a probe nobody answered, as *.
export function formatValue(value, key = '') {
  if (value == null) return '—'
  if (Array.isArray(value)) return value.length ? value.map(v => formatValue(v)).join(', ') : '—'
  if (typeof value === 'object') {
    const parts = Object.entries(value).filter(([, v]) => v != null).map(([k, v]) => formatValue(v, k))
    return parts.length ? parts.join(' ') : '*'
  }
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (key.endsWith('_seconds')) return shortSeconds(value)
  if (key.endsWith('_ms')) return `${value} ms`
  if (key.endsWith('_mbps')) return value >= 1000 ? `${value / 1000} Gb/s` : `${value} Mb/s`
  return String(value)
}

// An action's answer in one line: how many rows, and whether they were cut, found or reached.
export function actionSummary(result, action) {
  if ('sent' in result) return `${result.received}/${result.sent} received · ${result.success_rate}%`
  const parts = []
  if (action?.rows) {
    const rows = result[action.rows] ?? []
    if (!('found' in result) || result.found) {
      parts.push(`${rows.length}${result.truncated ? ` of ${result.total}` : ''} ${humanize(action.rows).toLowerCase()}`)
    }
  }
  if ('found' in result) parts.push(result.found ? 'found' : 'not found')
  if ('reached' in result) parts.push(result.reached ? 'reached' : 'not reached')
  if (typeof result.config === 'string') parts.push(`${result.config.split('\n').length} lines`)
  return parts.join(' · ') || null
}
