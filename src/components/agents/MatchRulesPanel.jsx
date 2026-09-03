import { useState } from 'react'
import { X } from 'lucide-react'
import { apiFetch } from '../../api/client'

const RULE_FIELDS = [
  { key: 'region', label: 'Region' },
  { key: 'site',   label: 'Site'   },
  { key: 'vendor', label: 'Vendor' },
  { key: 'os',     label: 'OS'     },
  { key: 'status', label: 'Status' },
  { key: 'role',   label: 'Role'   },
]

const EMPTY_RULE = { region: '', site: '', vendor: '', os: '', status: '', role: '' }

export default function MatchRulesPanel({ rules = [], onAdd, onRemove }) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_RULE)
  const [saving, setSaving] = useState(false)
  const [regions, setRegions] = useState([])

  const handleOpen = () => {
    setForm(EMPTY_RULE)
    setShowModal(true)
    apiFetch('/api/v1/inventory/regions?limit=1000')
      .then(d => setRegions(d.items ?? []))
      .catch(() => {})
  }

  const handleSave = async () => {
    const payload = {}
    RULE_FIELDS.forEach(f => { if (form[f.key]?.trim()) payload[f.key] = form[f.key].trim() })
    setSaving(true)
    try {
      await onAdd(payload)
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Match Rules</span>
        <button
          onClick={handleOpen}
          className="text-xs text-subtle hover:text-content transition-colors px-2 py-1 rounded hover:bg-surface-hi"
        >
          Add rule
        </button>
      </div>

      {rules.length === 0 ? (
        <p className="text-xs text-subtle/50">No rules. Nodes matched explicitly only.</p>
      ) : (
        <div className="space-y-1.5">
          {rules.map(rule => {
            const parts = RULE_FIELDS.filter(f => rule[f.key]).map(f => ({ label: f.label, value: rule[f.key] }))
            return (
              <div
                key={rule.id}
                className="group flex items-center justify-between px-3 py-2 rounded-lg bg-purple-500/5 border border-purple-500/15"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full bg-purple-400/60 shrink-0" />
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {parts.length === 0 ? (
                      <span className="text-xs text-purple-300 font-medium">Match all</span>
                    ) : parts.map(p => (
                      <span key={p.label} className="text-xs">
                        <span className="text-subtle">{p.label} </span>
                        <span className="text-purple-300 font-medium">{p.value}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => onRemove(rule.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-red-400/60 hover:text-red-400 transition-all"
                >
                  Remove
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-canvas border border-edge rounded-xl w-[480px] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-edge">
              <div>
                <h3 className="text-sm font-semibold text-content">New Match Rule</h3>
                <p className="text-[11px] text-subtle mt-0.5">Fill in fields to filter, or leave all empty to match all nodes.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 rounded text-subtle hover:text-content hover:bg-surface-hi transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {RULE_FIELDS.map(f => f.key === 'region' ? (
                <div key={f.key}>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-subtle mb-1">{f.label}</label>
                  <select
                    value={form.region}
                    onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
                    className="w-full h-7 px-2.5 text-xs rounded border border-edge bg-surface-hi text-content focus:outline-none focus:border-brand/50 transition-colors"
                  >
                    <option value="">— Any region —</option>
                    {regions.map(r => (
                      <option key={r.name} value={r.name}>{r.display_name || r.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div key={f.key}>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-subtle mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={`Any ${f.label.toLowerCase()}`}
                    className="w-full h-7 px-2.5 text-xs rounded border border-edge bg-surface-hi text-content placeholder:text-subtle/50 focus:outline-none focus:border-brand/50 transition-colors"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-edge">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 text-xs text-subtle hover:text-content hover:bg-surface-hi rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 text-xs font-medium text-content bg-surface-hi hover:bg-edge rounded border border-edge transition-colors disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Create rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
