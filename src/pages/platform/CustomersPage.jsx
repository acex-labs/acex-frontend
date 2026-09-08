import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Pencil, Trash2 } from 'lucide-react'
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer } from '../../api/naas'
import PageHeader from '../../components/ui/PageHeader'

const INPUT_CLS = 'w-full bg-surface-hi border border-edge rounded px-2 py-1.5 text-xs text-content placeholder:text-subtle outline-none focus:border-brand/50 transition-colors'

function PhaseBadge({ phase }) {
  if (!phase) return null
  const colors = { Ready: 'bg-green-500/10 text-green-400', Pending: 'bg-yellow-500/10 text-yellow-400', Failed: 'bg-red-500/10 text-red-400', Terminating: 'bg-orange-500/10 text-orange-400' }
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[phase] ?? 'bg-surface-hi text-subtle border border-edge'}`}>{phase}</span>
}

function ActiveBadge({ active }) {
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${active ? 'bg-green-500/10 text-green-400' : 'bg-surface-hi text-subtle border border-edge'}`}>{active ? 'Active' : 'Inactive'}</span>
}

function StatusToggle({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 mt-0.5">
      {['Active', 'Inactive'].map(label => {
        const isActive = label === 'Active'
        const selected = value === isActive
        return (
          <button key={label} type="button" onClick={() => onChange(isActive)}
            className={`px-3 py-1 rounded text-[11px] border transition-colors ${selected ? (isActive ? 'bg-green-500/10 border-green-500/40 text-green-400' : 'bg-surface-hi border-edge text-content') : 'border-edge text-subtle hover:text-content'}`}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

function FormField({ label, required, children }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] text-subtle mb-1">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  )
}

function Modal({ title, onClose, footer, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-canvas border border-edge rounded-lg shadow-xl w-full max-w-sm mx-4 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
          <h2 className="text-sm font-semibold text-content">{title}</h2>
          <button onClick={onClose} className="text-subtle hover:text-content transition-colors"><X size={14} /></button>
        </div>
        <div className="p-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-edge">{footer}</div>}
      </div>
    </div>
  )
}

function CreateModal({ onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [active, setActive] = useState(true)
  const mutation = useMutation({ mutationFn: createCustomer, onSuccess: () => { onSuccess(); onClose() } })
  return (
    <Modal title="New Customer" onClose={onClose} footer={
      <>
        <button onClick={onClose} className="px-3 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors">Cancel</button>
        <button onClick={() => mutation.mutate({ name: name.trim(), active })} disabled={!name.trim() || mutation.isPending} className="px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity">
          {mutation.isPending ? 'Creating…' : 'Create'}
        </button>
      </>
    }>
      <FormField label="Name" required><input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} className={INPUT_CLS} placeholder="acme-corp" /></FormField>
      <FormField label="Status"><StatusToggle value={active} onChange={setActive} /></FormField>
      {mutation.isError && <p className="mt-1 text-[11px] text-red-400">{mutation.error.message}</p>}
    </Modal>
  )
}

function EditModal({ customer, onClose, onSuccess }) {
  const [active, setActive] = useState(customer.active)
  const mutation = useMutation({ mutationFn: (data) => updateCustomer(customer.name, data), onSuccess: () => { onSuccess(); onClose() } })
  return (
    <Modal title={`Edit ${customer.name}`} onClose={onClose} footer={
      <>
        <button onClick={onClose} className="px-3 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors">Cancel</button>
        <button onClick={() => mutation.mutate({ active })} disabled={mutation.isPending} className="px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity">
          {mutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </>
    }>
      <FormField label="Status"><StatusToggle value={active} onChange={setActive} /></FormField>
      {mutation.isError && <p className="mt-1 text-[11px] text-red-400">{mutation.error.message}</p>}
    </Modal>
  )
}

function DetailPanel({ customer, onClose, onEdit, onDelete }) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  return (
    <div className="border-t border-edge bg-surface shrink-0">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-edge">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-content">{customer.name}</span>
          <ActiveBadge active={customer.active} />
          <PhaseBadge phase={customer.phase} />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-edge text-subtle hover:text-content transition-colors"><Pencil size={11} /> Edit</button>
          {deleteConfirm ? (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-red-400">Delete?</span>
              <button onClick={() => onDelete(customer.name)} className="px-2 py-1 rounded text-[11px] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">Confirm</button>
              <button onClick={() => setDeleteConfirm(false)} className="px-2 py-1 rounded text-[11px] border border-edge text-subtle hover:text-content transition-colors">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-edge text-subtle hover:text-red-400 transition-colors"><Trash2 size={11} /> Delete</button>
          )}
          <button onClick={onClose} className="p-1 rounded text-subtle hover:text-content transition-colors ml-1"><X size={13} /></button>
        </div>
      </div>
      <div className="px-4 py-3 space-y-1.5">
        <div className="flex gap-3"><span className="w-16 shrink-0 text-[11px] text-subtle font-mono">active</span><span className="text-[11px] text-content">{String(customer.active)}</span></div>
        <div className="flex gap-3"><span className="w-16 shrink-0 text-[11px] text-subtle font-mono">phase</span><span className="text-[11px] text-content">{customer.phase || '—'}</span></div>
        {customer.path && <div className="flex gap-3"><span className="w-16 shrink-0 text-[11px] text-subtle font-mono">path</span><span className="text-[11px] text-content font-mono">{customer.path}</span></div>}
      </div>
    </div>
  )
}

export default function CustomersPage() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const { data: customers = [], isLoading } = useQuery({ queryKey: ['naas-customers'], queryFn: fetchCustomers })
  const deleteMutation = useMutation({ mutationFn: deleteCustomer, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['naas-customers'] }); setSelected(null) } })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['naas-customers'] })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Customers" description={customers.length > 0 ? `${customers.length} customers` : undefined} actions={
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-brand text-white hover:bg-brand/90 transition-colors"><Plus size={12} /> New Customer</button>
      } />
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-canvas z-10">
              <tr className="border-b border-edge">
                {['Name', 'Status', 'Phase'].map(h => <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-subtle px-4 py-2.5 first:pl-6">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 4 }, (_, i) => <tr key={i} className="border-b border-edge/50">{[1,2,3].map(j => <td key={j} className="px-4 py-2.5 first:pl-6"><div className="h-3 bg-surface-hi rounded animate-pulse" style={{ width: j===1?'40%':'70px' }} /></td>)}</tr>)
                : customers.map(c => (
                    <tr key={c.name} onClick={() => setSelected(s => s?.name === c.name ? null : c)} className={['border-b border-edge/50 cursor-pointer transition-colors', selected?.name === c.name ? 'bg-brand/5' : 'hover:bg-surface-hi'].join(' ')}>
                      <td className="px-4 py-2.5 pl-6 text-content font-medium font-mono">{c.name}</td>
                      <td className="px-4 py-2.5"><ActiveBadge active={c.active} /></td>
                      <td className="px-4 py-2.5"><PhaseBadge phase={c.phase} /></td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
          {!isLoading && customers.length === 0 && <div className="px-6 py-8 text-xs text-subtle">No customers found.</div>}
        </div>
        {selected && <DetailPanel key={selected.name} customer={selected} onClose={() => setSelected(null)} onEdit={() => setShowEdit(true)} onDelete={name => deleteMutation.mutate(name)} />}
      </div>
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onSuccess={invalidate} />}
      {showEdit && selected && <EditModal customer={selected} onClose={() => setShowEdit(false)} onSuccess={() => { invalidate(); setSelected(null) }} />}
    </div>
  )
}
