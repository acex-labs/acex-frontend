import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { fetchChangelog } from '../../api/changelog'
import PageHeader from '../../components/ui/PageHeader'

// In the order they are shown within a release.
const KINDS = [
  ['security', 'Security'],
  ['removed', 'Removed'],
  ['added', 'New'],
  ['changed', 'Changed'],
  ['fixed', 'Fixed'],
  ['deprecated', 'Deprecated'],
]

const AUDIENCE = { admin: 'For administrators', developer: 'For developers' }
const STATUS = { planned: 'Planned', in_progress: 'In progress', preview: 'Preview' }

const formatDate = iso =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

// Descriptions are Markdown written by the component's authors; react-markdown
// never renders raw HTML, so a note cannot inject anything into the page.
function Markdown({ children }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="text-[12px] text-subtle mb-1.5 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="pl-4 list-disc space-y-0.5 text-[12px] text-subtle mb-1.5">{children}</ul>,
        ol: ({ children }) => <ol className="pl-4 list-decimal space-y-0.5 text-[12px] text-subtle mb-1.5">{children}</ol>,
        code: ({ children }) => <code className="bg-surface px-1 py-0.5 rounded text-[10px] text-brand">{children}</code>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-brand hover:underline">{children}</a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  )
}

function Badge({ children, tone = 'subtle' }) {
  const classes = tone === 'red'
    ? 'text-red-400 bg-red-400/10 border-red-400/20'
    : tone === 'brand'
      ? 'text-brand bg-brand/10 border-brand/20'
      : 'text-subtle bg-surface border-edge'
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${classes}`}>{children}</span>
}

function Refs({ refs }) {
  if (!refs?.length) return null
  return (
    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-subtle">
      {refs.map(ref => ref.url ? (
        <a key={ref.label + ref.url} href={ref.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
          {ref.label}
        </a>
      ) : (
        <span key={ref.label}>{ref.label}</span>
      ))}
    </div>
  )
}

function Entry({ entry }) {
  return (
    <li className="text-[13px] text-content">
      <div className="flex items-start gap-2">
        <span>
          {entry.breaking && <span className="font-semibold text-red-400">Action needed: </span>}
          {entry.title}
        </span>
        {AUDIENCE[entry.audience] && <Badge>{AUDIENCE[entry.audience]}</Badge>}
      </div>
      {entry.description && <div className="mt-1 mb-1"><Markdown>{entry.description}</Markdown></div>}
      <Refs refs={entry.refs} />
    </li>
  )
}

function Release({ release, componentName }) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold text-heading mb-3 flex items-center gap-2">
        {release.version ? `${componentName} ${release.version}` : componentName}
        {release.date && <span className="font-normal text-subtle">· {formatDate(release.date)}</span>}
        {!release.version && <Badge tone="brand">Not released yet · development build</Badge>}
      </h2>
      {KINDS.map(([kind, label]) => {
        const items = release.entries.filter(e => e.kind === kind)
        if (items.length === 0) return null
        return (
          <div key={kind} className="mb-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-subtle mb-1.5">{label}</h3>
            <ul className="pl-5 list-disc space-y-2">
              {items.map(entry => <Entry key={entry.id} entry={entry} />)}
            </ul>
          </div>
        )
      })}
    </section>
  )
}

function Coming({ items }) {
  return (
    <section className="mb-8 rounded border border-edge bg-surface/50 px-4 py-3">
      <h2 className="text-[10px] font-semibold uppercase tracking-wider text-subtle mb-2">Planned</h2>
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item.id} className="text-[13px] text-content">
            <div className="flex items-start gap-2">
              <span>{item.title}</span>
              <Badge tone={item.status === 'planned' ? 'subtle' : 'brand'}>{STATUS[item.status] ?? item.status}</Badge>
              {(item.planned_version || item.planned_date) && (
                <span className="text-[11px] text-subtle whitespace-nowrap">
                  {[item.planned_version && `version ${item.planned_version}`, item.planned_date].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
            {item.description && <div className="mt-1"><Markdown>{item.description}</Markdown></div>}
            <Refs refs={item.refs} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function ChangelogPage() {
  const [component, setComponent] = useState('all')
  const { data, isLoading, error } = useQuery({
    queryKey: ['changelog'],
    queryFn: fetchChangelog,
    staleTime: 300_000,
  })

  const sections = data?.sections ?? []
  const components = sections.flatMap(s => s.components)
  const names = Object.fromEntries(components.map(c => [c.id, c.name]))
  const shown = sections
    .map(section => ({
      ...section,
      releases: section.releases.filter(r => (component === 'all' || r.component === component) && r.entries.length > 0),
      coming: component === 'all' ? section.coming : [],
    }))
    .filter(section => section.releases.length > 0 || section.coming.length > 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="What's new"
        description="What changed in each release, and what is planned"
        actions={components.length > 1 && (
          <select
            value={component}
            onChange={e => setComponent(e.target.value)}
            className="h-7 px-2 text-xs rounded border border-edge bg-surface-hi text-content focus:outline-none focus:border-brand/50"
          >
            <option value="all">All components</option>
            {components.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      />
      <div className="flex-1 overflow-auto px-6 py-4 max-w-3xl">
        {isLoading && <p className="text-xs text-subtle">Loading…</p>}
        {error && <p className="text-xs text-red-400">Could not load release notes: {error.message}</p>}
        {data && shown.length === 0 && (
          <p className="text-xs text-subtle">No release notes yet. They appear here from the next release.</p>
        )}
        {shown.map(section => (
          <div key={section.id} className="mb-10">
            {sections.length > 1 && (
              <h2 className="text-xs font-semibold uppercase tracking-wider text-brand mb-4 flex items-center gap-2">
                {section.name}
                {section.id !== 'product' && <Badge>Added by your organisation</Badge>}
              </h2>
            )}
            {section.coming.length > 0 && <Coming items={section.coming} />}
            {section.releases.map(release => (
              <Release
                key={`${release.component}:${release.version ?? 'unreleased'}`}
                release={release}
                componentName={names[release.component] ?? release.component}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
