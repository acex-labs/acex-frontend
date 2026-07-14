import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import {
  fetchCollectionAgents, createCollectionAgent, updateCollectionAgent, deleteCollectionAgent,
  addCollectionAgentNode, removeCollectionAgentNode,
  addCollectionAgentRule, removeCollectionAgentRule,
} from '../../api/inventory'
import { useQueryParams } from '../../hooks/useQueryParams'
import PageHeader from '../../components/ui/PageHeader'
import TableToolbar from '../../components/table/TableToolbar'
import DataTable from '../../components/table/DataTable'
import Pagination from '../../components/table/Pagination'
import MatchRulesPanel from '../../components/agents/MatchRulesPanel'
import NodeAssignmentPanel from '../../components/agents/NodeAssignmentPanel'
import ResolvedNodesModal from '../../components/agents/ResolvedNodesModal'
import DeployInstructionsPanel from '../../components/agents/DeployInstructionsPanel'
import { getAgentStatus, getConfigSyncStatus, timeAgo, formatInterval, statusClasses } from '../../components/agents/agentUtils'

const DEFAULTS = { name: '', limit: 50, offset: 0 }
const FILTERS  = [{ key: 'name', label: 'Name', width: '180px' }]

const EMPTY_CREATE = { name: '', description: '', interval_seconds: 21600, enabled: true }

function Section({ title, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">{title}</span>
        <div className="flex-1 h-px bg-edge" />
      </div>
      {children}
    </div>
  )
}

export default function CollectionAgentsPage() {
  const qc = useQueryClient()
  const [params, setParams] = useQueryParams(DEFAULTS)
  const [selectedId, setSelectedId] = useState(null)

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ ...EMPTY_CREATE })

  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({ ...EMPTY_CREATE })

  const [showResolved, setShowResolved] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['collection-agents', params],
    queryFn: () => fetchCollectionAgents(params),
    placeholderData: keepPreviousData,
    refetchInterval: 10000,
  })

  const agents  = data?.items ?? []
  const total   = data?.total ?? 0
  const selected = agents.find(a => a.id === selectedId) ?? null

  const invalidate = () => qc.invalidateQueries({ queryKey: ['collection-agents'] })

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createCollectionAgent,
    onSuccess: () => { invalidate(); setShowCreate(false); setCreateForm({ ...EMPTY_CREATE }) },
  })

  const editMutation = useMutation({
    mutationFn: (patch) => updateCollectionAgent(selected.id, patch),
    onSuccess: () => { invalidate(); setShowEdit(false) },
  })

  const handleDelete = async () => {
    if (!selected) return
    setDeleting(true)
    try {
      await deleteCollectionAgent(selected.id)
      invalidate()
      setSelectedId(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleOpenEdit = () => {
    setEditForm({
      name: selected.name,
      description: selected.description || '',
      interval_seconds: selected.interval_seconds,
      enabled: selected.enabled,
    })
    setShowEdit(true)
  }

  const handleAddNodes = async (nodeIds) => {
    for (const id of nodeIds) {
      await addCollectionAgentNode(selected.id, id).catch(() => {})
    }
    invalidate()
  }

  const handleRemoveNode = async (nodeId) => {
    await removeCollectionAgentNode(selected.id, nodeId)
    invalidate()
  }

  const handleAddRule = async (payload) => {
    await addCollectionAgentRule(selected.id, payload)
    invalidate()
  }

  const handleRemoveRule = async (ruleId) => {
    await removeCollectionAgentRule(selected.id, ruleId)
    invalidate()
  }

  // ── Columns ────────────────────────────────────────────────────────────────
  const COLUMNS = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'description', label: 'Description' },
    {
      key: 'interval_seconds', label: 'Interval',
      render: (v) => <span className="font-mono text-xs">{formatInterval(v)}</span>,
    },
    {
      key: 'enabled', label: 'Enabled',
      render: (v) => (
        <span className={`text-xs font-medium ${v ? 'text-emerald-400' : 'text-subtle'}`}>
          {v ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'resolved_nodes', label: 'Nodes',
      render: (v) => <span className="font-medium">{(v || []).length}</span>,
    },
    {
      key: 'config_revision', label: 'Rev',
      render: (v, row) => {
        const sync = getConfigSyncStatus(row)
        return (
          <span className="flex items-center gap-1.5" title={sync.tip}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${sync.variant === 'green' ? 'bg-emerald-400' : sync.variant === 'yellow' ? 'bg-amber-400' : 'bg-subtle'}`} />
            <span className="text-xs">{row.config_revision || 0}</span>
          </span>
        )
      },
    },
    {
      key: 'acked_at', label: 'Status',
      render: (v, row) => {
        const s = getAgentStatus(row)
        return (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusClasses(s.variant)}`}>
            {s.label}
          </span>
        )
      },
    },
  ]

  const handleRowClick = (row) => setSelectedId(prev => prev === row.id ? null : row.id)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Collection Agents"
        description={total > 0 ? `${total} agent${total !== 1 ? 's' : ''}` : undefined}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold border border-edge text-subtle hover:text-content transition-colors"
          >
            <Plus size={12} />
            Add agent
          </button>
        }
      />

      <TableToolbar
        filters={FILTERS}
        values={{ name: params.name }}
        onChange={vals => setParams({ ...vals, offset: 0 })}
      />

      {selected ? (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="overflow-auto border-b border-edge" style={{ height: '260px' }}>
            <DataTable
              columns={COLUMNS}
              data={agents}
              isLoading={isLoading}
              onRowClick={handleRowClick}
            />
          </div>
          <Pagination
            offset={params.offset}
            limit={params.limit}
            total={total}
            onChange={offset => setParams({ offset })}
          />
          <div className="flex-1 overflow-auto">
            <DetailPanel
              agent={selected}
              onClose={() => setSelectedId(null)}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              deleting={deleting}
              onAddNodes={handleAddNodes}
              onRemoveNode={handleRemoveNode}
              onAddRule={handleAddRule}
              onRemoveRule={handleRemoveRule}
              onBrowseResolved={() => setShowResolved(true)}
            />
          </div>
        </div>
      ) : (
        <>
          <DataTable
            columns={COLUMNS}
            data={agents}
            isLoading={isLoading}
            onRowClick={handleRowClick}
          />
          <Pagination
            offset={params.offset}
            limit={params.limit}
            total={total}
            onChange={offset => setParams({ offset })}
          />
        </>
      )}

      {showCreate && (
        <AgentFormModal
          title="New Collection Agent"
          subtitle="Configure name, description and collection schedule."
          form={createForm}
          onChange={setCreateForm}
          onSave={() => createMutation.mutate(createForm)}
          saving={createMutation.isPending}
          onClose={() => setShowCreate(false)}
        />
      )}

      {showEdit && selected && (
        <AgentFormModal
          title="Edit Collection Agent"
          subtitle="Update name, description, interval or enabled state."
          form={editForm}
          onChange={setEditForm}
          onSave={() => editMutation.mutate(editForm)}
          saving={editMutation.isPending}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showResolved && selected && (
        <ResolvedNodesModal
          resolvedNodes={selected.resolved_nodes ?? []}
          explicitNodes={selected.nodes ?? []}
          onClose={() => setShowResolved(false)}
        />
      )}
    </div>
  )
}

// ── Detail Panel ───────────────────────────────────────────────────────────

function DetailPanel({ agent, onClose, onEdit, onDelete, deleting, onAddNodes, onRemoveNode, onAddRule, onRemoveRule, onBrowseResolved }) {
  const status   = getAgentStatus(agent)
  const sync     = getConfigSyncStatus(agent)
  const explicit = agent.nodes ?? []
  const resolved = agent.resolved_nodes ?? []
  const rules    = agent.rules ?? []

  return (
    <div className="border-b border-edge">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-edge">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-content">{agent.name}</h2>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${agent.enabled ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-subtle bg-surface border-edge'}`}>
              {agent.enabled ? 'Enabled' : 'Disabled'}
            </span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusClasses(status.variant)}`}>
              {status.label}
            </span>
          </div>
          {agent.description && <p className="text-xs text-subtle mt-0.5">{agent.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="px-3 py-1 rounded text-xs border border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40 transition-colors disabled:opacity-40"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-subtle hover:text-content hover:bg-surface-hi transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-6 py-3 border-b border-edge bg-surface/50">
        {[
          { label: 'Interval',  value: formatInterval(agent.interval_seconds) },
          { label: 'Rules',     value: rules.length },
          { label: 'Explicit',  value: explicit.length },
          { label: 'Resolved',  value: resolved.length },
          { label: 'Last ack',  value: timeAgo(agent.acked_at) },
        ].map(s => (
          <div key={s.label} className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-content tabular-nums">{s.value}</span>
            <span className="text-[10px] text-subtle uppercase tracking-wide">{s.label}</span>
          </div>
        ))}
        <div className="flex items-baseline gap-1.5" title={sync.tip}>
          <span className={`text-base font-bold tabular-nums ${sync.variant === 'green' ? 'text-emerald-400' : sync.variant === 'yellow' ? 'text-amber-400' : 'text-subtle'}`}>
            {agent.config_revision || 0}
          </span>
          <span className="text-[10px] text-subtle uppercase tracking-wide">Config rev</span>
          <span className={`text-[10px] ${sync.variant === 'green' ? 'text-emerald-400' : sync.variant === 'yellow' ? 'text-amber-400' : 'text-subtle'}`}>
            · {sync.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 grid grid-cols-2 gap-8">
        {/* Left column */}
        <div className="space-y-6">
          <Section title="Match Rules">
            <MatchRulesPanel
              rules={rules}
              onAdd={onAddRule}
              onRemove={onRemoveRule}
            />
          </Section>
          <Section title="Nodes">
            <NodeAssignmentPanel
              nodes={explicit}
              resolvedNodes={resolved}
              onAdd={onAddNodes}
              onRemove={onRemoveNode}
              onBrowseResolved={onBrowseResolved}
            />
          </Section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Deploy</span>
              <div className="flex-1 h-px bg-edge" />
            </div>
            <DeployInstructionsPanel
              agentType="collection"
              agentId={agent.id}
              agentName={agent.name}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Agent Form Modal (create + edit) ─────────────────────────────────────────

function AgentFormModal({ title, subtitle, form, onChange, onSave, saving, onClose }) {
  const set = (key, val) => onChange(p => ({ ...p, [key]: val }))
  const intervalLabel = formatInterval(form.interval_seconds)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-canvas border border-edge rounded-xl w-[460px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge">
          <div>
            <h3 className="text-sm font-semibold text-content">{title}</h3>
            <p className="text-[11px] text-subtle mt-0.5">{subtitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-subtle hover:text-content hover:bg-surface-hi transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <Field label="Name *" value={form.name} onChange={v => set('name', v)} autoFocus />
          <Field label="Description" value={form.description} onChange={v => set('description', v)} />

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-subtle mb-1">
              Interval (seconds)
              {intervalLabel !== '—' && <span className="ml-2 normal-case font-normal text-brand">= {intervalLabel}</span>}
            </label>
            <input
              type="number"
              value={form.interval_seconds}
              onChange={e => set('interval_seconds', parseInt(e.target.value) || 0)}
              min={60}
              className="w-full h-7 px-2.5 text-xs rounded border border-edge bg-surface-hi text-content focus:outline-none focus:border-brand/50 transition-colors"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="text-xs text-content">Enabled</label>
            <button
              onClick={() => set('enabled', !form.enabled)}
              className={[
                'relative w-9 h-5 rounded-full transition-colors border',
                form.enabled ? 'bg-emerald-500/80 border-emerald-500/60' : 'bg-surface-hi border-edge',
              ].join(' ')}
            >
              <span className={[
                'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
                form.enabled ? 'translate-x-4' : '',
              ].join(' ')} />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-edge">
          <button onClick={onClose} className="px-4 py-1.5 text-xs text-subtle hover:text-content hover:bg-surface-hi rounded transition-colors">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!form.name || saving}
            className="px-4 py-1.5 text-xs font-medium text-content bg-surface-hi hover:bg-edge rounded border border-edge transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, autoFocus = false }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-subtle mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        autoFocus={autoFocus}
        className="w-full h-7 px-2.5 text-xs rounded border border-edge bg-surface-hi text-content placeholder:text-subtle/50 focus:outline-none focus:border-brand/50 transition-colors"
      />
    </div>
  )
}
