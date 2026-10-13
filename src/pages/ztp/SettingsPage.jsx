import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { fetchMethods, updateMethod } from '../../api/ztp'
import { fetchDrivers } from '../../api/configComponents'
import { formatTime } from '../../components/jobs/jobs'
import PageHeader from '../../components/ui/PageHeader'

function Section({ title, description, children }) {
  return (
    <section className="border-b border-edge">
      <div className="px-6 pt-5 pb-3">
        <h2 className="text-xs font-semibold text-heading">{title}</h2>
        {description && <p className="mt-0.5 text-[11px] text-subtle max-w-2xl">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function NedSelect({ method, neds }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ned => updateMethod(method.method, { ned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ztp', 'methods'] }),
  })
  // A chosen NED that the backend no longer has is still shown, so it can be seen and replaced.
  const missing = method.ned && !neds.some(n => n.name === method.ned)
  return (
    <span className="inline-flex flex-col gap-1">
      <select
        value={method.ned ?? ''}
        onChange={e => mutation.mutate(e.target.value || null)}
        disabled={mutation.isPending}
        className="h-7 px-2 text-xs rounded border border-edge bg-surface-hi text-content focus:outline-none focus:border-brand/50 disabled:opacity-50"
      >
        <option value="">— None —</option>
        {missing && <option value={method.ned}>{method.ned} (not installed)</option>}
        {neds.map(n => <option key={n.name} value={n.name}>{n.name} {n.version}</option>)}
      </select>
      {mutation.isError && (
        <span className="text-[11px] text-red-400">{mutation.error.detail ?? mutation.error.message}</span>
      )}
    </span>
  )
}

const INPUT_CLS = 'h-7 w-36 px-2 text-xs rounded border border-edge bg-surface-hi text-content placeholder:text-subtle focus:outline-none focus:border-brand/50 disabled:opacity-50'

// The bootstrap hands this login to any device that asks, so it is shown in the clear.
function BootstrapLogin({ method }) {
  const queryClient = useQueryClient()
  const [username, setUsername] = useState(method.bootstrap_username ?? '')
  const [password, setPassword] = useState(method.bootstrap_password ?? '')
  const mutation = useMutation({
    mutationFn: () => updateMethod(method.method, {
      bootstrap_username: username.trim() || null,
      bootstrap_password: password || null,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ztp', 'methods'] }),
  })
  const changed = username.trim() !== (method.bootstrap_username ?? '') || password !== (method.bootstrap_password ?? '')
  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex items-center gap-1.5">
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Username"
          autoComplete="off"
          disabled={mutation.isPending}
          className={INPUT_CLS}
        />
        <input
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="off"
          spellCheck={false}
          disabled={mutation.isPending}
          className={`${INPUT_CLS} font-mono`}
        />
        <button
          onClick={() => mutation.mutate()}
          disabled={!changed || mutation.isPending}
          className="px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
        >
          Save
        </button>
      </span>
      {mutation.isError && (
        <span className="text-[11px] text-red-400">{mutation.error.detail ?? mutation.error.message}</span>
      )}
    </span>
  )
}

function Methods() {
  const methods = useQuery({ queryKey: ['ztp', 'methods'], queryFn: fetchMethods })
  const neds = useQuery({ queryKey: ['neds'], queryFn: fetchDrivers })

  if (methods.isLoading || neds.isLoading) {
    return <p className="px-6 pb-4 text-xs text-subtle animate-pulse">Loading…</p>
  }
  if (methods.isError) {
    return <p className="px-6 pb-4 text-xs text-red-400">Could not load ZTP methods.</p>
  }
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-y border-edge">
          {['Method', 'NED', 'Bootstrap login', 'Last changed'].map(h => (
            <th key={h} className="px-6 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-subtle">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {methods.data.map(method => (
          <tr key={method.method} className="border-b border-edge last:border-b-0 align-top">
            <td className="px-6 py-3">
              <div className="text-xs text-content">{method.label}</div>
              <div className="mt-0.5 font-mono text-[11px] text-subtle">{method.method}</div>
              <div className="mt-1 text-[11px] text-subtle max-w-md">{method.description}</div>
            </td>
            <td className="px-6 py-3">
              <NedSelect method={method} neds={neds.data ?? []} />
              {!method.ned && (
                <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-400">
                  <AlertTriangle size={11} /> Discovery fails until a NED is chosen
                </div>
              )}
            </td>
            <td className="px-6 py-3">
              <BootstrapLogin method={method} />
              {(!method.bootstrap_username || !method.bootstrap_password) && (
                <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-400">
                  <AlertTriangle size={11} /> Devices get no bootstrap until a login is set
                </div>
              )}
            </td>
            <td className="px-6 py-3 text-[11px] text-subtle">
              {method.updated_at ? (
                <>
                  {formatTime(method.updated_at)}
                  {method.updated_by && <div>by {method.updated_by}</div>}
                </>
              ) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="ZTP Settings" description="How zero-touch provisioning brings devices up." />

      <div className="flex-1 overflow-auto">
        <Section
          title="Methods"
          description="The ways a device can bootstrap, the NED a worker uses to discover devices that bootstrap that way, and the temporary login the bootstrap gives them. The login is public — anyone who fetches the bootstrap can read it — and is rotated during onboarding."
        >
          <Methods />
        </Section>
      </div>
    </div>
  )
}
