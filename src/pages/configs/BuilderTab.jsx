import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Play } from 'lucide-react'
import { fetchComponentCatalog, generateConfigMap } from '../../api/configComponents'
import CatalogPanel from '../../components/configMap/CatalogPanel'
import ComponentForm from '../../components/configMap/ComponentForm'
import CodeOutput from '../../components/configMap/CodeOutput'
import FilterEditor from '../../components/configMap/FilterEditor'

function toVarName(componentName, count) {
  const snake = componentName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
  return count > 1 ? `${snake}_${count}` : snake
}

export default function BuilderTab() {
  const counter = useRef(0)
  const [className,  setClassName]  = useState('MyConfigMap')
  const [filter,     setFilter]     = useState(null)
  const [instances,  setInstances]  = useState([])
  const [code,       setCode]       = useState('')
  const [generating, setGenerating] = useState(false)
  const [error,      setError]      = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['component-catalog'],
    queryFn: fetchComponentCatalog,
    staleTime: 10 * 60_000,
  })

  const catalog = data?.components ?? []
  const catalogMap = Object.fromEntries(catalog.map(c => [c.name, c]))

  const addComponent = (component) => {
    counter.current += 1
    const existing = instances.filter(i => i.component === component.name).length
    setInstances(prev => [...prev, {
      id:           counter.current,
      component:    component.name,
      variableName: toVarName(component.name, existing + 1),
      values:       {},
    }])
  }

  const updateInstance = (id, updated) =>
    setInstances(prev => prev.map(i => i.id === id ? updated : i))

  const removeInstance = (id) =>
    setInstances(prev => prev.filter(i => i.id !== id))

  const generate = async () => {
    if (!instances.length) return
    setGenerating(true)
    setError(null)
    try {
      const body = {
        class_name: className,
        filter: filter ?? null,
        components: instances.map(i => ({
          component:     i.component,
          variable_name: i.variableName,
          values:        Object.fromEntries(
            Object.entries(i.values).filter(([, v]) => v !== undefined)
          ),
        })),
      }
      const result = await generateConfigMap(body)
      setCode(result.code ?? result)
    } catch (e) {
      setError(e.message ?? 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  if (isLoading) {
    return <div className="p-6 text-xs text-subtle animate-pulse">Loading catalog…</div>
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: component catalog */}
      <div className="w-64 shrink-0 border-r border-edge flex flex-col overflow-hidden">
        <CatalogPanel components={catalog} onAdd={addComponent} />
      </div>

      {/* Middle: configure */}
      <div className="w-96 shrink-0 border-r border-edge flex flex-col overflow-hidden">
        <div className="shrink-0 p-4 border-b border-edge space-y-4">
          {/* Class name */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-subtle mb-1.5">
              Class name
            </label>
            <input
              value={className}
              onChange={e => setClassName(e.target.value)}
              className="w-full bg-surface-hi border border-edge rounded px-3 py-2 text-[13px] font-mono text-content outline-none focus:border-brand/50"
            />
          </div>

          {/* Filter */}
          <FilterEditor value={filter} onChange={setFilter} />
        </div>

        {/* Instance list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {instances.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
              <p className="text-xs text-subtle">No components added yet.</p>
              <p className="text-[11px] text-subtle/50">Click Add in the catalog to get started.</p>
            </div>
          ) : (
            instances.map(inst => {
              const component = catalogMap[inst.component]
              if (!component) return null
              return (
                <ComponentForm
                  key={inst.id}
                  instance={inst}
                  component={component}
                  instances={instances}
                  onChange={updated => updateInstance(inst.id, updated)}
                  onRemove={() => removeInstance(inst.id)}
                />
              )
            })
          )}
        </div>

        {/* Generate button */}
        <div className="shrink-0 p-4 border-t border-edge">
          {error && <p className="text-[11px] text-red-400 mb-2">{error}</p>}
          <button
            onClick={generate}
            disabled={generating || instances.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand text-white rounded-md text-[12px] font-semibold hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Play size={13} />
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Right: output */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <CodeOutput
          code={code}
          loading={generating}
          placeholder="Configure components and click Generate."
        />
      </div>
    </div>
  )
}
