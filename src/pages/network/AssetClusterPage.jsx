import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Pencil, Trash2, X, Check, Plus } from 'lucide-react'
import {
  fetchAssetCluster,
  updateAssetCluster,
  deleteAssetCluster,
  fetchAssets,
} from '../../api/inventory'
import VendorIcon from '../../components/ui/VendorIcon'

function Field({ label, value }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex gap-4 py-2 border-b border-edge last:border-0">
      <dt className="w-32 shrink-0 text-[11px] text-subtle">{label}</dt>
      <dd className="text-xs text-content break-all">{value}</dd>
    </div>
  )
}

function DeleteConfirm({ onConfirm, onCancel, pending }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onConfirm}
        disabled={pending}
        className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
      >
        Confirm
      </button>
      <button
        onClick={onCancel}
        className="px-1.5 py-0.5 rounded text-[10px] border border-edge text-subtle hover:text-content transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}

function MembersCard({ cluster, clusterId }) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [confirmRemoveId, setConfirmRemoveId] = useState(null)

  const members = cluster.assets ?? []
  const memberIds = members.map(m => m.id)

  const { data: unassignedData } = useQuery({
    queryKey: ['assets-picker', 'unassigned'],
    queryFn: () => fetchAssets({ assigned: false, limit: 200 }),
    enabled: adding,
  })
  const available = unassignedData?.items ?? []

  const invalidate = (updated) => {
    queryClient.setQueryData(['asset-cluster', String(clusterId)], updated)
    queryClient.invalidateQueries({ queryKey: ['asset-clusters'] })
  }

  const addMutation = useMutation({
    mutationFn: (assetId) => updateAssetCluster(clusterId, { asset_ids: [...memberIds, assetId] }),
    onSuccess: (updated) => {
      invalidate(updated)
      setAdding(false)
      setSelectedAssetId('')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (assetId) => updateAssetCluster(clusterId, { asset_ids: memberIds.filter(id => id !== assetId) }),
    onSuccess: (updated) => {
      invalidate(updated)
      setConfirmRemoveId(null)
    },
  })

  return (
    <div className="bg-surface border border-edge rounded-md overflow-hidden flex flex-col">
      <div className="px-4 py-2.5 border-b border-edge flex items-center justify-between shrink-0">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">Member Assets</h3>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-[11px] text-brand hover:text-brand/80 font-semibold transition-colors"
          >
            <Plus size={11} />
            Add
          </button>
        )}
      </div>

      {members.length === 0 && !adding ? (
        <div className="px-4 py-3 text-xs text-subtle">No assets assigned to this cluster.</div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {members
            .slice()
            .sort((a, b) => (a.cluster_index ?? 0) - (b.cluster_index ?? 0))
            .map((m, i) => (
              <div key={m.id} className="px-4 py-2.5 border-b border-edge/50 last:border-0 flex items-center gap-2">
                <VendorIcon vendor={m.vendor} size={13} />
                <span className="text-xs font-medium text-content truncate">
                  {[m.vendor, m.hardware_model].filter(Boolean).join(' ') || `Asset ${m.id}`}
                </span>
                <span className="text-[10px] text-subtle shrink-0">Unit {m.cluster_index ?? i + 1}</span>
                {m.serial_number && <span className="text-[11px] text-subtle font-mono">SN: {m.serial_number}</span>}
                <div className="ml-auto shrink-0">
                  {confirmRemoveId === m.id ? (
                    <DeleteConfirm
                      pending={removeMutation.isPending}
                      onConfirm={() => removeMutation.mutate(m.id)}
                      onCancel={() => setConfirmRemoveId(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setConfirmRemoveId(m.id)}
                      className="text-subtle hover:text-red-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}

          {adding && (
            <div className="px-4 py-3 border-b border-edge/50 last:border-0 space-y-2">
              <select
                value={selectedAssetId}
                onChange={e => setSelectedAssetId(e.target.value)}
                autoFocus
                className="w-full bg-surface-hi border border-edge rounded px-2 py-1.5 text-xs text-content outline-none focus:border-brand/50 transition-colors"
              >
                <option value="">Select an asset…</option>
                {available.map(a => (
                  <option key={a.id} value={a.id}>
                    {[a.vendor, a.hardware_model].filter(Boolean).join(' ')} {a.serial_number ? `(SN: ${a.serial_number})` : ''}
                  </option>
                ))}
              </select>
              {addMutation.isError && (
                <div className="text-[11px] text-red-400">Failed to add asset.</div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => addMutation.mutate(Number(selectedAssetId))}
                  disabled={!selectedAssetId || addMutation.isPending}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-brand text-white rounded disabled:opacity-40 transition-opacity"
                >
                  {addMutation.isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setAdding(false)}
                  className="px-2.5 py-1 text-[11px] text-subtle hover:text-content border border-edge rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AssetClusterPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const { data: cluster, isLoading } = useQuery({
    queryKey: ['asset-cluster', id],
    queryFn: () => fetchAssetCluster(id),
  })

  const mutation = useMutation({
    mutationFn: (data) => updateAssetCluster(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['asset-cluster', id], updated)
      queryClient.invalidateQueries({ queryKey: ['asset-clusters'] })
      setEditing(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteAssetCluster(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-clusters'] })
      navigate('/network/assets')
    },
  })

  const startEdit = () => {
    setDraft({ name: cluster.name, ned_id: cluster.ned_id })
    setEditing(true)
  }

  const cancelEdit = () => {
    setDraft(null)
    setEditing(false)
    mutation.reset()
  }

  const save = () => {
    if (!draft.name?.trim()) return
    mutation.mutate(draft)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-3 border-b border-edge shrink-0">
        <Link
          to="/network/assets"
          className="inline-flex items-center gap-1 text-[11px] text-subtle hover:text-content mb-2 transition-colors"
        >
          <ChevronLeft size={11} />
          Assets
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-sm font-semibold text-content">
            {isLoading ? '—' : editing ? 'Edit Cluster' : (cluster?.name || `Cluster ${id}`)}
          </h1>

          {!isLoading && cluster && !editing && (
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
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-edge text-subtle hover:text-red-400 transition-colors"
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
                disabled={mutation.isPending || !draft?.name?.trim()}
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
        ) : !cluster ? (
          <div className="text-xs text-subtle">Cluster not found.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-surface border border-edge rounded-md overflow-hidden">
              <div className="px-4 py-2.5 border-b border-edge">
                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">Cluster</h3>
              </div>
              <div className="px-4 py-3">
                {editing ? (
                  <>
                    <div className="flex gap-4 py-1.5 border-b border-edge items-center">
                      <label className="w-32 shrink-0 text-[11px] text-subtle">Name</label>
                      <input
                        type="text"
                        value={draft.name ?? ''}
                        onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                        className="flex-1 bg-surface-hi border border-edge rounded px-2 py-1 text-xs text-content outline-none focus:border-brand/50 transition-colors"
                      />
                    </div>
                    <div className="flex gap-4 py-1.5 items-center">
                      <label className="w-32 shrink-0 text-[11px] text-subtle">Driver (NED)</label>
                      <input
                        type="text"
                        value={draft.ned_id ?? ''}
                        onChange={e => setDraft(d => ({ ...d, ned_id: e.target.value || null }))}
                        className="flex-1 bg-surface-hi border border-edge rounded px-2 py-1 text-xs text-content outline-none focus:border-brand/50 transition-colors"
                      />
                    </div>
                  </>
                ) : (
                  <dl>
                    <Field label="Name" value={cluster.name} />
                    <Field label="Driver" value={cluster.ned_id} />
                    <Field label="ID" value={cluster.id} />
                  </dl>
                )}
              </div>
            </div>

            <MembersCard cluster={cluster} clusterId={id} />
          </div>
        )}
      </div>
    </div>
  )
}
