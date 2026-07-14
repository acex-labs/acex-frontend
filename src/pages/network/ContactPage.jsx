import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Pencil, X, Check } from 'lucide-react'
import { fetchContact, updateContact } from '../../api/inventory'

const FIELDS = [
  { key: 'name',         label: 'Name',         required: true },
  { key: 'display_name', label: 'Display Name' },
  { key: 'first_name',   label: 'First Name' },
  { key: 'family_name',  label: 'Family Name' },
  { key: 'role',         label: 'Role' },
  { key: 'email',        label: 'Email',  type: 'email' },
  { key: 'phone',        label: 'Phone',  type: 'tel' },
]

function Field({ label, value }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex gap-4 py-2 border-b border-edge last:border-0">
      <dt className="w-32 shrink-0 text-[11px] text-subtle">{label}</dt>
      <dd className="text-xs text-content break-all">{value}</dd>
    </div>
  )
}

function EditField({ field, value, onChange }) {
  return (
    <div className="flex gap-4 py-1.5 border-b border-edge last:border-0 items-center">
      <label className="w-32 shrink-0 text-[11px] text-subtle">{field.label}</label>
      <input
        type={field.type ?? 'text'}
        value={value ?? ''}
        onChange={e => onChange(field.key, e.target.value)}
        required={field.required}
        className="flex-1 bg-surface-hi border border-edge rounded px-2 py-1 text-xs text-content placeholder:text-subtle outline-none focus:border-brand/50 transition-colors"
      />
    </div>
  )
}

export default function ContactPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => fetchContact(id),
  })

  const mutation = useMutation({
    mutationFn: (data) => updateContact(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['contact', id], updated)
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contacts-all'] })
      setEditing(false)
    },
  })

  const startEdit = () => {
    setDraft({ ...contact })
    setEditing(true)
  }

  const cancelEdit = () => {
    setDraft(null)
    setEditing(false)
    mutation.reset()
  }

  const setField = (key, value) => setDraft(d => ({ ...d, [key]: value || null }))

  const save = () => {
    if (!draft.name?.trim()) return
    mutation.mutate(draft)
  }

  const displayName = contact
    ? ([contact.first_name, contact.family_name].filter(Boolean).join(' ') || contact.display_name || contact.name)
    : '—'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-3 border-b border-edge shrink-0">
        <Link
          to="/network/contacts"
          className="inline-flex items-center gap-1 text-[11px] text-subtle hover:text-content mb-2 transition-colors"
        >
          <ChevronLeft size={11} />
          Contacts
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-sm font-semibold text-content">
            {isLoading ? '—' : displayName}
          </h1>
          {!isLoading && contact && !editing && (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors"
            >
              <Pencil size={11} />
              Edit
            </button>
          )}
          {editing && (
            <div className="flex items-center gap-2">
              {mutation.isError && (
                <span className="text-[11px] text-red-400">Save failed.</span>
              )}
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors"
              >
                <X size={11} />
                Cancel
              </button>
              <button
                onClick={save}
                disabled={mutation.isPending || !draft?.name?.trim()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
              >
                <Check size={11} />
                {mutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-xs text-subtle animate-pulse">Loading…</div>
        ) : !contact ? (
          <div className="text-xs text-subtle">Contact not found.</div>
        ) : (
          <div className="max-w-lg bg-surface border border-edge rounded-md overflow-hidden">
            <div className="px-4 py-3">
              {editing
                ? FIELDS.map(f => (
                    <EditField key={f.key} field={f} value={draft[f.key]} onChange={setField} />
                  ))
                : (
                  <dl>
                    {FIELDS.map(f => <Field key={f.key} label={f.label} value={contact[f.key]} />)}
                  </dl>
                )
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
