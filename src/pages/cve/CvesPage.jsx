import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { fetchCves } from '../../api/cves'
import PageHeader from '../../components/ui/PageHeader'
import Pagination from '../../components/table/Pagination'

const PAGE_SIZE = 50

const FILTERS = [
  { key: 'id', label: 'CVE ID', placeholder: 'Filter ID' },
  { key: 'published', label: 'Published', placeholder: 'Filter date' },
  { key: 'modified', label: 'Modified', placeholder: 'Filter date' },
  { key: 'severity', label: 'Severity', placeholder: 'Filter severity' },
  { key: 'description', label: 'Description', placeholder: 'Filter description' },
]

function recordValue(record, names) {
  for (const name of names) {
    const value = record?.[name]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

function textValue(value) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(' ')
  if (typeof value === 'object') {
    if (typeof value.value === 'string') return value.value
    if (typeof value.en === 'string') return value.en
    return ''
  }
  return ''
}

function descriptions(record) {
  const description = recordValue(record, ['description', 'descriptions'])
  return textValue(description)
    || textValue(record?.cve?.descriptions)
}

function severity(record) {
  const score = recordValue(record, ['base_score', 'baseScore', 'cvss_score', 'cvssScore'])
  if (score !== undefined) return textValue(score)

  const cve = record?.cve ?? record
  const metrics = cve?.metrics
  if (metrics && typeof metrics === 'object') {
    for (const [metricName, entries] of Object.entries(metrics)) {
      if (!metricName.toLowerCase().includes('cvss') || !Array.isArray(entries)) continue
      const found = entries.find(entry => entry?.cvssData?.baseScore != null || entry?.baseScore != null)
      const value = found?.cvssData?.baseScore ?? found?.baseScore
      if (value != null) return textValue(value)
    }
  }

  const direct = recordValue(record, ['severity', 'base_severity', 'baseSeverity'])
    ?? record?.cvss_severity
  return direct ? textValue(direct) : ''
}

function fieldValue(record, key) {
  const cve = record?.cve ?? record
  switch (key) {
    case 'id':
      return textValue(recordValue(record, ['cve_id', 'cveId', 'id']) ?? recordValue(cve, ['cve_id', 'cveId', 'id']))
    case 'published':
      return textValue(recordValue(record, ['published', 'published_at', 'publishedAt']) ?? recordValue(cve, ['published', 'published_at', 'publishedAt']))
    case 'modified':
      return textValue(recordValue(record, ['last_modified', 'lastModified', 'modified', 'updated_at']) ?? recordValue(cve, ['last_modified', 'lastModified', 'modified']))
    case 'severity':
      return severity(record)
    case 'description':
      return descriptions(record)
    default:
      return ''
  }
}

function getCves(data) {
  if (Array.isArray(data)) return data
  for (const key of ['cves', 'vulnerabilities', 'items', 'results', 'data']) {
    if (Array.isArray(data?.[key])) return data[key]
  }
  return []
}

export default function CvesPage() {
  const [filters, setFilters] = useState({})
  const [pageOffset, setPageOffset] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [rawOpen, setRawOpen] = useState(false)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['cves'],
    queryFn: fetchCves,
  })
  const cves = useMemo(() => getCves(data), [data])
  const filteredCves = useMemo(() => cves
    .map((cve, index) => ({ cve, index }))
    .filter(({ cve }) => FILTERS.every(({ key }) => {
      const filter = filters[key]?.trim().toLowerCase()
      return !filter || fieldValue(cve, key).toLowerCase().includes(filter)
    })), [cves, filters])
  const offset = Math.min(pageOffset, Math.max(0, Math.ceil(filteredCves.length / PAGE_SIZE) - 1) * PAGE_SIZE)
  const pageCves = filteredCves.slice(offset, offset + PAGE_SIZE)
  const selected = pageCves.find(item => item.index === selectedIndex) ?? pageCves[0]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="CVEs"
        description={isLoading ? 'Loading vulnerability data…' : `${filteredCves.length} of ${cves.length} vulnerabilities`}
        actions={
          <button
            type="button"
            onClick={() => setRawOpen(open => !open)}
            aria-expanded={rawOpen}
            aria-controls="cve-raw-panel"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-edge text-xs text-content hover:bg-surface-hi transition-colors"
          >
            {rawOpen ? <EyeOff size={13} /> : <Eye size={13} />}
            {rawOpen ? 'Hide raw data' : 'Show raw data'}
          </button>
        }
      />
      {isError ? (
        <div role="alert" className="p-6 text-sm text-red-400">Failed to load CVEs: {error.message}</div>
      ) : isLoading ? (
        <div className="p-6 text-sm text-subtle">Loading CVEs…</div>
      ) : (
        <div className="flex-1 min-h-0 flex">
          <section aria-label="CVE list" className={`${rawOpen ? 'w-1/2 border-r' : 'w-full'} min-w-0 flex flex-col border-edge`}>
            <div className="flex-1 overflow-auto">
              <table className="w-full min-w-[1050px] table-fixed text-left text-xs">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr>
                    {FILTERS.map(({ key, label }) => (
                      <th key={key} className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-subtle border-b border-edge">
                        {label}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {FILTERS.map(({ key, label, placeholder }) => (
                      <th key={key} className="px-1.5 py-1.5 border-b border-edge">
                        <input
                          aria-label={`Filter by ${label}`}
                          value={filters[key] ?? ''}
                          onChange={event => { setFilters(current => ({ ...current, [key]: event.target.value })); setPageOffset(0) }}
                          placeholder={placeholder}
                          className="w-full min-w-0 bg-surface-hi border border-edge rounded px-1.5 py-1 text-[10px] text-content placeholder:text-subtle outline-none focus:border-brand/50"
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageCves.map(({ cve, index }) => (
                    <tr
                      key={index}
                      onClick={() => setSelectedIndex(index)}
                      aria-selected={selected?.index === index}
                      className={`cursor-pointer border-b border-edge/70 hover:bg-surface-hi ${
                        selected?.index === index ? 'bg-brand/10' : ''
                      }`}
                    >
                      {FILTERS.map(({ key }) => (
                        <td key={key} className="px-2 py-2 text-content align-top truncate" title={fieldValue(cve, key)}>
                          {fieldValue(cve, key) || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCves.length === 0 && (
                <p className="p-5 text-xs text-subtle">
                  {cves.length ? 'No CVEs match these filters.' : 'No CVEs found.'}
                </p>
              )}
            </div>
            <Pagination offset={offset} limit={PAGE_SIZE} total={filteredCves.length} onChange={setPageOffset} />
          </section>
          {rawOpen && <section id="cve-raw-panel" aria-label="Selected CVE raw data" className="w-1/2 min-w-0 flex flex-col">
            <div className="px-4 py-2 border-b border-edge text-xs font-semibold text-heading">
              {selected ? fieldValue(selected.cve, 'id') || 'CVE data' : 'CVE data'}
            </div>
            {selected ? (
              <pre className="flex-1 overflow-auto p-4 text-[11px] leading-relaxed font-mono text-content whitespace-pre-wrap break-words">
                {JSON.stringify(selected.cve, null, 2)}
              </pre>
            ) : (
              <p className="p-4 text-xs text-subtle">Select a CVE to view its raw data.</p>
            )}
          </section>}
        </div>
      )}
    </div>
  )
}