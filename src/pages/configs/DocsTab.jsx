import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Highlight, themes } from 'prism-react-renderer'
import { fetchComponentCatalog } from '../../api/configComponents'
import CatalogPanel from '../../components/configMap/CatalogPanel'

function exampleCode(component) {
  const req  = component.fields.filter(f => f.required)
  const opt  = component.fields.filter(f => !f.required)
  const varName = component.name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')

  const lines = [`${varName} = ${component.name}(`]
  for (const f of req) {
    const ex = f.enum_values?.length
      ? `"${f.enum_values[0]}"`
      : f.type === 'integer' ? '0'
      : f.type === 'boolean' ? 'True'
      : f.is_reference ? 'some_component'
      : '"..."'
    lines.push(`    ${f.name}=${ex},`)
  }
  if (opt.length) {
    lines.push('    # Optional fields:')
    for (const f of opt.slice(0, 4)) {
      const ex = f.enum_values?.length
        ? `"${f.enum_values[0]}"`
        : f.type === 'integer' ? '0'
        : f.type === 'boolean' ? 'True'
        : f.is_reference ? 'some_component'
        : '"..."'
      lines.push(`    # ${f.name}=${ex},`)
    }
    if (opt.length > 4) lines.push(`    # … ${opt.length - 4} more`)
  }
  lines.push(')')
  lines.push(`context.configuration.add(${varName})`)
  return lines.join('\n')
}

function TypeBadge({ type, isReference, referenceTarget }) {
  if (isReference) {
    return <span className="text-brand text-[11px] font-mono">→ {referenceTarget}</span>
  }
  return <span className="text-subtle text-[11px] font-mono">{type}</span>
}

function ComponentDetail({ component }) {
  const req = component.fields.filter(f => f.required)
  const opt = component.fields.filter(f => !f.required)

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-base font-semibold text-content">{component.name}</h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-brand/10 text-brand rounded">
            {component.category}
          </span>
        </div>
        {component.description && (
          <p className="text-sm text-subtle">{component.description}</p>
        )}
      </div>

      {/* Fields */}
      <div className="bg-surface border border-edge rounded-md overflow-hidden">
        <div className="px-4 py-2.5 border-b border-edge">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-subtle">Fields</h3>
        </div>
        <table className="w-full">
          <thead className="border-b border-edge">
            <tr>
              {['Field', 'Type', 'Required', 'Values'].map(h => (
                <th key={h} className="text-left px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-subtle">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...req, ...opt].map(f => (
              <tr key={f.name} className="border-b border-edge/30 last:border-0">
                <td className="px-4 py-2 font-mono text-[12px] text-content">{f.name}</td>
                <td className="px-4 py-2">
                  <TypeBadge type={f.type} isReference={f.is_reference} referenceTarget={f.reference_target} />
                </td>
                <td className="px-4 py-2 text-[11px]">
                  {f.required
                    ? <span className="text-red-400">yes</span>
                    : <span className="text-subtle/40">—</span>}
                </td>
                <td className="px-4 py-2 text-[11px] text-subtle">
                  {f.enum_values?.length
                    ? f.enum_values.join(', ')
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Example */}
      <div className="rounded-md border border-edge overflow-hidden" style={{ background: '#011627' }}>
        <div className="px-4 py-2.5 border-b border-white/8">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Example
          </h3>
        </div>
        <div className="p-4 overflow-x-auto">
          <Highlight theme={themes.nightOwl} code={exampleCode(component)} language="python">
            {({ style, tokens, getLineProps, getTokenProps }) => (
              <pre style={{ ...style, background: 'transparent', margin: 0 }} className="text-[12.5px] leading-relaxed font-mono">
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })}>
                    {line.map((token, j) => <span key={j} {...getTokenProps({ token })} />)}
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
        </div>
      </div>
    </div>
  )
}

export default function DocsTab() {
  const [selected, setSelected] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['component-catalog'],
    queryFn: fetchComponentCatalog,
    staleTime: 10 * 60_000,
  })

  const components = data?.components ?? []

  if (isLoading) {
    return <div className="p-6 text-xs text-subtle animate-pulse">Loading catalog…</div>
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-72 shrink-0 border-r border-edge flex flex-col overflow-hidden">
        <CatalogPanel
          components={components}
          onSelect={setSelected}
          selected={selected}
        />
      </div>
      <div className="flex-1 overflow-auto p-8">
        {selected ? (
          <ComponentDetail component={selected} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className="text-sm font-medium text-subtle">Select a component</p>
            <p className="text-xs text-subtle/50">{components.length} components available</p>
          </div>
        )}
      </div>
    </div>
  )
}
