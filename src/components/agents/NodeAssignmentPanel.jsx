import { useState } from 'react'
import { X } from 'lucide-react'
import { apiFetch } from '../../api/client'

export default function NodeAssignmentPanel({ nodes = [], resolvedNodes = [], onAdd, onRemove, onBrowseResolved }) {
  const [showModal, setShowModal] = useState(false)
  const [allNodes, setAllNodes] = useState([])
  const [nodeFilter, setNodeFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [explicitFilter, setExplicitFilter] = useState('')

  const explicitCount = nodes.length
  const resolvedCount = resolvedNodes.length
  const ruleMatchedCount = Math.max(0, resolvedCount - explicitCount)

  const handleOpen = () => {
    setNodeFilter('')
    setSelectedIds(new Set())
    setShowModal(true)
    setLoading(true)
    const alreadyMapped = new Set([...nodes, ...resolvedNodes])
    apiFetch('/api/v1/inventory/node_instances?limit=1000')
      .then(d => {
        const list = d.items ?? (Array.isArray(d) ? d : [])
        setAllNodes(list.filter(n => !alreadyMapped.has(n.id)))
      })
      .catch(() => setAllNodes([]))
      .finally(() => setLoading(false))
  }

  const filteredNodes = allNodes.filter(n => {
    if (!nodeFilter.trim()) return true
    const q = nodeFilter.toLowerCase()
    return (
      String(n.id).includes(q) ||
      (n.hostname || '').toLowerCase().includes(q) ||
      (n.site || '').toLowerCase().includes(q)
    )
  })

  const toggleNode = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    if (selectedIds.size === 0) return
    setSaving(true)
    try {
      await onAdd([...selectedIds])
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  const filteredExplicit = explicitFilter.trim()
    ? nodes.filter(id => String(id).includes(explicitFilter.trim()))
    : nodes

  return (
    <>
      {/* Explicit nodes section */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Explicit Nodes</span>
        <button
          onClick={handleOpen}
          className="text-xs text-subtle hover:text-content transition-colors px-2 py-1 rounded hover:bg-surface-hi"
        >
          Add nodes
        </button>
      </div>

      {explicitCount === 0 ? (
        <p className="text-xs text-subtle/50">No nodes explicitly mapped.</p>
      ) : explicitCount <= 20 ? (
        <div className="flex flex-wrap gap-1.5">
          {nodes.map(id => (
            <span
              key={id}
              className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-blue-400 bg-blue-400/8 border border-blue-400/15"
            >
              #{id}
              <button
                onClick={() => onRemove(id)}
                className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-opacity leading-none"
              >
                <X size={9} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              placeholder="Filter nodes..."
              value={explicitFilter}
              onChange={e => setExplicitFilter(e.target.value)}
              className="h-6 px-2.5 text-xs rounded border border-edge bg-surface-hi text-content placeholder:text-subtle/50 focus:outline-none focus:border-brand/50 transition-colors w-44"
            />
            <span className="text-[11px] text-subtle">{explicitCount} nodes</span>
          </div>
          <div className="overflow-y-auto rounded-lg border border-edge" style={{ maxHeight: '180px' }}>
            {filteredExplicit.slice(0, 100).map((id, i) => (
              <div
                key={id}
                className="group flex items-center justify-between px-3 py-1.5 border-b border-edge/50 last:border-0"
                style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
              >
                <span className="text-xs font-mono text-content">#{id}</span>
                <button
                  onClick={() => onRemove(id)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-red-400/60 hover:text-red-400 transition-all"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolved nodes section */}
      <div className="flex items-center justify-between mt-5 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Resolved Nodes</span>
        {resolvedCount > 0 && (
          <button
            onClick={onBrowseResolved}
            className="text-xs text-subtle hover:text-content transition-colors px-2 py-1 rounded hover:bg-surface-hi"
          >
            Browse
          </button>
        )}
      </div>
      {resolvedCount === 0 ? (
        <p className="text-xs text-subtle/50">No nodes resolved.</p>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-content">{resolvedCount}</span>
          <span className="text-xs text-subtle">
            ({explicitCount} explicit{ruleMatchedCount > 0 && `, ${ruleMatchedCount} by rules`})
          </span>
        </div>
      )}

      {/* Add Nodes Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-canvas border border-edge rounded-xl w-[600px] max-h-[80vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-edge">
              <div>
                <h3 className="text-sm font-semibold text-content">Add Nodes</h3>
                <p className="text-[11px] text-subtle mt-0.5">Select nodes to explicitly map to this agent.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 rounded text-subtle hover:text-content hover:bg-surface-hi transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-edge flex items-center gap-3">
              <input
                type="text"
                placeholder="Search by hostname, site, ID..."
                value={nodeFilter}
                onChange={e => setNodeFilter(e.target.value)}
                autoFocus
                className="flex-1 h-7 px-2.5 text-xs rounded border border-edge bg-surface-hi text-content placeholder:text-subtle focus:outline-none focus:border-brand/50 transition-colors"
              />
              {filteredNodes.length > 0 && (
                <button
                  onClick={() => setSelectedIds(new Set(filteredNodes.map(n => n.id)))}
                  className="text-xs text-brand hover:text-brand/80 transition-colors whitespace-nowrap"
                >
                  Select all ({filteredNodes.length})
                </button>
              )}
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-subtle hover:text-content transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="px-5 py-8 text-xs text-subtle text-center">Loading nodes…</div>
              ) : filteredNodes.length === 0 ? (
                <div className="px-5 py-8 text-xs text-subtle text-center">No available nodes</div>
              ) : (
                filteredNodes.map((node, i) => {
                  const sel = selectedIds.has(node.id)
                  return (
                    <div
                      key={node.id}
                      onClick={() => toggleNode(node.id)}
                      className="flex items-center gap-3 px-5 py-2 border-b border-edge/50 last:border-0 cursor-pointer transition-colors"
                      style={{ backgroundColor: sel ? 'rgba(12,165,233,0.06)' : (i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)') }}
                    >
                      <input
                        type="checkbox"
                        checked={sel}
                        readOnly
                        className="accent-brand pointer-events-none w-3.5 h-3.5"
                      />
                      <span className="text-xs font-mono text-subtle w-12">#{node.id}</span>
                      <span className="text-xs text-content">{node.hostname || '—'}</span>
                      {node.site && <span className="text-xs text-subtle">({node.site})</span>}
                      {node.vendor && <span className="text-xs text-subtle/50 ml-auto">{node.vendor}</span>}
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-t border-edge">
              {selectedIds.size > 0 ? (
                <span className="text-xs text-subtle">{selectedIds.size} selected</span>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 text-xs text-subtle hover:text-content hover:bg-surface-hi rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={selectedIds.size === 0 || saving}
                  className="px-4 py-1.5 text-xs font-medium text-content bg-surface-hi hover:bg-edge rounded border border-edge transition-colors disabled:opacity-40"
                >
                  {saving ? 'Adding…' : `Add ${selectedIds.size || ''} node${selectedIds.size !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
