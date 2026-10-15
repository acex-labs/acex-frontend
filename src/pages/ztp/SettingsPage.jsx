import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Copy, Download, FileCode, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  fetchMethods, updateMethod,
  fetchVendorClasses, createVendorClass, updateVendorClass, deleteVendorClass,
  fetchDhcpScopes, createDhcpScope, updateDhcpScope, deleteDhcpScope,
  fetchKeaConfig,
} from '../../api/ztp'
import { fetchDrivers } from '../../api/configComponents'
import { formatTime } from '../../components/jobs/jobs'
import PageHeader from '../../components/ui/PageHeader'

const TABS = [
  { key: 'methods', label: 'Methods' },
  { key: 'method-mapping', label: 'Method mapping' },
  { key: 'dhcp-scopes', label: 'DHCP scopes' },
]

const INPUT_CLS = 'h-7 px-2 text-xs rounded border border-edge bg-surface-hi text-content placeholder:text-subtle focus:outline-none focus:border-brand/50 disabled:opacity-50'
const LABEL_CLS = 'block mb-1 text-[10px] font-semibold uppercase tracking-wider text-subtle'

function ErrorText({ error }) {
  if (!error) return null
  // A request validation error carries a list of field errors; the first one says enough.
  const [first] = Array.isArray(error.detail) ? error.detail : []
  const text = typeof error.detail === 'string' ? error.detail
    : first ? `${first.loc?.at(-1)}: ${first.msg}` : error.message
  return <p className="text-[11px] text-red-400">{text}</p>
}

function Warning({ children }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
      <AlertTriangle size={11} /> {children}
    </span>
  )
}

function LastChanged({ item }) {
  if (!item.updated_at) return '—'
  return <>{formatTime(item.updated_at)}{item.updated_by && ` by ${item.updated_by}`}</>
}

// Remounted (by key) whenever the method changes on the server, so the form always starts from what is saved.
function MethodSettings({ method, neds }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    ned: method.ned ?? '',
    bootstrap_username: method.bootstrap_username ?? '',
    bootstrap_password: method.bootstrap_password ?? '',
  })
  const mutation = useMutation({
    mutationFn: () => updateMethod(method.method, {
      ned: form.ned || null,
      bootstrap_username: form.bootstrap_username.trim() || null,
      bootstrap_password: form.bootstrap_password || null,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ztp', 'methods'] }),
  })
  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))
  const changed = form.ned !== (method.ned ?? '')
    || form.bootstrap_username.trim() !== (method.bootstrap_username ?? '')
    || form.bootstrap_password !== (method.bootstrap_password ?? '')
  // A chosen NED that the backend no longer has is still shown, so it can be seen and replaced.
  const missing = method.ned && !neds.some(n => n.name === method.ned)

  return (
    <div className="px-6 py-5 max-w-lg space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-heading">{method.label}</h2>
        <p className="font-mono text-[11px] text-subtle">{method.method}</p>
      </div>

      <div>
        <label className={LABEL_CLS}>NED</label>
        <select value={form.ned} onChange={set('ned')} disabled={mutation.isPending} className={`${INPUT_CLS} w-72`}>
          <option value="">— None —</option>
          {missing && <option value={method.ned}>{method.ned} (not installed)</option>}
          {neds.map(n => <option key={n.name} value={n.name}>{n.name} {n.version}</option>)}
        </select>
      </div>

      <div>
        <label
          className={LABEL_CLS}
          title="Public: anyone who fetches the bootstrap can read it. Rotated during onboarding."
        >
          Bootstrap login
        </label>
        <div className="flex gap-1.5">
          <input
            value={form.bootstrap_username}
            onChange={set('bootstrap_username')}
            placeholder="Username"
            autoComplete="off"
            disabled={mutation.isPending}
            className={`${INPUT_CLS} w-36`}
          />
          <input
            value={form.bootstrap_password}
            onChange={set('bootstrap_password')}
            placeholder="Password"
            autoComplete="off"
            spellCheck={false}
            disabled={mutation.isPending}
            className={`${INPUT_CLS} w-36 font-mono`}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => mutation.mutate()}
          disabled={!changed || mutation.isPending}
          className="px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
        >
          Save
        </button>
        <ErrorText error={mutation.error} />
      </div>

      <p className="text-[11px] text-subtle">Last changed <LastChanged item={method} /></p>
    </div>
  )
}

function MethodsTab({ selected, onSelect }) {
  const methods = useQuery({ queryKey: ['ztp', 'methods'], queryFn: fetchMethods })
  const neds = useQuery({ queryKey: ['neds'], queryFn: fetchDrivers })

  if (methods.isLoading || neds.isLoading) {
    return <p className="p-6 text-xs text-subtle animate-pulse">Loading…</p>
  }
  if (methods.isError || neds.isError) {
    return <p className="p-6 text-xs text-red-400">Could not load {methods.isError ? 'ZTP methods' : 'NEDs'}.</p>
  }
  const current = methods.data.find(m => m.method === selected) ?? methods.data[0]

  return (
    <div className="flex h-full">
      <ul className="w-64 shrink-0 border-r border-edge overflow-auto">
        {methods.data.map(m => (
          <li key={m.method}>
            <button
              onClick={() => onSelect(m.method)}
              className={[
                'w-full px-4 py-2.5 text-left border-l-2 transition-colors',
                m.method === current?.method ? 'border-brand bg-surface-hi' : 'border-transparent hover:bg-surface-hi',
              ].join(' ')}
            >
              <div className="flex items-center gap-1.5 text-xs text-content">
                {m.label}
                {m.is_default && <span className="px-1.5 rounded bg-brand/15 text-[10px] text-brand">Default</span>}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-2">
                {!m.ned && <Warning>No NED</Warning>}
                {(!m.bootstrap_username || !m.bootstrap_password) && <Warning>No login</Warning>}
              </div>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex-1 overflow-auto">
        {current && <MethodSettings key={`${current.method}:${current.updated_at}`} method={current} neds={neds.data} />}
      </div>
    </div>
  )
}

const MATCHES = [{ value: 'exact', label: 'Exact' }, { value: 'prefix', label: 'Starts with' }]

function MatchSelect({ value, onChange, disabled }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className={`${INPUT_CLS} w-28`}>
      {MATCHES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
    </select>
  )
}

function MethodSelect({ value, methods, onChange, disabled, emptyLabel = '— Unmapped —' }) {
  return (
    <select value={value ?? ''} onChange={e => onChange(e.target.value || null)} disabled={disabled} className={`${INPUT_CLS} w-56`}>
      <option value="">{emptyLabel}</option>
      {methods.map(m => <option key={m.method} value={m.method}>{m.label}</option>)}
    </select>
  )
}

function AddVendorClass({ methods }) {
  const queryClient = useQueryClient()
  const [vendorClass, setVendorClass] = useState('')
  const [match, setMatch] = useState('exact')
  const [method, setMethod] = useState(null)
  const mutation = useMutation({
    mutationFn: () => createVendorClass({ vendor_class: vendorClass.trim(), match, method }),
    onSuccess: () => {
      setVendorClass('')
      setMatch('exact')
      setMethod(null)
      queryClient.invalidateQueries({ queryKey: ['ztp', 'vendor-classes'] })
    },
  })
  return (
    <form
      onSubmit={e => { e.preventDefault(); mutation.mutate() }}
      className="px-6 py-3 border-b border-edge flex flex-wrap items-center gap-1.5"
    >
      <MatchSelect value={match} onChange={setMatch} disabled={mutation.isPending} />
      <input
        value={vendorClass}
        onChange={e => setVendorClass(e.target.value)}
        placeholder="Vendor class"
        autoComplete="off"
        spellCheck={false}
        disabled={mutation.isPending}
        className={`${INPUT_CLS} w-56 font-mono`}
      />
      <MethodSelect value={method} methods={methods} onChange={setMethod} disabled={mutation.isPending} />
      <button
        type="submit"
        disabled={!vendorClass.trim() || mutation.isPending}
        className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
      >
        <Plus size={12} /> Add
      </button>
      <ErrorText error={mutation.error} />
    </form>
  )
}

function VendorClassRow({ vendorClass, methods }) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ztp', 'vendor-classes'] })
  const update = useMutation({ mutationFn: changes => updateVendorClass(vendorClass.id, changes), onSuccess: invalidate })
  const remove = useMutation({ mutationFn: () => deleteVendorClass(vendorClass.id), onSuccess: invalidate })
  return (
    <tr className="border-b border-edge align-top">
      <td className="px-6 py-2.5">
        <MatchSelect value={vendorClass.match} onChange={match => update.mutate({ match })} disabled={update.isPending} />
      </td>
      <td className="px-6 py-2.5 font-mono text-xs text-content">{vendorClass.vendor_class}</td>
      <td className="px-6 py-2.5">
        <MethodSelect value={vendorClass.method} methods={methods} onChange={method => update.mutate({ method })} disabled={update.isPending} />
        <ErrorText error={update.error} />
      </td>
      <td className="px-6 py-2.5 text-[11px] text-subtle"><LastChanged item={vendorClass} /></td>
      <td className="px-6 py-2.5 text-right">
        <button
          onClick={() => remove.mutate()}
          disabled={remove.isPending}
          title="Delete"
          className="p-1 rounded text-subtle hover:text-red-400 disabled:opacity-40 transition-colors"
        >
          <Trash2 size={12} />
        </button>
        <ErrorText error={remove.error} />
      </td>
    </tr>
  )
}

// Devices whose vendor class matches no mapping get the default method's bootstrap, or none without one.
function DefaultMethod({ methods }) {
  const queryClient = useQueryClient()
  const current = methods.find(m => m.is_default)
  const mutation = useMutation({
    mutationFn: method => method ? updateMethod(method, { is_default: true }) : updateMethod(current.method, { is_default: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ztp', 'methods'] }),
  })
  return (
    <div className="px-6 py-3 border-b border-edge flex flex-wrap items-center gap-1.5">
      <span className="w-[22rem]">
        <span className="block text-xs text-content">Default method</span>
        <span className="block text-[11px] text-subtle">For devices that match no vendor class below</span>
      </span>
      <MethodSelect
        value={current?.method}
        methods={methods}
        onChange={m => mutation.mutate(m)}
        disabled={mutation.isPending}
        emptyLabel="— No bootstrap —"
      />
      <ErrorText error={mutation.error} />
    </div>
  )
}

function MethodMappingTab() {
  const vendorClasses = useQuery({ queryKey: ['ztp', 'vendor-classes'], queryFn: fetchVendorClasses })
  const methods = useQuery({ queryKey: ['ztp', 'methods'], queryFn: fetchMethods })

  if (vendorClasses.isLoading || methods.isLoading) {
    return <p className="p-6 text-xs text-subtle animate-pulse">Loading…</p>
  }
  if (vendorClasses.isError || methods.isError) {
    return <p className="p-6 text-xs text-red-400">Could not load vendor classes.</p>
  }
  return (
    <div className="h-full overflow-auto">
      <DefaultMethod methods={methods.data} />
      <AddVendorClass methods={methods.data} />
      {vendorClasses.data.length === 0 ? (
        <p className="px-6 py-4 text-xs text-subtle">No vendor classes yet.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-edge">
              {['Match', 'Vendor class', 'Method', 'Last changed', ''].map(h => (
                <th key={h} className="px-6 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-subtle">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vendorClasses.data.map(v => <VendorClassRow key={v.id} vendorClass={v} methods={methods.data} />)}
          </tbody>
        </table>
      )}
    </div>
  )
}

const SCOPE_FIELDS = [
  { key: 'network', placeholder: 'Network (10.10.0.0/24)', width: 'w-40' },
  { key: 'pool_start', placeholder: 'Pool start', width: 'w-28' },
  { key: 'pool_end', placeholder: 'Pool end', width: 'w-28' },
  { key: 'gateway', placeholder: 'Gateway', width: 'w-28' },
  { key: 'dns_servers', placeholder: 'DNS servers', width: 'w-48' },
  { key: 'domain_name', placeholder: 'Domain', width: 'w-32' },
  { key: 'description', placeholder: 'Description', width: 'w-48' },
]

// Add a scope, or edit one (scope given). DNS servers are typed as one comma-separated field.
function ScopeForm({ scope, onDone }) {
  const queryClient = useQueryClient()
  const blank = Object.fromEntries(SCOPE_FIELDS.map(f => [f.key, '']))
  const [form, setForm] = useState(scope
    ? { ...blank, ...scope, dns_servers: scope.dns_servers.join(', '), domain_name: scope.domain_name ?? '', description: scope.description ?? '' }
    : blank)
  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        network: form.network.trim(),
        pool_start: form.pool_start.trim(),
        pool_end: form.pool_end.trim(),
        gateway: form.gateway.trim(),
        dns_servers: form.dns_servers.split(/[\s,]+/).filter(Boolean),
        domain_name: form.domain_name.trim() || null,
        description: form.description.trim() || null,
      }
      return scope ? updateDhcpScope(scope.id, body) : createDhcpScope(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ztp', 'dhcp-scopes'] })
      if (scope) onDone()
      else setForm(blank)
    },
  })
  const complete = ['network', 'pool_start', 'pool_end', 'gateway'].every(k => form[k].trim())
  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate() }} className="flex flex-wrap items-center gap-1.5">
      {SCOPE_FIELDS.map(f => (
        <input
          key={f.key}
          value={form[f.key]}
          onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
          placeholder={f.placeholder}
          autoComplete="off"
          spellCheck={false}
          disabled={mutation.isPending}
          className={`${INPUT_CLS} ${f.width} ${['domain_name', 'description'].includes(f.key) ? '' : 'font-mono'}`}
        />
      ))}
      <button
        type="submit"
        disabled={!complete || mutation.isPending}
        className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
      >
        {scope ? 'Save' : <><Plus size={12} /> Add</>}
      </button>
      {scope && (
        <button type="button" onClick={onDone} className="px-2 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors">
          Cancel
        </button>
      )}
      <ErrorText error={mutation.error} />
    </form>
  )
}

function DhcpScopeRow({ scope }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const remove = useMutation({
    mutationFn: () => deleteDhcpScope(scope.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ztp', 'dhcp-scopes'] }),
  })
  if (editing) {
    return (
      <tr className="border-b border-edge">
        <td colSpan={7} className="px-6 py-2.5"><ScopeForm scope={scope} onDone={() => setEditing(false)} /></td>
      </tr>
    )
  }
  return (
    <tr className="border-b border-edge align-top text-xs">
      <td className="px-6 py-2.5 font-mono text-content">{scope.network}</td>
      <td className="px-6 py-2.5 font-mono text-content">{scope.pool_start} – {scope.pool_end}</td>
      <td className="px-6 py-2.5 font-mono text-content">{scope.gateway}</td>
      <td className="px-6 py-2.5 text-content">
        <div className="font-mono">{scope.dns_servers.join(', ') || '—'}</div>
        {scope.domain_name && <div className="text-[11px] text-subtle">{scope.domain_name}</div>}
      </td>
      <td className="px-6 py-2.5 text-subtle">{scope.description}</td>
      <td className="px-6 py-2.5 text-[11px] text-subtle"><LastChanged item={scope} /></td>
      <td className="px-6 py-2.5 text-right whitespace-nowrap">
        <button onClick={() => setEditing(true)} title="Edit" className="p-1 rounded text-subtle hover:text-content transition-colors">
          <Pencil size={12} />
        </button>
        <button
          onClick={() => remove.mutate()}
          disabled={remove.isPending}
          title="Delete"
          className="p-1 rounded text-subtle hover:text-red-400 disabled:opacity-40 transition-colors"
        >
          <Trash2 size={12} />
        </button>
        <ErrorText error={remove.error} />
      </td>
    </tr>
  )
}

function DhcpScopesTab() {
  const scopes = useQuery({ queryKey: ['ztp', 'dhcp-scopes'], queryFn: fetchDhcpScopes })

  if (scopes.isLoading) return <p className="p-6 text-xs text-subtle animate-pulse">Loading…</p>
  if (scopes.isError) return <p className="p-6 text-xs text-red-400">Could not load DHCP scopes.</p>
  return (
    <div className="h-full overflow-auto">
      <div className="px-6 py-3 border-b border-edge"><ScopeForm /></div>
      {scopes.data.length === 0 ? (
        <p className="px-6 py-4 text-xs text-subtle">No DHCP scopes yet.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-edge">
              {['Network', 'Pool', 'Gateway', 'DNS', 'Description', 'Last changed', ''].map(h => (
                <th key={h} className="px-6 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-subtle">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scopes.data.map(scope => <DhcpScopeRow key={scope.id} scope={scope} />)}
          </tbody>
        </table>
      )}
    </div>
  )
}

// Rendered when opened, so it always reflects what is saved now.
function KeaConfigModal({ onClose }) {
  const config = useQuery({ queryKey: ['ztp', 'kea'], queryFn: fetchKeaConfig, gcTime: 0 })
  const [copied, setCopied] = useState(false)
  const text = config.data ? JSON.stringify(config.data, null, 2) : ''
  const download = () => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    link.download = 'kea-dhcp4.json'
    link.click()
    URL.revokeObjectURL(link.href)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-surface border border-edge rounded-lg w-[760px] max-w-[calc(100vw-2rem)] h-[80vh] flex flex-col shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-edge shrink-0">
          <h2 className="text-sm font-semibold text-content">Kea config</h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true))}
              disabled={!text}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs border border-edge text-subtle hover:text-content disabled:opacity-40 transition-colors"
            >
              <Copy size={11} /> {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={download}
              disabled={!text}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs border border-edge text-subtle hover:text-content disabled:opacity-40 transition-colors"
            >
              <Download size={11} /> Download
            </button>
            <button onClick={onClose} className="ml-1 text-subtle hover:text-content transition-colors"><X size={14} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {config.isLoading && <p className="p-4 text-xs text-subtle animate-pulse">Rendering…</p>}
          {config.isError && <div className="p-4"><ErrorText error={config.error} /></div>}
          {text && <pre className="p-4 font-mono text-[11px] leading-relaxed text-content">{text}</pre>}
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'methods'
  const [showKea, setShowKea] = useState(false)
  const setParam = (key, value) => setSearchParams(prev => {
    const next = new URLSearchParams(prev)
    next.set(key, value)
    return next
  }, { replace: true })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="ZTP Settings"
        actions={
          <button
            onClick={() => setShowKea(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors"
          >
            <FileCode size={12} /> Kea config
          </button>
        }
      />

      <div className="flex border-b border-edge px-4 shrink-0">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setParam('tab', key)}
            className={[
              'px-3 py-2 text-xs border-b-2 -mb-px transition-colors',
              activeTab === key ? 'border-brand text-content' : 'border-transparent text-subtle hover:text-content',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'methods' && (
          <MethodsTab selected={searchParams.get('method')} onSelect={m => setParam('method', m)} />
        )}
        {activeTab === 'method-mapping' && <MethodMappingTab />}
        {activeTab === 'dhcp-scopes' && <DhcpScopesTab />}
      </div>

      {showKea && <KeaConfigModal onClose={() => setShowKea(false)} />}
    </div>
  )
}
