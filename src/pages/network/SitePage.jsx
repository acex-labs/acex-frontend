import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, MapPin, Mail, Phone, Plus, X } from 'lucide-react'
import { fetchSite, fetchNodes, fetchContactAssignments, fetchContacts, createContactAssignment, deleteContactAssignment } from '../../api/inventory'
import { apiFetch } from '../../api/client'
import { usePageAiContext } from '../../context/AiContext'
import SiteMap from '../../components/map/SiteMap'
import SiteTopologyTab from './SiteTopologyTab'

const TABS = [
  { key: 'overview',  label: 'Overview' },
  { key: 'nodes',     label: 'Nodes' },
  { key: 'topology',  label: 'Topology' },
]

function buildSiteContext(site, regions, nodeCount) {
  if (!site) return ''
  const rows = [
    `Name: ${site.name}`,
    site.display_name && site.display_name !== site.name ? `Display name: ${site.display_name}` : null,
    site.address ? `Address: ${site.address}` : null,
    site.city    ? `City: ${site.city}` : null,
    site.country ? `Country: ${site.country}` : null,
    site.latitude != null ? `Coordinates: ${site.latitude}, ${site.longitude}` : null,
    regions.length > 0   ? `Regions: ${regions.join(', ')}` : null,
    nodeCount != null    ? `Node instances: ${nodeCount}` : null,
  ].filter(Boolean)
  return `Site:\n${rows.map(r => `  ${r}`).join('\n')}`
}

function Field({ label, value }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex gap-4 py-2 border-b border-edge last:border-0">
      <dt className="w-28 shrink-0 text-[11px] text-subtle">{label}</dt>
      <dd className="text-xs text-content">{value}</dd>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="bg-surface border border-edge rounded-md overflow-hidden">
      {title && (
        <div className="px-4 py-2.5 border-b border-edge">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">{title}</h3>
        </div>
      )}
      <dl className="px-4 py-1">{children}</dl>
    </div>
  )
}

function RegionBadge({ name }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-brand/10 text-brand border border-brand/20">
      {name}
    </span>
  )
}

function contactDisplayName(c) {
  return [c.first_name, c.family_name].filter(Boolean).join(' ') || c.display_name || c.name
}

function ContactRow({ contact, assignment, onRemove, removing }) {
  return (
    <div className="flex items-start gap-2 py-2.5 border-b border-edge last:border-0 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-content">{contactDisplayName(contact)}</span>
          {contact.role && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hi text-subtle border border-edge">{contact.role}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-3 mt-0.5">
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-[11px] text-subtle hover:text-brand transition-colors">
              <Mail size={10} />{contact.email}
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-[11px] text-subtle hover:text-brand transition-colors">
              <Phone size={10} />{contact.phone}
            </a>
          )}
        </div>
      </div>
      <button
        onClick={() => onRemove(assignment.id)}
        disabled={removing}
        title="Remove contact"
        className="opacity-0 group-hover:opacity-100 mt-0.5 p-0.5 text-subtle hover:text-red-400 transition-all shrink-0 disabled:opacity-30"
      >
        <X size={11} />
      </button>
    </div>
  )
}

function ContactsCard({ siteName }) {
  const queryClient = useQueryClient()
  const [showPicker, setShowPicker] = useState(false)
  const [filter, setFilter] = useState('')
  const inputRef = useRef(null)

  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ['contact-assignments', siteName],
    queryFn: () => fetchContactAssignments({ site_name: siteName }),
    enabled: !!siteName,
  })

  const { data: allContactsData } = useQuery({
    queryKey: ['contacts-all'],
    queryFn: () => fetchContacts({ limit: 1000 }),
    enabled: !!siteName,
  })

  const allContacts = allContactsData?.items ?? allContactsData ?? []
  const assignedNames = new Set((assignments ?? []).map(a => a.contact_name))
  const assignedContacts = allContacts.filter(c => assignedNames.has(c.name))
  const availableContacts = allContacts.filter(c => !assignedNames.has(c.name))
  const filteredAvailable = filter
    ? availableContacts.filter(c =>
        contactDisplayName(c).toLowerCase().includes(filter.toLowerCase()) ||
        c.name.toLowerCase().includes(filter.toLowerCase())
      )
    : availableContacts

  const addMutation = useMutation({
    mutationFn: (contact_name) => createContactAssignment({ contact_name, site_name: siteName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-assignments', siteName] })
      setFilter('')
      setShowPicker(false)
    },
  })

  const removeMutation = useMutation({
    mutationFn: deleteContactAssignment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contact-assignments', siteName] }),
  })

  useEffect(() => {
    if (showPicker) inputRef.current?.focus()
  }, [showPicker])

  if (loadingAssignments) return null

  return (
    <div className="bg-surface border border-edge rounded-md overflow-hidden">
      <div className="px-4 py-2.5 border-b border-edge flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">Contacts</h3>
        <button
          onClick={() => setShowPicker(p => !p)}
          className="flex items-center gap-1 text-[10px] text-subtle hover:text-content transition-colors"
        >
          <Plus size={10} />
          Add
        </button>
      </div>

      {showPicker && (
        <div className="border-b border-edge px-3 py-2 space-y-1.5">
          <input
            ref={inputRef}
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter contacts…"
            className="w-full bg-surface-hi border border-edge rounded px-2.5 py-1.5 text-xs text-content placeholder:text-subtle outline-none focus:border-brand/50 transition-colors"
          />
          <div className="max-h-40 overflow-y-auto rounded border border-edge bg-canvas">
            {filteredAvailable.length === 0 ? (
              <div className="px-3 py-2 text-xs text-subtle">
                {availableContacts.length === 0 ? 'All contacts assigned.' : 'No matches.'}
              </div>
            ) : (
              filteredAvailable.map(c => (
                <button
                  key={c.name}
                  onClick={() => addMutation.mutate(c.name)}
                  disabled={addMutation.isPending}
                  className="w-full text-left px-3 py-2 text-xs border-b border-edge/50 last:border-0 hover:bg-surface-hi transition-colors disabled:opacity-50"
                >
                  <span className="text-content font-medium">{contactDisplayName(c)}</span>
                  {c.role && <span className="ml-2 text-[10px] text-subtle">{c.role}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="px-4 py-1">
        {assignedContacts.length === 0 && !showPicker && (
          <div className="py-2.5 text-xs text-subtle">No contacts assigned.</div>
        )}
        {assignedContacts.map(c => {
          const assignment = (assignments ?? []).find(a => a.contact_name === c.name)
          return (
            <ContactRow
              key={c.name}
              contact={c}
              assignment={assignment}
              onRemove={removeMutation.mutate}
              removing={removeMutation.isPending}
            />
          )
        })}
      </div>
    </div>
  )
}

function OverviewTab({ site, regions, nodeCount }) {
  const hasCoords = site.latitude != null && site.longitude != null

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      {/* Left: info */}
      <div className="space-y-4">
        <Card title="Site">
          <Field label="Name"         value={site.name} />
          <Field label="Display Name" value={site.display_name} />
          <Field label="Address"      value={site.address} />
          <Field label="City"         value={site.city} />
          <Field label="Country"      value={site.country} />
          {hasCoords && (
            <Field label="Coords" value={`${site.latitude}, ${site.longitude}`} />
          )}
        </Card>

        {regions.length > 0 && (
          <div className="bg-surface border border-edge rounded-md p-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle mb-3">Regions</h3>
            <div className="flex flex-wrap gap-2">
              {regions.map(r => <RegionBadge key={r} name={r} />)}
            </div>
          </div>
        )}

        <ContactsCard siteName={site.name} />

        <div className="bg-surface border border-edge rounded-md px-5 py-4">
          <div className="text-2xl font-semibold text-content tabular-nums">
            {nodeCount ?? <span className="text-subtle animate-pulse">—</span>}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-subtle mt-0.5">Node Instances</div>
        </div>
      </div>

      {/* Right: map */}
      <div className="bg-surface border border-edge rounded-md overflow-hidden" style={{ height: 340 }}>
        {hasCoords ? (
          <SiteMap sites={[site]} />
        ) : (
          <div className="flex items-center justify-center h-full gap-2 text-xs text-subtle">
            <MapPin size={14} />
            No coordinates set
          </div>
        )}
      </div>
    </div>
  )
}

function NodesTab({ siteName }) {
  const { data, isLoading } = useQuery({
    queryKey: ['nodes', { site: siteName, limit: 100 }],
    queryFn: () => fetchNodes({ site: siteName, limit: 100 }),
  })

  const nodes = data?.items ?? []

  if (isLoading) return <div className="p-6 text-xs text-subtle animate-pulse">Loading…</div>
  if (!nodes.length) return <div className="p-6 text-xs text-subtle">No nodes at this site.</div>

  return (
    <div className="p-6">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-edge">
            {['Hostname', 'Role', 'Status', 'Driver'].map(h => (
              <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-subtle pb-2 pr-6">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {nodes.map(n => (
            <tr key={n.id} className="border-b border-edge/50 hover:bg-surface-hi transition-colors cursor-pointer">
              <td className="py-2 pr-6 text-content font-medium">{n.hostname || '—'}</td>
              <td className="py-2 pr-6 text-subtle">{n.role || '—'}</td>
              <td className="py-2 pr-6 text-subtle">{n.status || '—'}</td>
              <td className="py-2 pr-6 text-subtle">{n.ned_id || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function SitePage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'overview'

  const { data: site, isLoading } = useQuery({
    queryKey: ['site', id],
    queryFn: () => fetchSite(id),
  })

  const siteName = site?.name

  const { data: assignmentsData } = useQuery({
    queryKey: ['site-regions', id],
    queryFn: () => apiFetch(`/api/v1/inventory/region_assignments/?site_name=${encodeURIComponent(siteName)}`),
    enabled: !!siteName,
  })
  const regions = (Array.isArray(assignmentsData) ? assignmentsData : []).map(a => a.region_name)

  const { data: nodeData } = useQuery({
    queryKey: ['nodes-count', id],
    queryFn: () => fetchNodes({ site: siteName, limit: 1 }),
    enabled: !!siteName,
  })
  const nodeCount = nodeData?.total ?? null

  const setTab = tab => setSearchParams(prev => {
    const next = new URLSearchParams(prev)
    next.set('tab', tab)
    return next
  }, { replace: true })

  usePageAiContext({
    pageName: `Site: ${site?.display_name || site?.name || id}`,
    tabName: TABS.find(t => t.key === activeTab)?.label,
    context: activeTab === 'overview' ? buildSiteContext(site, regions, nodeCount) : '',
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-edge shrink-0">
        <Link
          to="/network/sites"
          className="inline-flex items-center gap-1 text-[11px] text-subtle hover:text-content mb-2 transition-colors"
        >
          <ChevronLeft size={11} />
          Sites
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-content">
            {isLoading ? '—' : (site?.display_name || site?.name || name)}
          </h1>
          {site?.name && site.name !== site?.display_name && (
            <span className="text-[10px] text-subtle font-mono">{site.name}</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-edge px-4 shrink-0">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              'px-3 py-2 text-xs border-b-2 -mb-px transition-colors',
              activeTab === key
                ? 'border-brand text-content'
                : 'border-transparent text-subtle hover:text-content',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-hidden flex flex-col ${activeTab !== 'topology' ? 'overflow-auto' : ''}`}>
        {isLoading ? (
          <div className="p-6 text-xs text-subtle animate-pulse">Loading…</div>
        ) : !site ? (
          <div className="p-6 text-xs text-subtle">Site not found.</div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="overflow-auto flex-1">
                <OverviewTab site={site} regions={regions} nodeCount={nodeCount} />
              </div>
            )}
            {activeTab === 'nodes' && (
              <div className="overflow-auto flex-1">
                <NodesTab siteName={siteName} />
              </div>
            )}
            {activeTab === 'topology' && <SiteTopologyTab siteName={siteName} />}
          </>
        )}
      </div>
    </div>
  )
}
