import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Wrench, Eye, TriangleAlert } from 'lucide-react'
import { useAiStore } from '../../context/AiContext'

/**
 * Model picker for the AI chat. Shows the currently selected model;
 * opens a dropdown grouped by provider with capability badges and pricing.
 *
 * The default (first level of the backend's chat chain) is pre-selected and
 * marked. As long as the user hasn't changed anything, no `model` is sent
 * with requests and the backend failover chain applies.
 */
export default function ModelPicker() {
  const { aiProviders, selectedModel, selectModel, modelTouched } = useAiStore()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (!aiProviders || aiProviders === 'error') return null
  if (!aiProviders.providers?.length) return null

  const defaultChain = aiProviders.chains?.chat ?? aiProviders.chains?.default ?? []
  const isDefault = (p, m) =>
    defaultChain.length > 0 && defaultChain[0].provider === p && defaultChain[0].model === m

  const shortName = (id) => id?.split('/').pop() ?? id

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-[10px] text-subtle hover:text-content transition-colors max-w-[180px]"
        title={selectedModel ? `${selectedModel.provider}/${selectedModel.model}` : 'Select model'}
      >
        <span className="truncate font-mono">{shortName(selectedModel?.model) ?? 'model'}</span>
        <ChevronDown size={11} className={open ? 'transition-transform' : 'rotate-180 transition-transform'} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-72 max-h-80 overflow-auto bg-surface border border-edge rounded shadow-xl z-50">
          {aiProviders.providers.map(p => (
            <div key={p.name}>
              <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
                <span className="text-[10px] font-semibold text-subtle uppercase tracking-wider">{p.name}</span>
                {p.status !== 'ok' && (
                  <span title="Provider unreachable">
                    <TriangleAlert size={10} className="text-amber-500" />
                  </span>
                )}
              </div>
              {p.models.length === 0 && (
                <div className="px-3 pb-2 text-[10px] text-subtle/60 italic">no models listed</div>
              )}
              {p.models.map(m => {
                const active = selectedModel?.provider === p.name && selectedModel?.model === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => { selectModel(p.name, m.id); setOpen(false) }}
                    className={[
                      'w-full text-left px-3 py-1.5 text-[11px] font-mono transition-colors',
                      active ? 'bg-brand/10 text-brand' : 'text-content hover:bg-surface-hi',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{shortName(m.id)}</span>
                      {m.supports_tools === true && (
                        <span title="Supports tool calling"><Wrench size={10} className="text-subtle shrink-0" /></span>
                      )}
                      {m.supports_vision === true && (
                        <span title="Supports vision"><Eye size={10} className="text-subtle shrink-0" /></span>
                      )}
                      {isDefault(p.name, m.id) && (
                        <span className="ml-auto text-[9px] text-subtle/70 shrink-0">default</span>
                      )}
                      {active && !modelTouched && (
                        <span className="ml-auto text-[9px] text-brand/70 shrink-0">chain</span>
                      )}
                    </div>
                    {(m.input_cost_per_mtok != null || m.context_window != null) && (
                      <div className="text-[9px] text-subtle/60 mt-0.5">
                        {m.input_cost_per_mtok != null && (
                          <span>
                            {formatCost(m.input_cost_per_mtok)}/{formatCost(m.output_cost_per_mtok)}
                            {m.currency ? ` ${m.currency}` : ''}/MTok
                          </span>
                        )}
                        {m.input_cost_per_mtok != null && m.context_window != null && ' · '}
                        {m.context_window != null && <span>{formatCtx(m.context_window)} ctx</span>}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
          {!modelTouched && defaultChain.length > 1 && (
            <div className="px-3 py-2 border-t border-edge text-[9px] text-subtle/70">
              Failover: {defaultChain.slice(1).map(l => shortName(l.model)).join(' → ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatCost(v) {
  if (v == null) return '?'
  return v < 0.01 ? v.toExponential(1) : v.toFixed(2)
}

function formatCtx(n) {
  return n >= 1000 ? `${Math.round(n / 1024)}k` : `${n}`
}
