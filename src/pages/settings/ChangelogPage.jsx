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

// Most entries are for the people who use ACEX. Developer entries (models, client methods) are for integrators,
// so they are left out unless asked for.
const AUDIENCE_FILTERS = [
  { id: 'standard', label: 'Users and administrators', audiences: ['user', 'admin'] },
  { id: 'developers', label: 'Developers', audiences: ['developer'] },
  { id: 'all', label: 'Everyone', audiences: ['user', 'admin', 'developer'] },
]
const AUDIENCE_NAME = { user: 'users', admin: 'administrators', developer: 'developers' }
const STORAGE_KEY = 'acex.whatsnew.audience'

const readStoredAudience = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return AUDIENCE_FILTERS.some(f => f.id === stored) ? stored : 'standard'
  } catch {
    return 'standard'
  }
}

const storeAudience = id => {
  try {
    window.localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Private browsing or blocked storage: the choice just is not remembered.
  }
}

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

function Entries({ entries }) {
  return KINDS.map(([kind, label]) => {
    const items = entries.filter(e => e.kind === kind)
    if (items.length === 0) return null
    return (
      <div key={kind} className="mb-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-subtle mb-1.5">{label}</h3>
        <ul className="pl-5 list-disc space-y-2">
          {items.map(entry => <Entry key={entry.id} entry={entry} />)}
        </ul>
      </div>
    )
  })
}

function Release({ release, componentName }) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold text-heading mb-3 flex items-center gap-2">
        {release.version ? `${componentName} ${release.version}` : componentName}
        {release.date && <span className="font-normal text-subtle">· {formatDate(release.date)}</span>}
        {!release.version && <Badge tone="brand">Not released yet · development build</Badge>}
      </h2>
      {release.summary && <p className="text-[13px] text-content mb-4">{release.summary}</p>}
      <Entries entries={release.entries} />
    </section>
  )
}

// What the release is about when it has no summary of its own: its first entry.
const gist = release =>
  release.entries.length > 1
    ? `${release.entries[0].title} and ${release.entries.length - 1} more`
    : release.entries[0].title

// One line per release, the details a click away: for the reader who wants to see what came when.
function Overview({ releases }) {
  return (
    <div className="mb-8 divide-y divide-edge border-y border-edge">
      {releases.map(release => (
        <details key={release.version ?? 'unreleased'} className="group py-2">
          <summary className="cursor-pointer list-none flex items-baseline gap-3 text-[13px]">
            <span className="text-subtle transition-transform group-open:rotate-90">›</span>
            <span className="w-24 shrink-0 font-semibold text-heading">{release.version ?? 'Not released'}</span>
            <span className="w-24 shrink-0 text-[11px] text-subtle">{release.date ? formatDate(release.date) : ''}</span>
            <span className="text-content">{release.summary ?? gist(release)}</span>
          </summary>
          <div className="pt-3 pl-5"><Entries entries={release.entries} /></div>
        </details>
      ))}
    </div>
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

const releaseKey = release => release.version ?? 'unreleased'

const releaseLabel = release =>
  `${release.version ?? 'Not released yet'}${release.date ? ` · ${formatDate(release.date)}` : ''}`

const SELECT_CLASS =
  'h-7 px-2 text-xs rounded border border-edge bg-surface-hi text-content focus:outline-none focus:border-brand/50'

export default function ChangelogPage() {
  const [componentId, setComponentId] = useState(null)
  const [version, setVersion] = useState('latest')
  const [audienceId, setAudienceId] = useState(readStoredAudience)
  const { data, isLoading, error } = useQuery({
    queryKey: ['changelog'],
    queryFn: fetchChangelog,
    staleTime: 300_000,
  })

  const filter = AUDIENCE_FILTERS.find(f => f.id === audienceId) ?? AUDIENCE_FILTERS[0]
  const sections = data?.sections ?? []
  const options = sections.flatMap(section => section.components.map(c => ({ ...c, section })))
  const current = options.find(o => o.id === componentId) ?? options[0]

  // What a component has published, and what is left of it for the chosen audience.
  const releasesOf = option => option.section.releases.filter(r => r.component === option.id && r.entries.length > 0)
  const shownReleasesOf = option =>
    releasesOf(option)
      .map(r => ({ ...r, entries: r.entries.filter(e => filter.audiences.includes(e.audience ?? 'user')) }))
      .filter(r => r.entries.length > 0)
  const audiencesOf = option =>
    [...new Set(releasesOf(option).flatMap(r => r.entries.map(e => e.audience ?? 'user')))]
      .map(a => AUDIENCE_NAME[a] ?? a)
      .join(', ')
  // A component with notes only for another audience says so, instead of looking empty.
  const optionLabel = option =>
    releasesOf(option).length > 0 && shownReleasesOf(option).length === 0
      ? `${option.name} (${audiencesOf(option)})`
      : option.name

  const releases = current ? shownReleasesOf(current) : []
  const hasNotes = current ? releasesOf(current).length > 0 : false
  const latest = releases[0]
  const overview = version === 'overview'
  const release = version === 'latest' || overview ? latest : releases.find(r => releaseKey(r) === version) ?? latest
  const showPlanned = version === 'latest' && current && current.section.coming.length > 0

  const chooseComponent = id => {
    setComponentId(id)
    setVersion('latest')
  }
  const chooseAudience = id => {
    setAudienceId(id)
    storeAudience(id)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="What's new"
        description="What changed in each release, and what is planned"
        actions={current && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-subtle">Show</span>
            <select
              aria-label="Audience"
              value={filter.id}
              onChange={e => chooseAudience(e.target.value)}
              className={SELECT_CLASS}
            >
              {AUDIENCE_FILTERS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            {options.length > 1 && (
              <select
                aria-label="Component"
                value={current.id}
                onChange={e => chooseComponent(e.target.value)}
                className={SELECT_CLASS}
              >
                {sections.map(section => (
                  <optgroup key={section.id} label={section.name}>
                    {section.components
                      .map(c => ({ ...c, section }))
                      .map(c => <option key={c.id} value={c.id}>{optionLabel(c)}</option>)}
                  </optgroup>
                ))}
              </select>
            )}
            {releases.length > 0 && (
              <select
                aria-label="Version"
                value={version}
                onChange={e => setVersion(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="latest">Latest ({releaseLabel(latest)})</option>
                {releases.length > 1 && <option value="overview">All releases (overview)</option>}
                {releases.slice(1).map(r => <option key={releaseKey(r)} value={releaseKey(r)}>{releaseLabel(r)}</option>)}
              </select>
            )}
          </div>
        )}
      />
      <div className="flex-1 overflow-auto px-6 py-4 max-w-3xl">
        {isLoading && <p className="text-xs text-subtle">Loading…</p>}
        {error && <p className="text-xs text-red-400">Could not load release notes: {error.message}</p>}
        {data?.backendError && (
          <p className="text-xs text-subtle mb-4">
            The release notes of the backend could not be loaded ({data.backendError}). Only the web
            interface's own notes are shown.
          </p>
        )}
        {data && !current && (
          <p className="text-xs text-subtle">No release notes yet. They appear here from the next release.</p>
        )}
        {current && (
          <>
            {current.section.id !== 'product' && (
              <h2 className="text-xs font-semibold uppercase tracking-wider text-brand mb-4 flex items-center gap-2">
                {current.section.name}
                <Badge>Added by your organisation</Badge>
              </h2>
            )}
            {showPlanned && <Coming items={current.section.coming} />}
            {overview && <Overview releases={releases} />}
            {!overview && release && <Release release={release} componentName={current.name} />}
            {!release && hasNotes && (
              <p className="text-xs text-subtle">
                The notes for {current.name} are written for {audiencesOf(current)}.{' '}
                <button type="button" className="text-brand hover:underline" onClick={() => chooseAudience('all')}>
                  Show the notes for {audiencesOf(current)}
                </button>
              </p>
            )}
            {!release && !hasNotes && (
              <p className="text-xs text-subtle">No release notes yet for {current.name}.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
