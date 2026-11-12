import { useQuery } from '@tanstack/react-query'

import { fetchSamruaiAbout, fetchSamruaiMe } from '../../api/samruai'
import PageHeader from '../../components/ui/PageHeader'
import { serviceUrl } from '../../services'

// What usually went wrong, by the status SamruAI answered with. No status at all
// means the browser never got an answer: the URL is wrong, the service is down,
// or SamruAI does not allow this origin (SAMRUAI_CORS_ALLOWED_ORIGINS).
function explain(error) {
  if (!error.status) return 'No answer. Check that the service is running and allows this origin (SAMRUAI_CORS_ALLOWED_ORIGINS).'
  if (error.status === 401) return `The token was refused: ${error.detail ?? 'unauthorized'}. Check the issuer and audience (SAMRUAI_OIDC_*).`
  if (error.status === 503) return `The service cannot validate tokens: ${error.detail ?? 'unavailable'}.`
  return error.detail ?? error.message
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-edge last:border-0">
      <span className="text-[13px] text-subtle">{label}</span>
      <span className="text-[13px] font-mono text-content text-right">{children}</span>
    </div>
  )
}

export default function OverviewPage() {
  const about = useQuery({ queryKey: ['samruai', 'about'], queryFn: fetchSamruaiAbout, retry: false })
  const me = useQuery({ queryKey: ['samruai', 'me'], queryFn: fetchSamruaiMe, retry: false })
  const error = about.error || me.error

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="SamruAI" description="Connection to the SamruAI backend" />
      <div className="p-6 max-w-2xl">
        <section className="mb-6">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-subtle">Connection</h2>
          <div className="rounded border border-edge px-4">
            <Row label="Service">{serviceUrl('samruai')}</Row>
            <Row label="Version">{about.data?.version ?? (about.isLoading ? '…' : '–')}</Row>
            <Row label="Signed in as">
              {me.data ? me.data.username ?? me.data.sub ?? 'dev mode (no auth)' : me.isLoading ? '…' : '–'}
            </Row>
          </div>
          {error && <p className="mt-2 text-[12px] text-red-500">{explain(error)}</p>}
        </section>
      </div>
    </div>
  )
}
