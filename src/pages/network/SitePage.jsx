import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

function useSiteInitialData(id) {
  const queryClient = useQueryClient()
  return () => {
    for (const [key, data] of queryClient.getQueriesData({ queryKey: ['sites'] })) {
      const found = data?.items?.find(s => String(s.id) === String(id))
      if (found) return found
    }
  }
}
import { ChevronLeft, MapPin, Mail, Phone, Plus, X, Pencil, Check, Trash2 } from 'lucide-react'
import {
  fetchSite,
  updateSite,
  deleteSite,
  fetchNodes,
  fetchContactAssignments,
  fetchContacts,
  createContactAssignment,
  deleteContactAssignment,
  fetchRegions,
  fetchRegionAssignments,
  createRegionAssignment,
  deleteRegionAssignment,
} from '../../api/inventory'
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

function EditField({ label, value, onChange, type = 'text' }) {
  return (
    <div className="flex gap-4 py-1.5 border-b border-edge last:border-0 items-center">
      <label className="w-28 shrink-0 text-[11px] text-subtle">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-surface-hi border border-edge rounded px-2 py-1 text-xs text-content placeholder:text-subtle outline-none focus:border-brand/50 transition-colors"
      />
    </div>
  )
}

function DeleteControls({ confirming, onStart, onConfirm, onCancel, pending, disabled, disabledTitle }) {
  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-red-400">Delete?</span>
        <button
          onClick={onConfirm}
          disabled={pending}
          className="px-2 py-1 rounded text-[11px] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
        >
          Confirm
        </button>
        <button
          onClick={onCancel}
          className="px-2 py-1 rounded text-[11px] border border-edge text-subtle hover:text-content transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }
  return (
    <button
      onClick={onStart}
      disabled={disabled}
      title={disabled ? disabledTitle : undefined}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-edge text-subtle hover:text-red-400 disabled:opacity-40 disabled:hover:text-subtle transition-colors"
    >
      <Trash2 size={11} />
      Delete
    </button>
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

function RegionRow({ region, onRemove, removing }) {
  return (
    <div className="flex items-center gap-2 py-1.5 group">
      <RegionBadge name={region.display_name || region.name} />
      <button
        onClick={() => onRemove(region.assignmentId)}
        disabled={removing}
        title="Remove region"
        className="opacity-0 group-hover:opacity-100 p-0.5 text-subtle hover:text-red-400 transition-all shrink-0 disabled:opacity-30"
      >
        <X size={11} />
      </button>
    </div>
  )
}

function RegionsCard({ siteId, siteName }) {
  const queryClient = useQueryClient()
  const [showPicker, setShowPicker] = useState(false)
  const [filter, setFilter] = useState('')

  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ['site-regions', siteId],
    queryFn: () => fetchRegionAssignments({ site_name: siteName }),
    enabled: !!siteName,
  })

  const { data: allRegionsData } = useQuery({
    queryKey: ['regions-all'],
    queryFn: () => fetchRegions({ limit: 1000 }),
    enabled: !!siteName,
  })

  const allRegions = allRegionsData?.items ?? []
  const assignmentList = Array.isArray(assignments) ? assignments : []
  const assignedNames = new Set(assignmentList.map(a => a.region_name))
  const assignedRegions = assignmentList.map(a => {
    const region = allRegions.find(r => r.name === a.region_name)
    return { name: a.region_name, display_name: region?.display_name, assignmentId: a.id }
  })
  const availableRegions = allRegions.filter(r => !assignedNames.has(r.name))
  const filteredAvailable = filter
    ? availableRegions.filter(r => (r.display_name || r.name).toLowerCase().includes(filter.toLowerCase()))
    : availableRegions

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['site-regions', siteId] })

  const addMutation = useMutation({
    mutationFn: (region_name) => createRegionAssignment({ region_name, site_name: siteName }),
    onSuccess: () => {
      invalidate()
      setFilter('')
      setShowPicker(false)
    },
  })

  const removeMutation = useMutation({
    mutationFn: deleteRegionAssignment,
    onSuccess: invalidate,
  })

  if (loadingAssignments) return null

  return (
    <div className="bg-surface border border-edge rounded-md overflow-hidden">
      <div className="px-4 py-2.5 border-b border-edge flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">Regions</h3>
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
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter regions…"
            autoFocus
            className="w-full bg-surface-hi border border-edge rounded px-2.5 py-1.5 text-xs text-content placeholder:text-subtle outline-none focus:border-brand/50 transition-colors"
          />
          <div className="max-h-40 overflow-y-auto rounded border border-edge bg-canvas">
            {filteredAvailable.length === 0 ? (
              <div className="px-3 py-2 text-xs text-subtle">
                {availableRegions.length === 0 ? 'All regions assigned.' : 'No matches.'}
              </div>
            ) : (
              filteredAvailable.map(r => (
                <button
                  key={r.id ?? r.name}
                  onClick={() => addMutation.mutate(r.name)}
                  disabled={addMutation.isPending}
                  className="w-full text-left px-3 py-2 text-xs border-b border-edge/50 last:border-0 hover:bg-surface-hi transition-colors disabled:opacity-50"
                >
                  <span className="text-content font-medium">{r.display_name || r.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <div className="px-4 py-1">
        {assignedRegions.length === 0 && !showPicker ? (
          <div className="py-2.5 text-xs text-subtle">No regions assigned.</div>
        ) : (
          assignedRegions.map(r => (
            <RegionRow
              key={r.assignmentId}
              region={r}
              onRemove={removeMutation.mutate}
              removing={removeMutation.isPending}
            />
          ))
        )}
      </div>
    </div>
  )
}

function OverviewTab({ site, siteId, nodeCount, editing, draft, onDraftChange }) {
  const hasCoords = site.latitude != null && site.longitude != null

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      {/* Left: info */}
      <div className="space-y-4">
        <Card title="Site">
          {editing ? (
            <>
              <EditField label="Name" value={draft.name} onChange={v => onDraftChange('name', v)} />
              <EditField label="Display Name" value={draft.display_name} onChange={v => onDraftChange('display_name', v)} />
              <EditField label="Address"      value={draft.address}      onChange={v => onDraftChange('address', v)} />
              <EditField label="City"         value={draft.city}         onChange={v => onDraftChange('city', v)} />
              <EditField label="Country"      value={draft.country}      onChange={v => onDraftChange('country', v)} />
              <EditField label="Latitude"  type="number" value={draft.latitude}  onChange={v => onDraftChange('latitude', v)} />
              <EditField label="Longitude" type="number" value={draft.longitude} onChange={v => onDraftChange('longitude', v)} />
            </>
          ) : (
            <>
              <Field label="Name"         value={site.name} />
              <Field label="Display Name" value={site.display_name} />
              <Field label="Address"      value={site.address} />
              <Field label="City"         value={site.city} />
              <Field label="Country"      value={site.country} />
              {hasCoords && (
                <Field label="Coords" value={`${site.latitude}, ${site.longitude}`} />
              )}
            </>
          )}
        </Card>

        <RegionsCard siteId={siteId} siteName={site.name} />

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
  const navigate = useNavigate()
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
            <tr
              key={n.id}
              onClick={() => navigate(`/network/nodes/${n.id}`)}
              className="border-b border-edge/50 hover:bg-surface-hi transition-colors cursor-pointer"
            >
              <td className="py-2 pr-6">
                <Link
                  to={`/network/nodes/${n.id}`}
                  onClick={e => e.stopPropagation()}
                  className="text-content font-medium hover:text-brand transition-colors"
                >
                  {n.hostname || '—'}
                </Link>
              </td>
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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'overview'
  const getInitialData = useSiteInitialData(id)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const { data: site, isLoading } = useQuery({
    queryKey: ['site', id],
    queryFn: () => fetchSite(id),
    initialData: getInitialData,
    initialDataUpdatedAt: 0,
  })

  const siteName = site?.name

  const { data: assignmentsData } = useQuery({
    queryKey: ['site-regions', id],
    queryFn: () => fetchRegionAssignments({ site_name: siteName }),
    enabled: !!siteName,
  })
  const regions = (Array.isArray(assignmentsData) ? assignmentsData : []).map(a => a.region_name)

  const updateMutation = useMutation({
    mutationFn: (patch) => updateSite(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site', id] })
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      setEditing(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteSite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      navigate('/network/sites')
    },
  })

  const startEdit = () => {
    setDraft({
      name: site.name,
      display_name: site.display_name,
      address: site.address,
      city: site.city,
      country: site.country,
      latitude: site.latitude,
      longitude: site.longitude,
    })
    setEditing(true)
  }

  const cancelEdit = () => {
    setDraft(null)
    setEditing(false)
    setDeleteConfirm(false)
    updateMutation.reset()
  }

  const setDraftField = (key, value) => setDraft(d => ({ ...d, [key]: value }))

  const saveEdit = () => {
    if (!draft.name?.trim()) return
    const patch = { ...draft, name: draft.name.trim() }
    patch.latitude = patch.latitude !== '' && patch.latitude != null ? Number(patch.latitude) : null
    patch.longitude = patch.longitude !== '' && patch.longitude != null ? Number(patch.longitude) : null
    updateMutation.mutate(patch)
  }

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
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-content">
              {isLoading ? '—' : (site?.display_name || site?.name || name)}
            </h1>
            {site?.name && site.name !== site?.display_name && (
              <span className="text-[10px] text-subtle font-mono">{site.name}</span>
            )}
          </div>

          {!isLoading && site && !editing && (
            <div className="flex items-center gap-2">
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors"
              >
                <Pencil size={11} />
                Edit
              </button>
              {deleteMutation.isError && (
                <span className="text-[11px] text-red-400">Delete failed.</span>
              )}
              <DeleteControls
                confirming={deleteConfirm}
                onStart={() => setDeleteConfirm(true)}
                onConfirm={() => deleteMutation.mutate()}
                onCancel={() => setDeleteConfirm(false)}
                pending={deleteMutation.isPending}
                disabled={nodeCount > 0}
                disabledTitle="Cannot delete: node instances still reference this site."
              />
            </div>
          )}

          {editing && (
            <div className="flex items-center gap-2">
              {updateMutation.isError && (
                <span className="text-[11px] text-red-400">Save failed.</span>
              )}
              {deleteMutation.isError && (
                <span className="text-[11px] text-red-400">Delete failed.</span>
              )}
              <DeleteControls
                confirming={deleteConfirm}
                onStart={() => setDeleteConfirm(true)}
                onConfirm={() => deleteMutation.mutate()}
                onCancel={() => setDeleteConfirm(false)}
                pending={deleteMutation.isPending}
                disabled={nodeCount > 0}
                disabledTitle="Cannot delete: node instances still reference this site."
              />
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors"
              >
                <X size={11} />
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={updateMutation.isPending}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
              >
                <Check size={11} />
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
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
                <OverviewTab
                  site={site}
                  siteId={id}
                  nodeCount={nodeCount}
                  editing={editing}
                  draft={draft}
                  onDraftChange={setDraftField}
                />
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
