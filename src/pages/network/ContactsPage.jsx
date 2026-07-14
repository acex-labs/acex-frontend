import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Mail, Phone } from 'lucide-react'
import { fetchContacts } from '../../api/inventory'
import { useQueryParams } from '../../hooks/useQueryParams'
import PageHeader from '../../components/ui/PageHeader'
import TableToolbar from '../../components/table/TableToolbar'
import Pagination from '../../components/table/Pagination'

const DEFAULTS = {
  name: '', sort: 'name', order: 'asc', limit: 50, offset: 0,
}

const FILTERS = [
  { key: 'name', label: 'Name', width: '180px' },
]

export default function ContactsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useQueryParams(DEFAULTS)

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', params],
    queryFn: () => fetchContacts(params),
    placeholderData: keepPreviousData,
  })

  const contacts = data?.items ?? data ?? []
  const total = data?.total ?? contacts.length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Contacts"
        description={total > 0 ? `${total} contacts` : undefined}
      />
      <TableToolbar
        filters={FILTERS}
        values={{ name: params.name }}
        onChange={vals => setParams({ ...vals, offset: 0 })}
      />
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-canvas z-10">
            <tr className="border-b border-edge">
              {['Name', 'Role', 'Email', 'Phone'].map(h => (
                <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-subtle px-4 py-2.5 first:pl-6 last:pr-6">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} className="border-b border-edge/50">
                    {[1, 2, 3, 4].map(j => (
                      <td key={j} className="px-4 py-2.5 first:pl-6 last:pr-6">
                        <div className="h-3 bg-surface-hi rounded animate-pulse" style={{ width: '60%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : contacts.map(c => {
                  const fullName = [c.first_name, c.family_name].filter(Boolean).join(' ') || c.display_name || c.name
                  return (
                    <tr
                      key={c.id ?? c.name}
                      onClick={() => navigate(`/network/contacts/${c.id}`)}
                      className="border-b border-edge/50 hover:bg-surface-hi transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-2.5 pl-6 text-content font-medium">
                        <div>{fullName}</div>
                        {c.name !== fullName && (
                          <div className="text-[10px] text-subtle font-mono mt-0.5">{c.name}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-subtle">{c.role || '—'}</td>
                      <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                        {c.email
                          ? <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-subtle hover:text-brand transition-colors">
                              <Mail size={10} />{c.email}
                            </a>
                          : <span className="text-subtle">—</span>
                        }
                      </td>
                      <td className="px-4 py-2.5 pr-6" onClick={e => e.stopPropagation()}>
                        {c.phone
                          ? <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-subtle hover:text-brand transition-colors">
                              <Phone size={10} />{c.phone}
                            </a>
                          : <span className="text-subtle">—</span>
                        }
                      </td>
                    </tr>
                  )
                })
            }
          </tbody>
        </table>
        {!isLoading && contacts.length === 0 && (
          <div className="px-6 py-8 text-xs text-subtle">No contacts found.</div>
        )}
      </div>
      <Pagination
        offset={params.offset}
        limit={params.limit}
        total={total}
        onChange={offset => setParams({ offset })}
      />
    </div>
  )
}
