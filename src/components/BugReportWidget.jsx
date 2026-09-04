import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Bug, X } from 'lucide-react'
import { submitBugReport } from '../api/bugReport'

const SEVERITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const SEVERITY_COLORS = {
  low: 'text-yellow-500',
  medium: 'text-orange-500',
  high: 'text-red-500',
  critical: 'text-red-700 font-semibold',
}

function Field({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-content">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function validate(form) {
  const errors = {}
  if (!form.title || form.title.length < 5) errors.title = 'Minimum 5 characters'
  if (form.title && form.title.length > 200) errors.title = 'Maximum 200 characters'
  if (!form.description || form.description.length < 10) errors.description = 'Minimum 10 characters'
  if (form.description && form.description.length > 5000) errors.description = 'Maximum 5000 characters'
  if (!form.severity) errors.severity = 'Select a severity'
  if (form.steps && form.steps.length > 2000) errors.steps = 'Maximum 2000 characters'
  return errors
}

export default function BugReportWidget() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', severity: 'medium', steps: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null) // null | 'loading' | 'success' | 'error'

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setStatus('loading')
    try {
      await submitBugReport({
        title: form.title,
        description: form.description,
        severity: form.severity,
        steps: form.steps || undefined,
        page_url: window.location.href,
      })
      setStatus('success')
      setTimeout(() => {
        setOpen(false)
        setStatus(null)
        setForm({ title: '', description: '', severity: 'medium', steps: '' })
        setErrors({})
      }, 2000)
    } catch {
      setStatus('error')
    }
  }

  const handleOpenChange = (next) => {
    if (!next) {
      setStatus(null)
      setErrors({})
    }
    setOpen(next)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          className="fixed bottom-20 right-5 z-50 flex items-center justify-center rounded-full w-11 h-11 shadow-lg transition-colors bg-surface border-2 border-edge text-subtle hover:border-red-400 hover:text-red-400"
          title="Report a bug"
        >
          <Bug size={18} />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" style={{ zIndex: 9998 }} />
        <Dialog.Content
          className="fixed bottom-20 right-5 w-[380px] bg-surface border border-edge rounded-xl shadow-2xl p-5 flex flex-col gap-4 focus:outline-none"
          style={{ zIndex: 9999, maxHeight: 'calc(100vh - 7rem)', overflowY: 'auto' }}
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold text-content flex items-center gap-2">
              <Bug size={15} className="text-red-400" />
              Report a bug
            </Dialog.Title>
            <Dialog.Close className="text-subtle hover:text-content transition-colors">
              <X size={16} />
            </Dialog.Close>
          </div>

          {status === 'success' ? (
            <div className="py-6 text-center">
              <p className="text-sm font-medium text-content">Report submitted!</p>
              <p className="text-xs text-subtle mt-1">The team has been notified.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Field label="Title" error={errors.title}>
                <input
                  className="w-full rounded-md border border-edge bg-canvas px-3 py-1.5 text-sm text-content placeholder:text-subtle focus:outline-none focus:ring-1 focus:ring-brand"
                  placeholder="Short description of the bug"
                  value={form.title}
                  onChange={set('title')}
                  maxLength={200}
                />
              </Field>

              <Field label="Severity" error={errors.severity}>
                <select
                  className="w-full rounded-md border border-edge bg-canvas px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                  value={form.severity}
                  onChange={set('severity')}
                >
                  {SEVERITIES.map(s => (
                    <option key={s.value} value={s.value} className={SEVERITY_COLORS[s.value]}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Description" error={errors.description}>
                <textarea
                  className="w-full rounded-md border border-edge bg-canvas px-3 py-1.5 text-sm text-content placeholder:text-subtle focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                  placeholder="What happened? What did you expect?"
                  rows={3}
                  value={form.description}
                  onChange={set('description')}
                  maxLength={5000}
                />
              </Field>

              <Field label="Steps to reproduce (optional)" error={errors.steps}>
                <textarea
                  className="w-full rounded-md border border-edge bg-canvas px-3 py-1.5 text-sm text-content placeholder:text-subtle focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                  placeholder="1. Go to...\n2. Click..."
                  rows={2}
                  value={form.steps}
                  onChange={set('steps')}
                  maxLength={2000}
                />
              </Field>

              {status === 'error' && (
                <p className="text-xs text-red-500">Failed to submit. Please try again.</p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="mt-1 w-full rounded-md bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium py-1.5 transition-colors"
              >
                {status === 'loading' ? 'Submitting…' : 'Submit bug report'}
              </button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
