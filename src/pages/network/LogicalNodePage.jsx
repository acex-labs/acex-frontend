import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Pencil, Trash2, X, Check } from 'lucide-react'
import { fetchLogicalNode, updateLogicalNode, deleteLogicalNode, fetchNodes } from '../../api/inventory'

function Field({ label, value }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex gap-4 py-2 border-b border-edge last:border-0">
      <dt className="w-28 shrink-0 text-[11px] text-subtle">{label}</dt>
      <dd className="text-xs text-content break-all">{value}</dd>
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

function RegionBadge({ name }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-brand/10 text-brand border border-brand/20">
      {name}
    </span>
  )
}

function NodeInstancesCard({ hostname }) {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['nodes', { hostname, limit: 50 }],
    queryFn: () => fetchNodes({ hostname, limit: 50 }),
    enabled: !!hostname,
  })
  const instances = data?.items ?? []

  return (
    <div className="bg-surface border border-edge rounded-md overflow-hidden">
      <div className="px-4 py-2.5 border-b border-edge">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">Node Instances</h3>
      </div>
      {isLoading ? (
        <div className="px-4 py-3 text-xs text-subtle animate-pulse">Loading…</div>
      ) : instances.length === 0 ? (
        <div className="px-4 py-3 text-xs text-subtle">No node instance created for this logical node yet.</div>
      ) : (
        <div>
          {instances.map(n => (
            <div
              key={n.id}
              onClick={() => navigate(`/network/nodes/${n.id}`)}
              className="px-4 py-2.5 border-b border-edge/50 last:border-0 flex items-center gap-2 cursor-pointer hover:bg-surface-hi transition-colors"
            >
              <span className="text-xs font-medium text-content">{n.hostname}</span>
              <span className="text-[10px] text-subtle ml-auto">{n.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function LogicalNodePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const { data: node, isLoading } = useQuery({
    queryKey: ['logical-node', id],
    queryFn: () => fetchLogicalNode(id),
  })

  const { data: instancesData } = useQuery({
    queryKey: ['nodes', { hostname: node?.hostname, limit: 1 }],
    queryFn: () => fetchNodes({ hostname: node.hostname, limit: 1 }),
    enabled: !!node?.hostname,
  })
  const instanceCount = instancesData?.total ?? 0

  const mutation = useMutation({
    mutationFn: (data) => updateLogicalNode(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['logical-node', id], updated)
      queryClient.invalidateQueries({ queryKey: ['logical-nodes'] })
      setEditing(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteLogicalNode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logical-nodes'] })
      navigate('/network/logical-nodes')
    },
  })

  const startEdit = () => {
    setDraft({ hostname: node.hostname, role: node.role, site: node.site, sequence: node.sequence })
    setEditing(true)
  }

  const cancelEdit = () => {
    setDraft(null)
    setEditing(false)
    mutation.reset()
  }

  const save = () => {
    if (!draft.hostname?.trim()) return
    mutation.mutate({
      ...draft,
      sequence: draft.sequence !== '' && draft.sequence != null ? Number(draft.sequence) : null,
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-3 border-b border-edge shrink-0">
        <Link
          to="/network/logical-nodes"
          className="inline-flex items-center gap-1 text-[11px] text-subtle hover:text-content mb-2 transition-colors"
        >
          <ChevronLeft size={11} />
          Logical Nodes
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-sm font-semibold text-content">
            {isLoading ? '—' : (node?.hostname || `Logical Node ${id}`)}
          </h1>

          {!isLoading && node && !editing && (
            <div className="flex items-center gap-2">
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors"
              >
                <Pencil size={11} />
                Edit
              </button>
              {deleteConfirm ? (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-red-400">Delete?</span>
                  <button
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="px-2 py-1 rounded text-[11px] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="px-2 py-1 rounded text-[11px] border border-edge text-subtle hover:text-content transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  disabled={instanceCount > 0}
                  title={instanceCount > 0 ? 'Cannot delete: a node instance still references this logical node.' : undefined}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-edge text-subtle hover:text-red-400 disabled:opacity-40 disabled:hover:text-subtle transition-colors"
                >
                  <Trash2 size={11} />
                  Delete
                </button>
              )}
            </div>
          )}

          {editing && (
            <div className="flex items-center gap-2">
              {mutation.isError && (
                <span className="text-[11px] text-red-400">Save failed.</span>
              )}
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors"
              >
                <X size={11} />
                Cancel
              </button>
              <button
                onClick={save}
                disabled={mutation.isPending || !draft?.hostname?.trim()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
              >
                <Check size={11} />
                {mutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-xs text-subtle animate-pulse">Loading…</div>
        ) : !node ? (
          <div className="text-xs text-subtle">Logical node not found.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-3xl">
            <div className="bg-surface border border-edge rounded-md overflow-hidden">
              <div className="px-4 py-2.5 border-b border-edge">
                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">Logical Node</h3>
              </div>
              <div className="px-4 py-3">
                {editing ? (
                  <>
                    <EditField label="Hostname" value={draft.hostname} onChange={v => setDraft(d => ({ ...d, hostname: v }))} />
                    <EditField label="Role" value={draft.role} onChange={v => setDraft(d => ({ ...d, role: v }))} />
                    <EditField label="Site" value={draft.site} onChange={v => setDraft(d => ({ ...d, site: v }))} />
                    <EditField label="Sequence" type="number" value={draft.sequence} onChange={v => setDraft(d => ({ ...d, sequence: v }))} />
                  </>
                ) : (
                  <dl>
                    <Field label="Hostname" value={node.hostname} />
                    <Field label="Role"     value={node.role} />
                    <Field label="Site"     value={node.site} />
                    <Field label="Sequence" value={node.sequence} />
                    <Field label="ID"       value={node.id} />
                    {node.regions?.length > 0 && (
                      <div className="flex gap-4 py-2 items-center">
                        <dt className="w-28 shrink-0 text-[11px] text-subtle">Regions</dt>
                        <dd className="flex flex-wrap gap-1.5">
                          {node.regions.map(r => <RegionBadge key={r} name={r} />)}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>
            </div>

            <NodeInstancesCard hostname={node.hostname} />
          </div>
        )}
      </div>
    </div>
  )
}
