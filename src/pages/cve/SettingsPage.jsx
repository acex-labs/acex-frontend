import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { updateNvdApiKey } from '../../api/cves'
import PageHeader from '../../components/ui/PageHeader'

const INPUT_CLS = 'w-full max-w-lg bg-surface-hi border border-edge rounded px-3 py-2 text-sm text-content placeholder:text-subtle outline-none focus:border-brand/50 disabled:opacity-50'

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const keyMutation = useMutation({
    mutationFn: updateNvdApiKey,
    onSuccess: () => {
      setApiKey('')
      setSaved(true)
    },
    onError: () => setSaved(false),
  })
  function saveApiKey(event) {
    event.preventDefault()
    setSaved(false)
    keyMutation.mutate(apiKey)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="CVE Settings" description="Configure the NVD API key used to retrieve vulnerability data" />
      <div className="flex-1 overflow-auto px-6 py-5">
        <section className="max-w-2xl rounded-lg border border-edge bg-surface p-5">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound size={16} className="text-brand" />
            <h2 className="text-sm font-semibold text-heading">NVD API key</h2>
          </div>
          <p className="text-xs text-subtle mb-4">
            Enter a new key to replace the current one. The saved key is never retrieved or displayed here.
          </p>
          <form onSubmit={saveApiKey} className="space-y-3">
            <label htmlFor="nvd-api-key" className="block text-[11px] font-semibold uppercase tracking-wider text-subtle">
              New API key
            </label>
            <input
              id="nvd-api-key"
              type="password"
              autoComplete="new-password"
              value={apiKey}
              onChange={event => setApiKey(event.target.value)}
              disabled={keyMutation.isPending}
              required
              className={INPUT_CLS}
              placeholder="Enter NVD API key"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!apiKey || keyMutation.isPending}
                className="px-3 py-1.5 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
              >
                {keyMutation.isPending ? 'Saving…' : 'Save API key'}
              </button>
              {saved && <span role="status" className="text-xs text-emerald-400">API key saved. Its value is hidden.</span>}
              {keyMutation.isError && (
                <span role="alert" className="text-xs text-red-400">
                  Failed to save API key: {keyMutation.error.message}
                </span>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}