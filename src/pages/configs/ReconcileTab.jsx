import { useState } from 'react'
import { Play } from 'lucide-react'
import { reconcileConfigMap } from '../../api/configComponents'
import NodeSearch from '../../components/configMap/NodeSearch'
import FilterEditor from '../../components/configMap/FilterEditor'
import CodeOutput from '../../components/configMap/CodeOutput'

const MODES = [
  { value: 'diff', label: 'Diff',  description: 'Only missing or changed components' },
  { value: 'full', label: 'Full',  description: 'All components from device config' },
]

export default function ReconcileTab() {
  const [node,        setNode]        = useState(null)
  const [mode,        setMode]        = useState('diff')
  const [filter,      setFilter]      = useState(null)
  const [className,   setClassName]   = useState('ReconcileConfigMap')
  const [code,        setCode]        = useState('')
  const [reconciling, setReconciling] = useState(false)
  const [error,       setError]       = useState(null)

  const run = async () => {
    if (!node) return
    setReconciling(true)
    setError(null)
    try {
      const body = {
        class_name:       className,
        filter:           filter ?? null,
        mode,
        include_removed:  true,
        include_changed:  true,
      }
      const result = await reconcileConfigMap(node.id, body)
      setCode(result.code ?? result)
    } catch (e) {
      setError(e.message ?? 'Reconciliation failed')
    } finally {
      setReconciling(false)
    }
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: settings */}
      <div className="w-80 shrink-0 border-r border-edge flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Node selection */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-subtle mb-2">
              Node instance
            </label>
            <NodeSearch value={node} onChange={setNode} />
          </div>

          {/* Mode */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-subtle mb-2">
              Mode
            </label>
            <div className="space-y-2">
              {MODES.map(m => (
                <label
                  key={m.value}
                  className={[
                    'flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors',
                    mode === m.value
                      ? 'border-brand/40 bg-brand/5'
                      : 'border-edge hover:border-edge/70',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={m.value}
                    checked={mode === m.value}
                    onChange={() => setMode(m.value)}
                    className="mt-0.5 accent-brand"
                  />
                  <div>
                    <div className="text-[12px] font-semibold text-content">{m.label}</div>
                    <div className="text-[11px] text-subtle mt-0.5">{m.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Class name */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-subtle mb-1.5">
              Class name
            </label>
            <input
              value={className}
              onChange={e => setClassName(e.target.value)}
              className="w-full bg-surface-hi border border-edge rounded px-3 py-2 text-[12px] font-mono text-content outline-none focus:border-brand/50"
            />
          </div>

          {/* Filter */}
          <FilterEditor value={filter} onChange={setFilter} />
        </div>

        {/* Run button */}
        <div className="shrink-0 p-4 border-t border-edge">
          {error && <p className="text-[11px] text-red-400 mb-2">{error}</p>}
          <button
            onClick={run}
            disabled={reconciling || !node}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand text-white rounded-md text-[12px] font-semibold hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Play size={13} />
            {reconciling ? 'Reconciling…' : 'Generate from device'}
          </button>
          {!node && (
            <p className="text-[10px] text-subtle/50 text-center mt-2">Select a node instance first</p>
          )}
        </div>
      </div>

      {/* Right: output */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <CodeOutput
          code={code}
          loading={reconciling}
          placeholder="Select a node and click Generate to create a config map from the device's running configuration."
        />
      </div>
    </div>
  )
}
