import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { createTriage } from '../../api/samruai'
import { useAuth } from '../../auth/AuthContext'
import Assessment from '../../components/samruai/Assessment'
import { TRIAGES_KEY, triageKey } from '../../components/samruai/triage'
import PageHeader from '../../components/ui/PageHeader'

const LABEL = 'text-[10px] font-semibold uppercase tracking-widest text-subtle'
const INPUT = 'w-full px-3 py-2 text-xs bg-surface-hi border border-edge rounded-md text-content placeholder:text-subtle focus:outline-none focus:border-brand/50'

// What a triage starts from: who leads it, the fault, what it affects, and how urgent it is, which give its
// priority. Once created, it opens as its hypotree.
export default function NewTriagePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [form, setForm] = useState({
    assignee: user?.profile?.preferred_username ?? '',
    description: '',
    impact_description: '',
    impact: null,
    urgency: null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = changes => setForm(f => ({ ...f, ...changes }))
  const missing = [!form.description.trim() && 'a description', !form.impact && 'the impact', !form.urgency && 'the urgency'].filter(Boolean)

  const create = async e => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const triage = await createTriage({ ...form, description: form.description.trim(), impact_description: form.impact_description.trim() })
      queryClient.setQueryData(triageKey(triage.id), triage)
      queryClient.invalidateQueries({ queryKey: TRIAGES_KEY })
      navigate(`/samruai/triage/${triage.id}`)
    } catch (err) {
      setError(err.detail ?? err.message)
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="New triage" description="Describe the fault as it was reported and assess it. The steps to work it out come after." />
      <form onSubmit={create} className="flex-1 min-h-0 overflow-auto px-6 py-4">
        <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2 max-w-6xl">
          <div className="space-y-4">
            <label className="block space-y-1">
              <span className={LABEL}>Lead</span>
              <input value={form.assignee} onChange={e => set({ assignee: e.target.value })} placeholder="Who leads this triage?" className={`${INPUT} max-w-xs`} />
              <span className="block text-[11px] text-subtle">Owns every step that has no assignee of its own.</span>
            </label>
            <label className="block space-y-1">
              <span className={LABEL}>Description</span>
              <textarea
                autoFocus
                rows={6}
                value={form.description}
                onChange={e => set({ description: e.target.value })}
                placeholder="What is wrong, where, and since when? E.g. users at the Kista office lose connectivity a few times an hour since 08:00."
                className={`${INPUT} resize-y`}
              />
              <span className="block text-[11px] text-subtle">The first line names the triage in the list.</span>
            </label>
            <label className="block space-y-1">
              <span className={LABEL}>What is affected</span>
              <textarea
                rows={4}
                value={form.impact_description}
                onChange={e => set({ impact_description: e.target.value })}
                placeholder="Sites, services, customers, users. E.g. the Kista office, about 200 users; VoIP and the ERP are unusable."
                className={`${INPUT} resize-y`}
              />
            </label>
          </div>
          <Assessment impact={form.impact} urgency={form.urgency} onChange={set} />
        </div>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        <div className="flex items-center gap-2 mt-4">
          <button type="submit" disabled={saving || missing.length > 0} className="px-3 py-1.5 text-xs font-semibold rounded bg-brand text-white hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed">
            Start triage
          </button>
          <Link to="/samruai/triage" className="px-3 py-1.5 text-xs rounded border border-edge text-subtle hover:text-content">Cancel</Link>
          {missing.length > 0 && <span className="text-[11px] text-subtle">Needs {missing.join(', ').replace(/, ([^,]*)$/, ' and $1')}.</span>}
        </div>
      </form>
    </div>
  )
}
