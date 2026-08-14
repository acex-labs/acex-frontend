import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Plus, X, ExternalLink } from 'lucide-react'
import {
  fetchTelemetryAgents, createTelemetryAgent, deleteTelemetryAgent, updateTelemetryAgent,
  addAgentNode, removeAgentNode,
  addAgentRule, removeAgentRule,
  addAgentOutput, removeAgentOutput,
} from '../../api/observability'
import { useQueryParams } from '../../hooks/useQueryParams'
import PageHeader from '../../components/ui/PageHeader'
import TableToolbar from '../../components/table/TableToolbar'
import DataTable from '../../components/table/DataTable'
import Pagination from '../../components/table/Pagination'
import MatchRulesPanel from '../../components/agents/MatchRulesPanel'
import NodeAssignmentPanel from '../../components/agents/NodeAssignmentPanel'
import ResolvedNodesModal from '../../components/agents/ResolvedNodesModal'
import DeployInstructionsPanel from '../../components/agents/DeployInstructionsPanel'
import SnmpSyslogSettingsPanel from '../../components/agents/SnmpSyslogSettingsPanel'
import SnmpSyslogFields from '../../components/agents/SnmpSyslogFields'
import { SNMP_SYSLOG_DEFAULTS, snmpSyslogPayload } from '../../components/agents/agentUtils'
import { getAgentStatus, getConfigSyncStatus, timeAgo, statusClasses } from '../../components/agents/agentUtils'
import { API_URL } from '../../config'

const CAPABILITIES = [
  { value: 'snmp',          label: 'SNMP'          },
  { value: 'icmp',          label: 'ICMP'          },
  { value: 'snmp_trap',     label: 'SNMP Trap'     },
  { value: 'syslog_rfc5424', label: 'Syslog RFC5424' },
  { value: 'mdt',           label: 'MDT'           },
]

const ALL_CAPS = CAPABILITIES.map(c => c.value)

const INFLUXDB_VERSIONS = ['v1', 'v2', 'v3']
const EMPTY_OUTPUT = { influxdb_version: 'v2', url: 'http://localhost:8086', token: '', organization: '', bucket: '', database: '', username: '', password: '' }

const DEFAULTS = { name: '', limit: 50, offset: 0 }
const FILTERS  = [{ key: 'name', label: 'Name', width: '180px' }]

function CapBadge({ label }) {
  return (
    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded text-brand bg-brand/10 border border-brand/20">
      {label}
    </span>
  )
}

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

export default function TelemetryAgentsPage() {
  const qc = useQueryClient()
  const [params, setParams] = useQueryParams(DEFAULTS)
  const [selectedId, setSelectedId] = useState(null)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const emptyCreateForm = () => ({ name: '', description: '', capabilities: [...ALL_CAPS], ...SNMP_SYSLOG_DEFAULTS })
  const [createForm, setCreateForm] = useState(emptyCreateForm)

  // Add output modal
  const [showAddOutput, setShowAddOutput] = useState(false)
  const [outputForm, setOutputForm] = useState({ ...EMPTY_OUTPUT })

  // Browse resolved nodes
  const [showResolved, setShowResolved] = useState(false)

  // Delete loading
  const [deleting, setDeleting] = useState(false)

  // ── Data ─────────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['telemetry-agents', params],
    queryFn: () => fetchTelemetryAgents(params),
    placeholderData: keepPreviousData,
    refetchInterval: 10000,
  })

  const agents  = data?.items ?? []
  const total   = data?.total ?? 0
  const selected = agents.find(a => a.id === selectedId) ?? null

  const invalidate = () => qc.invalidateQueries({ queryKey: ['telemetry-agents'] })

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createTelemetryAgent,
    onSuccess: () => { invalidate(); setShowCreate(false); setCreateForm(emptyCreateForm()) },
  })

  const handleCreate = () => {
    const { name, description, capabilities } = createForm
    const payload = {
      name,
      description: description || null,
      capabilities,
      ...(capabilities.includes('snmp_trap') || capabilities.includes('syslog_rfc5424')
        ? snmpSyslogPayload(createForm)
        : {}),
    }
    createMutation.mutate(payload)
  }

  const handleDelete = async () => {
    if (!selected) return
    setDeleting(true)
    try {
      await deleteTelemetryAgent(selected.id)
      invalidate()
      setSelectedId(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleAddNodes = async (nodeIds) => {
    for (const id of nodeIds) {
      await addAgentNode(selected.id, id).catch(() => {})
    }
    invalidate()
  }

  const handleRemoveNode = async (nodeId) => {
    await removeAgentNode(selected.id, nodeId)
    invalidate()
  }

  const handleAddRule = async (payload) => {
    await addAgentRule(selected.id, payload)
    invalidate()
  }

  const handleRemoveRule = async (ruleId) => {
    await removeAgentRule(selected.id, ruleId)
    invalidate()
  }

  const handleAddOutput = async () => {
    await addAgentOutput(selected.id, outputForm)
    invalidate()
    setShowAddOutput(false)
    setOutputForm({ ...EMPTY_OUTPUT })
  }

  const handleRemoveOutput = async (outputId) => {
    await removeAgentOutput(selected.id, outputId)
    invalidate()
  }

  const handleUpdateAgent = async (payload) => {
    await updateTelemetryAgent(selected.id, payload)
    invalidate()
  }

  const toggleCap = (cap) => {
    setCreateForm(p => ({
      ...p,
      capabilities: p.capabilities.includes(cap)
        ? p.capabilities.filter(c => c !== cap)
        : [...p.capabilities, cap],
    }))
  }

  // ── Columns ───────────────────────────────────────────────────────────────────
  const COLUMNS = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'description', label: 'Description' },
    {
      key: 'capabilities', label: 'Capabilities',
      render: (caps) => (
        <div className="flex flex-wrap gap-1">
          {(caps || []).map(c => {
            const info = CAPABILITIES.find(x => x.value === c)
            return <CapBadge key={c} label={info?.label ?? c} />
          })}
        </div>
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

  // ── Layout ────────────────────────────────────────────────────────────────────
  const handleRowClick = (row) => setSelectedId(prev => prev === row.id ? null : row.id)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Telemetry Agents"
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
        // Split view: table (fixed height) + detail panel
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
              onDelete={handleDelete}
              deleting={deleting}
              onAddNodes={handleAddNodes}
              onRemoveNode={handleRemoveNode}
              onAddRule={handleAddRule}
              onRemoveRule={handleRemoveRule}
              onOpenAddOutput={() => setShowAddOutput(true)}
              onRemoveOutput={handleRemoveOutput}
              onBrowseResolved={() => setShowResolved(true)}
              onUpdateAgent={handleUpdateAgent}
            />
          </div>
        </div>
      ) : (
        // Full table view
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

      {/* Modals */}
      {showCreate && (
        <CreateModal
          form={createForm}
          onChange={setCreateForm}
          onToggleCap={toggleCap}
          onSave={handleCreate}
          saving={createMutation.isPending}
          onClose={() => setShowCreate(false)}
        />
      )}

      {showAddOutput && selected && (
        <AddOutputModal
          form={outputForm}
          onChange={setOutputForm}
          onSave={handleAddOutput}
          onClose={() => setShowAddOutput(false)}
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

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({ agent, onClose, onDelete, deleting, onAddNodes, onRemoveNode, onAddRule, onRemoveRule, onOpenAddOutput, onRemoveOutput, onBrowseResolved, onUpdateAgent }) {
  const status   = getAgentStatus(agent)
  const sync     = getConfigSyncStatus(agent)
  const explicit = agent.nodes ?? []
  const resolved = agent.resolved_nodes ?? []
  const rules    = agent.rules ?? []
  const outputs  = agent.outputs ?? []

  return (
    <div className="border-b border-edge">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-edge">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-content">{agent.name}</h2>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusClasses(status.variant)}`}>
              {status.label}
            </span>
          </div>
          {agent.description && <p className="text-xs text-subtle mt-0.5">{agent.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`${API_URL}/api/v1/observability/agents/${agent.id}/config`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors"
          >
            <ExternalLink size={11} />
            View config
          </a>
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
          { label: 'Capabilities', value: (agent.capabilities || []).length },
          { label: 'Rules',        value: rules.length },
          { label: 'Explicit',     value: explicit.length },
          { label: 'Resolved',     value: resolved.length },
          { label: 'Last ack',     value: timeAgo(agent.acked_at) },
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
          {/* Capabilities */}
          <Section title="Capabilities">
            {(agent.capabilities || []).length === 0 ? (
              <p className="text-xs text-subtle/50">No capabilities configured.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {agent.capabilities.map(cap => {
                  const info = CAPABILITIES.find(c => c.value === cap)
                  return <CapBadge key={cap} label={info?.label ?? cap} />
                })}
              </div>
            )}
          </Section>

          {/* SNMP / Syslog receivers */}
          {((agent.capabilities ?? []).includes('snmp_trap') || (agent.capabilities ?? []).includes('syslog_rfc5424')) && (
            <Section title="SNMP / Syslog">
              <SnmpSyslogSettingsPanel agent={agent} onSave={onUpdateAgent} />
            </Section>
          )}

          {/* Match rules */}
          <Section title="Match Rules">
            <MatchRulesPanel
              rules={rules}
              onAdd={onAddRule}
              onRemove={onRemoveRule}
            />
          </Section>

          {/* Nodes */}
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
          {/* Output destinations */}
          <Section title="Output Destinations">
            <OutputsPanel outputs={outputs} onAdd={onOpenAddOutput} onRemove={onRemoveOutput} />
          </Section>

          {/* Deploy */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Deploy</span>
              <div className="flex-1 h-px bg-edge" />
            </div>
            <DeployInstructionsPanel
              agentType="telemetry"
              agentId={agent.id}
              agentName={agent.name}
              agent={agent}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Outputs Panel ─────────────────────────────────────────────────────────────

function OutputsPanel({ outputs, onAdd, onRemove }) {
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Destinations</span>
        <button
          onClick={onAdd}
          className="text-xs text-subtle hover:text-content transition-colors px-2 py-1 rounded hover:bg-surface-hi"
        >
          Add output
        </button>
      </div>

      {outputs.length === 0 ? (
        <p className="text-xs text-subtle/50">No outputs. Generated config will have no output destinations.</p>
      ) : (
        <div className="space-y-1.5">
          {outputs.map(out => (
            <div
              key={out.id}
              className="group flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-400/5 border border-emerald-400/15"
            >
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-emerald-400/60 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-content">{out.url}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded text-emerald-400 bg-emerald-400/10">
                      {out.influxdb_version}
                    </span>
                  </div>
                  <span className="text-[11px] text-subtle">
                    {out.influxdb_version === 'v2'
                      ? [out.organization, out.bucket].filter(Boolean).join(' / ') || 'No org/bucket'
                      : out.influxdb_version === 'v3'
                        ? [out.organization, out.database].filter(Boolean).join(' / ') || 'No org/database'
                        : out.database || 'No database'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onRemove(out.id)}
                className="opacity-0 group-hover:opacity-100 text-xs text-red-400/60 hover:text-red-400 transition-all"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Create Modal ──────────────────────────────────────────────────────────────

function CreateModal({ form, onChange, onToggleCap, onSave, saving, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-canvas border border-edge rounded-xl w-[480px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge">
          <div>
            <h3 className="text-sm font-semibold text-content">New Telemetry Agent</h3>
            <p className="text-[11px] text-subtle mt-0.5">Configure name, description and capabilities.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-subtle hover:text-content hover:bg-surface-hi transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-subtle mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => onChange(p => ({ ...p, name: e.target.value }))}
              autoFocus
              placeholder="my-telemetry-agent"
              className="w-full h-7 px-2.5 text-xs rounded border border-edge bg-surface-hi text-content placeholder:text-subtle/50 focus:outline-none focus:border-brand/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-subtle mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => onChange(p => ({ ...p, description: e.target.value }))}
              placeholder="Optional description"
              className="w-full h-7 px-2.5 text-xs rounded border border-edge bg-surface-hi text-content placeholder:text-subtle/50 focus:outline-none focus:border-brand/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-subtle mb-2">Capabilities</label>
            <div className="grid grid-cols-2 gap-1">
              {CAPABILITIES.map(cap => {
                const active = form.capabilities.includes(cap.value)
                return (
                  <button
                    key={cap.value}
                    onClick={() => onToggleCap(cap.value)}
                    className={[
                      'flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-left transition-colors border',
                      active
                        ? 'text-brand bg-brand/10 border-brand/30'
                        : 'text-subtle bg-surface-hi border-edge hover:text-content',
                    ].join(' ')}
                  >
                    <span className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${active ? 'bg-brand border-brand' : 'border-subtle'}`}>
                      {active && <span className="text-white text-[8px] font-bold">✓</span>}
                    </span>
                    {cap.label}
                  </button>
                )
              })}
            </div>
          </div>

          {(form.capabilities.includes('snmp_trap') || form.capabilities.includes('syslog_rfc5424')) && (
            <div className="border-t border-edge pt-3">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-subtle mb-2">SNMP / Syslog Receivers</label>
              <SnmpSyslogFields
                form={form}
                onChange={(key, val) => onChange(p => ({ ...p, [key]: val }))}
                hasSnmpTrap={form.capabilities.includes('snmp_trap')}
                hasSyslog={form.capabilities.includes('syslog_rfc5424')}
              />
            </div>
          )}
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
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Output Modal ──────────────────────────────────────────────────────────

function AddOutputModal({ form, onChange, onSave, onClose }) {
  const set = (key, val) => onChange(p => ({ ...p, [key]: val }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-canvas border border-edge rounded-xl w-[480px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge">
          <div>
            <h3 className="text-sm font-semibold text-content">Add Output Destination</h3>
            <p className="text-[11px] text-subtle mt-0.5">Configure where telemetry data is sent.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-subtle hover:text-content hover:bg-surface-hi transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Version selector */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-subtle mb-2">InfluxDB Version</label>
            <div className="flex gap-1">
              {INFLUXDB_VERSIONS.map(v => (
                <button
                  key={v}
                  onClick={() => set('influxdb_version', v)}
                  className={[
                    'px-4 py-1.5 text-xs rounded border transition-colors',
                    form.influxdb_version === v
                      ? 'text-content border-edge bg-surface-hi'
                      : 'text-subtle border-edge/50 hover:text-content hover:bg-surface-hi',
                  ].join(' ')}
                >
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <Field label="URL *" value={form.url} onChange={v => set('url', v)} placeholder="http://localhost:8086" />

          {form.influxdb_version === 'v2' && <>
            <Field label="Token" value={form.token} onChange={v => set('token', v)} type="password" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Organization" value={form.organization} onChange={v => set('organization', v)} />
              <Field label="Bucket" value={form.bucket} onChange={v => set('bucket', v)} />
            </div>
          </>}

          {form.influxdb_version === 'v3' && <>
            <Field label="Token" value={form.token} onChange={v => set('token', v)} type="password" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Organization" value={form.organization} onChange={v => set('organization', v)} />
              <Field label="Database" value={form.database} onChange={v => set('database', v)} />
            </div>
          </>}

          {form.influxdb_version === 'v1' && <>
            <Field label="Database" value={form.database} onChange={v => set('database', v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Username" value={form.username} onChange={v => set('username', v)} />
              <Field label="Password" value={form.password} onChange={v => set('password', v)} type="password" />
            </div>
          </>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-edge">
          <button onClick={onClose} className="px-4 py-1.5 text-xs text-subtle hover:text-content hover:bg-surface-hi rounded transition-colors">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!form.url}
            className="px-4 py-1.5 text-xs font-medium text-content bg-surface-hi hover:bg-edge rounded border border-edge transition-colors disabled:opacity-40"
          >
            Add output
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-subtle mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-7 px-2.5 text-xs rounded border border-edge bg-surface-hi text-content placeholder:text-subtle/50 focus:outline-none focus:border-brand/50 transition-colors"
      />
    </div>
  )
}
