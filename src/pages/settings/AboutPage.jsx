import { useQuery } from '@tanstack/react-query'

import { fetchAbout } from '../../api/about'
import PageHeader from '../../components/ui/PageHeader'
import pkg from '../../../package.json'

const FRONTEND_BUILD = import.meta.env.VITE_BUILD_ID || null

function Version({ version, buildId }) {
  return (
    <span className="text-[13px] font-mono text-content">
      {version}
      {buildId && <span className="text-subtle"> ({buildId})</span>}
    </span>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-edge last:border-0">
      <span className="text-[13px] text-subtle">{label}</span>
      {value}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-subtle">{title}</h2>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Version</span>
      </div>

      <div className="rounded border border-edge px-4">{children}</div>
    </section>
  )
}

export default function AboutPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['about'],
    queryFn: fetchAbout,
    staleTime: 300_000,
  })

  const packages = data?.packages ?? {}
  const drivers = data?.drivers ?? []


  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="About" description="Versions of the ACEX stack components" />
      <div className="flex-1 overflow-auto px-6 py-4 max-w-xl">
        {isLoading && <p className="text-xs text-subtle">Loading…</p>}
        {error && <p className="text-xs text-red-400">Failed to load: {error.message}</p>}

        <Section title="Application">
          <Row label="Frontend" value={<Version version={pkg.version} buildId={FRONTEND_BUILD} />} />
          {data && <Row label="Backend (API)" value={<Version version={data.version} buildId={data.build_id} />} />}
          {data && <Row label="Python" value={<span className="text-[13px] font-mono text-content">{data.python}</span>} />}
        </Section>

        {data && (
          <Section title="Backend packages">
            {Object.entries(packages).map(([name, version]) => (
              <Row key={name} label={name} value={<Version version={version} />} />
            ))}
          </Section>
        )}
        
        {drivers.length > 0 && (
          <Section title="Drivers (NEDs)">
            {drivers.map(d => (
              <Row key={d.name} label={`${d.name} (${d.package})`} value={<Version version={d.version} />} />
            ))}
          </Section>
        )}
      </div>
    </div>
  )
}