import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import {
  fetchSoftwarePolicies, fetchVersionsInUse, createSoftwarePolicy, updateSoftwarePolicy, deleteSoftwarePolicy,
} from '../../api/policies'
import { fetchPlatforms } from '../../api/inventory'
import { formatTime } from '../../components/jobs/jobs'
import PageHeader from '../../components/ui/PageHeader'

// One tab per policy type.
const TABS = [
  { key: 'software', label: 'Software' },
]

const INPUT_CLS = 'h-7 px-2 text-xs rounded border border-edge bg-surface-hi text-content placeholder:text-subtle focus:outline-none focus:border-brand/50 disabled:opacity-50'
const BTN_CLS = 'px-2 py-0.5 rounded text-[10px] border border-edge text-subtle hover:text-content disabled:opacity-40 transition-colors'

function ErrorText({ error }) {
  if (!error) return null
  // A request validation error carries a list of field errors; the first one says enough.
  const [first] = Array.isArray(error.detail) ? error.detail : []
  const text = typeof error.detail === 'string' ? error.detail
    : first ? first.msg.replace(/^Value error, /, '') : error.message
  return <p className="text-[11px] text-red-400">{text}</p>
}

function LastChanged({ item }) {
  if (!item.updated_at) return '—'
  return <>{formatTime(item.updated_at)}{item.updated_by && ` by ${item.updated_by}`}</>
}

// The models a policy may name: enabled ones an installed NED supports, by vendor.
function offeredModels(platforms) {
  return platforms.vendors
    .map(v => ({ vendor: v.vendor, models: v.hardware_models.filter(m => m.enabled && m.supported_os.length > 0) }))
    .filter(v => v.models.length > 0)
}

// The OSes to offer: the model's supported ones, or every supported OS of the vendor's offered models.
function offeredOs(vendorEntry, hardwareModel) {
  const models = vendorEntry?.models ?? []
  const chosen = models.find(m => m.hardware_model === hardwareModel)
  return [...new Set((chosen ? [chosen] : models).flatMap(m => m.supported_os))].sort()
}

const sameTarget = (a, b) => a.vendor === b.vendor && (a.hardware_model ?? '') === (b.hardware_model ?? '')

function AddVersion({ offered, versions, examples }) {
  const queryClient = useQueryClient()
  const blank = { vendor: offered[0].vendor, hardware_model: '', os: '', os_version: '', golden: false }
  const [form, setForm] = useState(blank)
  const vendorEntry = offered.find(v => v.vendor === form.vendor)
  const osOptions = offeredOs(vendorEntry, form.hardware_model)
  const os = osOptions.includes(form.os) ? form.os : osOptions.length === 1 ? osOptions[0] : ''
  const example = examples?.[os]?.[0]
  const golden = versions.find(v => v.golden && sameTarget(v, form))
  // What the inventory runs, less what is already approved here.
  const inUse = useQuery({
    queryKey: ['policies', 'software', 'versions', form.vendor, form.hardware_model, os],
    queryFn: () => fetchVersionsInUse({ vendor: form.vendor, os, hardware_model: form.hardware_model }),
    enabled: !!os,
  })
  const approved = new Set(versions.filter(v => sameTarget(v, form) && v.os === os).map(v => v.os_version))
  const suggestions = (inUse.data ?? []).filter(v => !approved.has(v.os_version))

  const mutation = useMutation({
    mutationFn: () => createSoftwarePolicy({
      vendor: form.vendor,
      hardware_model: form.hardware_model || null,
      os,
      os_version: form.os_version.trim(),
      golden: form.golden && !golden,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies', 'software'] })
      setForm(f => ({ ...f, os_version: '', golden: false }))
    },
  })
  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))
  // Another vendor has other models: start over from every model.
  const setVendor = e => setForm(f => ({ ...f, vendor: e.target.value, hardware_model: '', os: '' }))

  return (
    <form onSubmit={e => { e.preventDefault(); mutation.mutate() }} className="flex flex-wrap items-center gap-1.5">
      <select value={form.vendor} onChange={setVendor} disabled={mutation.isPending} className={`${INPUT_CLS} w-28`}>
        {offered.map(v => <option key={v.vendor} value={v.vendor}>{v.vendor}</option>)}
      </select>
      <select value={form.hardware_model} onChange={set('hardware_model')} disabled={mutation.isPending} className={`${INPUT_CLS} w-44`}>
        <option value="">— Every model —</option>
        {vendorEntry?.models.map(m => <option key={m.hardware_model} value={m.hardware_model}>{m.hardware_model}</option>)}
      </select>
      <select value={os} onChange={set('os')} disabled={mutation.isPending} className={`${INPUT_CLS} w-36`}>
        {osOptions.length !== 1 && <option value="">— OS —</option>}
        {osOptions.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <input
        value={form.os_version}
        onChange={set('os_version')}
        placeholder={example ? `Version (${example})` : 'Version'}
        list="software-versions-in-use"
        autoComplete="off"
        spellCheck={false}
        disabled={mutation.isPending}
        className={`${INPUT_CLS} w-36 font-mono`}
      />
      <datalist id="software-versions-in-use">
        {suggestions.map(v => (
          <option key={v.os_version} value={v.os_version}>
            {v.assets} {v.assets === 1 ? 'asset' : 'assets'}
          </option>
        ))}
      </datalist>
      <label
        className={`inline-flex items-center gap-1 text-xs ${golden ? 'text-subtle' : 'text-content'}`}
        title={golden ? `Golden already set: ${golden.os} ${golden.os_version}` : 'The version to aim for'}
      >
        <input
          type="checkbox"
          checked={form.golden && !golden}
          onChange={e => setForm(f => ({ ...f, golden: e.target.checked }))}
          disabled={!!golden || mutation.isPending}
        />
        Golden
      </label>
      <button
        type="submit"
        disabled={!os || !form.os_version.trim() || mutation.isPending}
        className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
      >
        <Plus size={12} /> Approve
      </button>
      {golden && <span className="text-[11px] text-subtle">Golden already set: <span className="font-mono">{golden.os_version}</span></span>}
      <ErrorText error={mutation.error} />
    </form>
  )
}

function VersionRow({ version, golden }) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['policies', 'software'] })
  const update = useMutation({ mutationFn: changes => updateSoftwarePolicy(version.id, changes), onSuccess: invalidate })
  const remove = useMutation({ mutationFn: () => deleteSoftwarePolicy(version.id), onSuccess: invalidate })
  return (
    <tr className="border-b border-edge/50 last:border-0 align-top text-xs">
      <td className="px-6 py-2 font-mono text-content">{version.os}</td>
      <td className="px-6 py-2 font-mono text-content">{version.os_version}</td>
      <td className="px-6 py-2">
        {version.golden
          ? <span className="px-1.5 py-0.5 rounded bg-amber-400/15 text-[10px] font-medium text-amber-400">Golden</span>
          : <span className="text-[11px] text-subtle">Accepted</span>}
      </td>
      <td className="px-6 py-2 text-[11px] text-subtle"><LastChanged item={version} /></td>
      <td className="px-6 py-2 text-right whitespace-nowrap">
        {version.golden ? (
          <button onClick={() => update.mutate({ golden: false })} disabled={update.isPending} className={BTN_CLS}>
            Make accepted
          </button>
        ) : (
          <button
            onClick={() => update.mutate({ golden: true })}
            disabled={!!golden || update.isPending}
            title={golden ? `Golden already set: ${golden.os} ${golden.os_version}` : undefined}
            className={BTN_CLS}
          >
            Make golden
          </button>
        )}
        <button
          onClick={() => remove.mutate()}
          disabled={remove.isPending}
          title="Withdraw"
          className="ml-1 p-1 rounded text-subtle hover:text-red-400 disabled:opacity-40 transition-colors"
        >
          <Trash2 size={12} />
        </button>
        <ErrorText error={update.error ?? remove.error} />
      </td>
    </tr>
  )
}

// The versions of one vendor, or one hardware model, in the order the backend lists them: golden first.
function groupVersions(versions) {
  const groups = []
  for (const version of versions) {
    const group = groups.at(-1)
    if (group && sameTarget(group, version)) group.versions.push(version)
    else groups.push({ vendor: version.vendor, hardware_model: version.hardware_model, versions: [version] })
  }
  return groups
}

function SoftwareTab() {
  const versions = useQuery({ queryKey: ['policies', 'software'], queryFn: fetchSoftwarePolicies })
  const platforms = useQuery({ queryKey: ['platforms'], queryFn: fetchPlatforms })

  if (versions.isLoading || platforms.isLoading) return <p className="p-6 text-xs text-subtle animate-pulse">Loading…</p>
  if (versions.isError || platforms.isError) {
    return <p className="p-6 text-xs text-red-400">Could not load {versions.isError ? 'the software policy' : 'platforms'}.</p>
  }
  const offered = offeredModels(platforms.data)
  const groups = groupVersions(versions.data)

  return (
    <div className="h-full overflow-auto">
      <div className="px-6 py-3 border-b border-edge space-y-2">
        <p className="text-[11px] text-subtle">
          The versions approved for each vendor, or hardware model, which beats its vendor. A version not approved is
          not allowed; the golden one is the version to aim for.
        </p>
        {offered.length > 0 ? (
          <AddVersion offered={offered} versions={versions.data} examples={platforms.data.version_examples} />
        ) : (
          <p className="text-xs text-subtle">
            No hardware models enabled. Enable the ones you run under{' '}
            <Link to="/settings/hardware-models" className="text-brand hover:underline">Settings › Hardware models</Link>.
          </p>
        )}
      </div>
      {groups.length === 0 ? (
        <p className="px-6 py-4 text-xs text-subtle">No versions approved yet.</p>
      ) : (
        <div className="p-6 space-y-4">
          {groups.map(group => {
            const golden = group.versions.find(v => v.golden)
            return (
              <div key={`${group.vendor}:${group.hardware_model ?? ''}`} className="bg-surface border border-edge rounded-md overflow-hidden">
                <div className="px-4 py-2.5 border-b border-edge">
                  <h3 className="text-xs font-medium text-content">
                    {group.vendor} <span className="text-subtle">·</span>{' '}
                    {group.hardware_model ?? <span className="text-subtle">Every model</span>}
                  </h3>
                </div>
                <table className="w-full">
                  <tbody>
                    {group.versions.map(v => <VersionRow key={v.id} version={v} golden={golden} />)}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function PoliciesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'software'
  const setTab = key => setSearchParams(prev => {
    const next = new URLSearchParams(prev)
    next.set('tab', key)
    return next
  }, { replace: true })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Policies" description="What the environment is held to. Compliance is measured against these." />

      <div className="flex border-b border-edge px-4 shrink-0">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
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
        {activeTab === 'software' && <SoftwareTab />}
      </div>
    </div>
  )
}
