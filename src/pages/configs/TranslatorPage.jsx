import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Play, Terminal } from 'lucide-react'
import { fetchDrivers, translateConfig } from '../../api/configComponents'
import CodeOutput from '../../components/configMap/CodeOutput'
import FilterEditor from '../../components/configMap/FilterEditor'

const PLACEHOLDER = `! Paste vendor config here, e.g.:
!
hostname my-switch
!
interface GigabitEthernet0/0/1
 description Uplink
 switchport mode trunk
!
vlan 10
 name management
!`

export default function TranslatorPage() {
  const [nedId,      setNedId]      = useState('')
  const [configText, setConfigText] = useState('')
  const [filter,     setFilter]     = useState(null)
  const [code,       setCode]       = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  const { data: driversData } = useQuery({
    queryKey: ['config-drivers'],
    queryFn: fetchDrivers,
    staleTime: 5 * 60_000,
  })

  const drivers = Array.isArray(driversData) ? driversData : []

  const run = async () => {
    if (!nedId || !configText.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await translateConfig({
        ned_id:      nedId,
        config_text: configText,
        filter:      filter ?? null,
      })
      setCode(result.code ?? result)
    } catch (e) {
      setError(e.message ?? 'Translation failed')
    } finally {
      setLoading(false)
    }
  }

  const canRun = nedId && configText.trim().length > 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-edge shrink-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Terminal size={14} className="text-subtle" />
          <h1 className="text-sm font-semibold text-content">Config Translator</h1>
        </div>
        <p className="text-[11px] text-subtle">
          Paste vendor config syntax — get back ACEX components as Python.
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: input */}
        <div className="flex flex-col w-1/2 border-r border-edge overflow-hidden">
          {/* Toolbar */}
          <div className="shrink-0 px-4 py-3 border-b border-edge flex items-center gap-3">
            <select
              value={nedId}
              onChange={e => setNedId(e.target.value)}
              className="bg-surface-hi border border-edge rounded px-2.5 py-1.5 text-[12px] text-content outline-none focus:border-brand/50"
            >
              <option value="">Select driver…</option>
              {drivers.map(d => (
                <option key={d.name} value={d.name}>
                  {d.package_name ?? d.name}{d.version && d.version !== 'n/a' ? ` ${d.version}` : ''}
                </option>
              ))}
            </select>

            <div className="flex-1">
              <FilterEditor value={filter} onChange={setFilter} />
            </div>

            <button
              onClick={run}
              disabled={loading || !canRun}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded text-[12px] font-semibold hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Play size={12} />
              {loading ? 'Translating…' : 'Translate'}
            </button>
          </div>

          {/* Text area */}
          <div className="flex-1 overflow-hidden flex flex-col" style={{ background: '#011627' }}>
            <textarea
              value={configText}
              onChange={e => setConfigText(e.target.value)}
              placeholder={PLACEHOLDER}
              spellCheck={false}
              className="flex-1 w-full resize-none p-4 font-mono text-[12.5px] leading-relaxed outline-none"
              style={{
                background:  'transparent',
                color:       '#d6deeb',
                caretColor:  '#80a4c2',
              }}
            />
          </div>

          {error && (
            <div className="shrink-0 px-4 py-2.5 border-t border-red-500/20 bg-red-500/5 text-[11px] text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Right: output */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <CodeOutput
            code={code}
            loading={loading}
            placeholder="Paste vendor config, select a driver and click Translate."
          />
        </div>
      </div>
    </div>
  )
}
