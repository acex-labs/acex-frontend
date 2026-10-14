import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { fetchChangelog } from '../../api/changelog'
import PageHeader from '../../components/ui/PageHeader'
import { useAdmin } from '../../context/AdminContext'

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
const STATUS = { considering: 'Considering', planned: 'Planned', in_progress: 'In progress', preview: 'Preview' }
// The roadmap lists what is further along first.
const ROADMAP_GROUPS = [
  ['in_progress', 'Under way'],
  ['preview', 'In preview'],
  ['planned', 'Planned'],
  ['considering', 'Being considered'],
]

// Each choice is a point of view. An administrator is also a user, so that view includes what users see.
const AUDIENCE_FILTERS = [
  { id: 'user', label: 'Users', audiences: ['user'] },
  { id: 'admin', label: 'Administrators (includes users)', audiences: ['user', 'admin'] },
  { id: 'developer', label: 'Developers', audiences: ['developer'] },
  { id: 'all', label: 'Everyone', audiences: ['user', 'admin', 'developer'] },
]
const AUDIENCE_NAME = { user: 'users', admin: 'administrators', developer: 'developers' }
const STORAGE_KEY = 'acex.whatsnew.audience'

// The choice a person made before, if any; otherwise the view that fits their role.
const readStoredAudience = fallback => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return AUDIENCE_FILTERS.some(f => f.id === stored) ? stored : fallback
  } catch {
    return fallback
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

const monthOf = iso =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })

// The product's features, newest first, in the words of the people who use it. Each says where it shipped.
function Highlights({ highlights, componentName, onOpen }) {
  const months = []
  for (const h of highlights) {
    const month = monthOf(h.date)
    if (months.at(-1)?.month !== month) months.push({ month, items: [] })
    months.at(-1).items.push(h)
  }
  return (
    <div>
      {months.map(({ month, items }) => (
        <section key={month} className="mb-8">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-subtle mb-3">{month}</h2>
          <ul className="space-y-5">
            {items.map(h => (
              <li key={h.id}>
                <div className="flex items-baseline gap-3">
                  <span className="w-24 shrink-0 text-[11px] text-subtle">{formatDate(h.date)}</span>
                  <h3 className="text-sm font-semibold text-heading">{h.title}</h3>
                </div>
                <div className="pl-[calc(6rem+0.75rem)]">
                  {h.description && <div className="mt-1"><Markdown>{h.description}</Markdown></div>}
                  {h.components?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {h.components.map((c, index) => {
                        const name = componentName(c.component)
                        const label = [name ?? c.component, c.version].filter(Boolean).join(' ')
                        const key = `${c.component}-${c.version ?? 'any'}-${index}`
                        return name ? (
                          <button
                            key={key}
                            type="button"
                            aria-label={`Open the notes of ${label}`}
                            onClick={() => onOpen(c.component, c.version)}
                            className="text-[10px] px-2 py-0.5 rounded-full border border-edge text-brand hover:bg-brand/10"
                          >
                            {label}
                          </button>
                        ) : (
                          <span key={key} className="text-[10px] px-2 py-0.5 text-subtle">
                            {label}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

// What is coming, for the whole product: each item says what it is, how far along it is and where it lands.
function Roadmap({ items, componentName, onOpen }) {
  const groups = ROADMAP_GROUPS
    .map(([status, label]) => [label, items.filter(item => (item.status ?? 'planned') === status)])
    .filter(([, group]) => group.length > 0)
  if (groups.length === 0) return <p className="text-xs text-subtle">Nothing is planned yet.</p>
  return (
    <div>
      {groups.map(([label, group]) => (
        <section key={label} className="mb-8">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-subtle mb-3">{label}</h2>
          <ul className="space-y-5">
            {group.map(item => {
              const target = [item.planned_version && `version ${item.planned_version}`, item.planned_date]
                .filter(Boolean)
                .join(' · ')
              return (
                <li key={item.id}>
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-sm font-semibold text-heading">{item.title}</h3>
                    {target && <span className="text-[11px] text-subtle whitespace-nowrap">{target}</span>}
                  </div>
                  {item.description && <div className="mt-1"><Markdown>{item.description}</Markdown></div>}
                  {item.components?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {item.components.map(id => componentName(id) ? (
                        <button
                          key={id}
                          type="button"
                          aria-label={`Open the notes of ${componentName(id)}`}
                          onClick={() => onOpen(id, null)}
                          className="text-[10px] px-2 py-0.5 rounded-full border border-edge text-brand hover:bg-brand/10"
                        >
                          {componentName(id)}
                        </button>
                      ) : (
                        <span key={id} className="text-[10px] px-2 py-0.5 text-subtle">{id}</span>
                      ))}
                    </div>
                  )}
                  <Refs refs={item.refs} />
                </li>
              )
            })}
          </ul>
        </section>
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
  const { isAdmin } = useAdmin() ?? {}
  // What the person chose before, if anything. Without a choice the view follows their role, also when the
  // role is only known a moment after the page opened.
  const [chosen, setChosen] = useState(() => readStoredAudience(null))
  // Set when a highlight leads to notes the chosen point of view would hide. It is not the person's choice:
  // it is dropped at the next navigation, and the notice says why the list changed.
  const [override, setOverride] = useState(null)
  const [notice, setNotice] = useState(null)
  const [viewChoice, setViewChoice] = useState(null)
  const bodyRef = useRef(null)
  const { data, isLoading, error } = useQuery({
    queryKey: ['changelog'],
    queryFn: fetchChangelog,
    staleTime: 300_000,
  })

  const ownId = chosen ?? (isAdmin ? 'admin' : 'user')
  const filterOf = id => AUDIENCE_FILTERS.find(f => f.id === id) ?? AUDIENCE_FILTERS[0]
  const filter = filterOf(override ?? ownId)
  const highlights = data?.highlights ?? []
  const sections = data?.sections ?? []
  // The product's planned work, gathered from all its components; a deployment's has its own place.
  const roadmap = sections.find(section => section.id === 'product')?.coming ?? []
  // Highlights are what a visitor sees first; without any, the details are all there is.
  const view = viewChoice ?? (highlights.length > 0 ? 'highlights' : 'details')
  const options = sections.flatMap(section => section.components.map(c => ({ ...c, section })))
  const current = options.find(o => o.id === componentId) ?? options[0]

  // What a component has published, and what is left of it for a point of view.
  const releasesOf = option => option.section.releases.filter(r => r.component === option.id && r.entries.length > 0)
  const shownReleasesOf = (option, audiences = filter.audiences) =>
    releasesOf(option)
      .map(r => ({ ...r, entries: r.entries.filter(e => audiences.includes(e.audience ?? 'user')) }))
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
  // The product's planned work is under Roadmap; a deployment's own is shown with its notes.
  const showPlanned =
    version === 'latest' && current && current.section.id !== 'product' && current.section.coming.length > 0

  const views = [
    highlights.length > 0 && ['highlights', 'Highlights'],
    roadmap.length > 0 && ['roadmap', 'Roadmap'],
    ['details', 'Details'],
  ].filter(Boolean)

  const showView = id => {
    setViewChoice(id)
    if (id === 'highlights') {
      setOverride(null)
      setNotice(null)
    }
  }
  const chooseComponent = id => {
    setComponentId(id)
    setVersion('latest')
    setOverride(null)
    setNotice(null)
  }
  const chooseVersion = value => {
    setVersion(value)
    setNotice(null)
  }
  const chooseAudience = id => {
    setChosen(id)
    storeAudience(id)
    setOverride(null)
    setNotice(null)
  }
  const componentName = id => options.find(o => o.id === id)?.name

  // From a highlight to the release it shipped in. If the person's point of view would hide that release,
  // everyone's notes are shown for now, and the page says so. A release that is not there falls back to the latest.
  const openDetails = (id, releaseVersion) => {
    const option = options.find(o => o.id === id)
    if (!option) return
    const target = releaseVersion ? releasesOf(option).find(r => r.version === releaseVersion) : undefined
    const own = filterOf(ownId)
    const visible = target?.entries.some(e => own.audiences.includes(e.audience ?? 'user'))
    const widen = Boolean(target) && !visible
    const audiences = filterOf(widen ? 'all' : ownId).audiences
    const newest = shownReleasesOf(option, audiences)[0]

    setOverride(widen ? 'all' : null)
    if (widen) setNotice(`${option.name} ${releaseVersion} has no notes for ${own.label}, so everyone's are shown.`)
    else if (releaseVersion && !target) setNotice(`${option.name} ${releaseVersion} has no notes of its own; the latest are shown.`)
    else setNotice(null)
    setViewChoice('details')
    setComponentId(id)
    setVersion(target && newest?.version !== releaseVersion ? releaseVersion : 'latest')
    // The list the person clicked in is gone: put the keyboard at the top of what replaced it.
    requestAnimationFrame(() => bodyRef.current?.focus())
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="What's new"
        description="What the product can do, and what changed in each release"
        actions={current && (
          <div className="flex items-center gap-2">
            {views.length > 1 && (
              <div className="flex rounded border border-edge overflow-hidden" role="group" aria-label="View">
                {views.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={view === id}
                    onClick={() => showView(id)}
                    className={`h-7 px-3 text-xs ${view === id ? 'bg-brand/10 text-brand' : 'text-subtle hover:text-content'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {view === 'details' && (
              <>
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
                    onChange={e => chooseVersion(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    <option value="latest">Latest ({releaseLabel(latest)})</option>
                    {releases.length > 1 && <option value="overview">All releases (overview)</option>}
                    {releases.slice(1).map(r => (
                      <option key={releaseKey(r)} value={releaseKey(r)}>{releaseLabel(r)}</option>
                    ))}
                  </select>
                )}
              </>
            )}
          </div>
        )}
      />
      <div ref={bodyRef} tabIndex={-1} className="flex-1 overflow-auto px-6 py-4 max-w-3xl outline-none">
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
        {current && view === 'highlights' && (
          <>
            <Highlights highlights={highlights} componentName={componentName} onOpen={openDetails} />
            <p className="text-xs text-subtle">
              Every change, by component, is under{' '}
              <button type="button" className="text-brand hover:underline" onClick={() => showView('details')}>
                Details
              </button>.
            </p>
          </>
        )}
        {current && view === 'roadmap' && (
          <Roadmap items={roadmap} componentName={componentName} onOpen={openDetails} />
        )}
        {current && view === 'details' && (
          <>
            {current.section.id !== 'product' && (
              <h2 className="text-xs font-semibold uppercase tracking-wider text-brand mb-4 flex items-center gap-2">
                {current.section.name}
                <Badge>Added by your organisation</Badge>
              </h2>
            )}
            {notice && <p className="text-xs text-subtle mb-4">{notice}</p>}
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
