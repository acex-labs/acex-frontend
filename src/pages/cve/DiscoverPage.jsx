import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { discoverCves } from '../../api/cves'
import PageHeader from '../../components/ui/PageHeader'

const INPUT_CLS = 'w-full max-w-lg bg-surface-hi border border-edge rounded px-3 py-2 text-sm text-content placeholder:text-subtle outline-none focus:border-brand/50 disabled:opacity-50'

function localDateTimeToIso(value) {
  return value ? new Date(value).toISOString() : undefined
}

export default function DiscoverPage() {
  const [vendor, setVendor] = useState('Cisco')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [dateError, setDateError] = useState('')
  const mutation = useMutation({ mutationFn: discoverCves })

  function submit(event) {
    event.preventDefault()
    setDateError('')

    if (start && end && new Date(start) > new Date(end)) {
      setDateError('Start date must be before or equal to end date.')
      return
    }

    mutation.mutate({
      vendor: vendor.trim(),
      ...(start && { start: localDateTimeToIso(start) }),
      ...(end && { end: localDateTimeToIso(end) }),
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Discover CVEs"
        description="Queue a background job to fetch CVEs from NVD for a vendor and date range"
      />
      <div className="flex-1 overflow-auto px-6 py-5">
        <section className="max-w-2xl rounded-lg border border-edge bg-surface p-5">
          <div className="flex items-center gap-2 mb-2">
            <Download size={16} className="text-brand" />
            <h2 className="text-sm font-semibold text-heading">CVE discovery job</h2>
          </div>
          <p className="text-xs text-subtle mb-5">
            Leave the dates blank to use the backend default: the most recent 119 days ending now.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="cve-vendor" className="block mb-1 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                NVD CPE vendor
              </label>
              <input
                id="cve-vendor"
                value={vendor}
                onChange={event => setVendor(event.target.value)}
                disabled={mutation.isPending}
                required
                className={INPUT_CLS}
                placeholder="e.g. cisco"
              />
              <p className="mt-1 text-[11px] text-subtle">Use the vendor name from the NVD CPE identifier.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="cve-start" className="block mb-1 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                  Start date and time <span className="normal-case font-normal">(optional)</span>
                </label>
                <input
                  id="cve-start"
                  type="datetime-local"
                  value={start}
                  onChange={event => setStart(event.target.value)}
                  disabled={mutation.isPending}
                  max={end || undefined}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label htmlFor="cve-end" className="block mb-1 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                  End date and time <span className="normal-case font-normal">(optional)</span>
                </label>
                <input
                  id="cve-end"
                  type="datetime-local"
                  value={end}
                  onChange={event => setEnd(event.target.value)}
                  disabled={mutation.isPending}
                  min={start || undefined}
                  className={INPUT_CLS}
                />
              </div>
            </div>
            {(dateError || mutation.isError) && (
              <p role="alert" className="text-xs text-red-400">
                {dateError || `Failed to queue CVE discovery: ${mutation.error.message}`}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!vendor.trim() || mutation.isPending}
                className="px-3 py-1.5 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
              >
                {mutation.isPending ? 'Queuing…' : 'Create discovery job'}
              </button>
              {mutation.isSuccess && (
                <span role="status" className="text-xs text-emerald-400">
                  Job queued for {mutation.data.data?.vendor ?? vendor.trim()}.
                  {' '}
                  <Link to={`/activity/jobs/${mutation.data.id}`} className="text-brand hover:underline">
                    View job {mutation.data.id}
                  </Link>
                </span>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
