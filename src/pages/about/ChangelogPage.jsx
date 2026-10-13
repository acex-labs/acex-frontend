import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { fetchChangelog } from '../../api/changelog'
import PageHeader from '../../components/ui/PageHeader'

const GROUP_ORDER = ['Added', 'Fixed', 'Performance', 'Changed', 'Documentation', 'Security', 'Other']

export default function ChangelogPage() {
  const [summariesOnly, setSummariesOnly] = useState(false)
  const { data, isLoading, error } = useQuery({
    queryKey: ['changelog'],
    queryFn: fetchChangelog,
    staleTime: 300_000,
  })

  const releases = (data?.releases ?? [])
    .map(r => ({
      ...r,
      entries: summariesOnly ? r.entries.filter(e => e.description) : r.entries,
    }))
    .filter(r => r.entries.length > 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Changelog"
        description={data ? `Backend version ${data.version}` : 'What changed in the ACEX backend'}
        actions={
          <button
            onClick={() => setSummariesOnly(v => !v)}
            aria-pressed={summariesOnly}
            className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${
              summariesOnly
                ? 'border-brand text-brand bg-brand/10'
                : 'border-edge text-subtle hover:text-content'
            }`}
          >
            Summaries only
          </button>
        }
      />
      <div className="flex-1 overflow-auto px-6 py-4 max-w-3xl">
        {isLoading && <p className="text-xs text-subtle">Loading…</p>}
        {error && <p className="text-xs text-red-400">Failed to load changelog: {error.message}</p>}
        {data && releases.length === 0 && <p className="text-xs text-subtle">No changelog entries.</p>}

        {releases.map(rel => (
          <section key={rel.version} className="mb-8">
            <h2 className="text-sm font-semibold text-heading mb-3">
              {rel.version === 'Unreleased' ? 'Unreleased' : `[${rel.version}]`}
              {rel.date && <span className="font-normal text-subtle"> — {rel.date}</span>}
            </h2>
            {GROUP_ORDER.map(group => {
              const items = rel.entries.filter(e => e.group === group)
              if (items.length === 0) return null
              return (
                <div key={group} className="mb-4">
                  <h3 className="text-[13px] font-semibold text-content mb-1.5">{group}</h3>
                  <ul className="pl-5 list-disc space-y-1.5">
                    {items.map((e, i) => (
                      <li key={i} className="text-[13px] text-content">
                        {e.breaking && <span className="font-semibold text-red-400">[breaking] </span>}
                        {e.title}{' '}
                        {e.pr_url && (
                          <a href={e.pr_url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                            (#{e.pr})
                          </a>
                        )}{' '}
                        {e.commit_url && (
                          <a href={e.commit_url} target="_blank" rel="noreferrer" className="text-subtle hover:underline">
                            ({e.commit})
                          </a>
                        )}
                        {e.description && (
                          <details className="mt-1 mb-1 rounded border border-edge bg-surface-hi/50 px-3 py-1.5">
                            <summary className="cursor-pointer select-none text-[11px] font-medium text-subtle">
                              Details
                            </summary>
                            <div className="mt-1.5">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({ children }) => <p className="text-[12px] text-subtle mb-1.5 last:mb-0">{children}</p>,
                                  ul: ({ children }) => <ul className="pl-4 list-disc space-y-0.5 text-[12px] text-subtle mb-1.5">{children}</ul>,
                                  code: ({ children }) => <code className="bg-surface px-1 py-0.5 rounded text-[10px] text-brand">{children}</code>,
                                }}
                              >
                                {e.description}
                              </ReactMarkdown>
                            </div>
                          </details>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </section>
        ))}
      </div>
    </div>
  )
}