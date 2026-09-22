import { useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Bug, ImagePlus, X } from 'lucide-react'
import { submitBugReport } from '../api/bugReport'

const MAX_SCREENSHOTS = 3
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB per image

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

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
  const [screenshots, setScreenshots] = useState([]) // [{ dataUrl, name }]
  const [screenshotError, setScreenshotError] = useState(null)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null) // null | 'loading' | 'success' | 'error'
  const fileInputRef = useRef(null)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleFiles = async (files) => {
    setScreenshotError(null)
    const incoming = Array.from(files).filter(f => f.type.startsWith('image/'))
    const available = MAX_SCREENSHOTS - screenshots.length
    if (available <= 0) return
    const toAdd = incoming.slice(0, available)
    for (const file of toAdd) {
      if (file.size > MAX_BYTES) {
        setScreenshotError(`"${file.name}" exceeds 2 MB limit`)
        return
      }
    }
    const dataUrls = await Promise.all(toAdd.map(readAsDataURL))
    setScreenshots(prev => [...prev, ...dataUrls.map((dataUrl, i) => ({ dataUrl, name: toAdd[i].name }))])
  }

  const removeScreenshot = (idx) => setScreenshots(prev => prev.filter((_, i) => i !== idx))

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
        screenshots: screenshots.length > 0 ? screenshots.map(s => s.dataUrl) : undefined,
      })
      setStatus('success')
      setTimeout(() => {
        setOpen(false)
        setStatus(null)
        setForm({ title: '', description: '', severity: 'medium', steps: '' })
        setScreenshots([])
        setScreenshotError(null)
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
      setScreenshotError(null)
    }
    setOpen(next)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          className="fixed bottom-[120px] right-5 z-50 flex items-center justify-center rounded-full w-11 h-11 shadow-lg transition-colors bg-surface border-2 border-edge text-subtle hover:border-red-400 hover:text-red-400"
          title="Report a bug"
        >
          <Bug size={18} />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" style={{ zIndex: 9998 }} />
        <Dialog.Content
          className="fixed bottom-[120px] right-5 w-[380px] bg-surface border border-edge rounded-xl shadow-2xl p-5 flex flex-col gap-4 focus:outline-none"
          style={{ zIndex: 9999, maxHeight: 'calc(100vh - 9rem)', overflowY: 'auto' }}
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

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-content">
                  Screenshots <span className="text-subtle font-normal">(optional, max {MAX_SCREENSHOTS})</span>
                </label>

                {screenshots.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {screenshots.map((s, i) => (
                      <div key={i} className="relative group w-16 h-16 rounded-md overflow-hidden border border-edge shrink-0">
                        <img src={s.dataUrl} alt={s.name} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeScreenshot(i)}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} className="text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {screenshots.length < MAX_SCREENSHOTS && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-edge text-subtle hover:border-brand hover:text-brand cursor-pointer transition-colors text-xs"
                  >
                    <ImagePlus size={14} />
                    <span>Add screenshot — drag & drop or click</span>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
                />

                {screenshotError && <p className="text-xs text-red-500">{screenshotError}</p>}
              </div>

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
