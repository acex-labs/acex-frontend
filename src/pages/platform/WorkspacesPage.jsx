import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Pencil, Trash2 } from 'lucide-react'
import {
  fetchWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from '../../api/naas'
import PageHeader from '../../components/ui/PageHeader'

const INPUT_CLS = 'w-full bg-surface-hi border border-edge rounded px-2 py-1.5 text-xs text-content placeholder:text-subtle outline-none focus:border-brand/50 transition-colors'

function PhaseBadge({ phase }) {
  if (!phase) return null
  const colors = {
    Ready:      'bg-green-500/10 text-green-400',
    Pending:    'bg-yellow-500/10 text-yellow-400',
    Failed:     'bg-red-500/10 text-red-400',
    Terminating:'bg-orange-500/10 text-orange-400',
  }
  const cls = colors[phase] ?? 'bg-surface-hi text-subtle border border-edge'
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>
      {phase}
    </span>
  )
}

function FormField({ label, required, children }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] text-subtle mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
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
          <button onClick={onClose} className="text-subtle hover:text-content transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="p-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-edge">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

function CreateModal({ onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [owner, setOwner] = useState('')

  const mutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => { onSuccess(); onClose() },
  })

  return (
    <Modal
      title="New Workspace"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-3 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate({ name: name.trim(), owner: owner.trim() })}
            disabled={!name.trim() || !owner.trim() || mutation.isPending}
            className="px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
          >
            {mutation.isPending ? 'Creating…' : 'Create'}
          </button>
        </>
      }
    >
      <FormField label="Name" required>
        <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} className={INPUT_CLS} placeholder="my-workspace" />
      </FormField>
      <FormField label="Owner" required>
        <input type="text" value={owner} onChange={e => setOwner(e.target.value)} className={INPUT_CLS} placeholder="team@acebit.se" />
      </FormField>
      {mutation.isError && (
        <p className="mt-1 text-[11px] text-red-400">{mutation.error.message}</p>
      )}
    </Modal>
  )
}

function EditModal({ workspace, onClose, onSuccess }) {
  const [owner, setOwner] = useState(workspace.owner)

  const mutation = useMutation({
    mutationFn: (data) => updateWorkspace(workspace.name, data),
    onSuccess: () => { onSuccess(); onClose() },
  })

  return (
    <Modal
      title={`Edit ${workspace.name}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-3 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate({ owner: owner.trim() })}
            disabled={!owner.trim() || mutation.isPending}
            className="px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <FormField label="Owner" required>
        <input autoFocus type="text" value={owner} onChange={e => setOwner(e.target.value)} className={INPUT_CLS} />
      </FormField>
      {mutation.isError && (
        <p className="mt-1 text-[11px] text-red-400">{mutation.error.message}</p>
      )}
    </Modal>
  )
}

function DetailPanel({ workspace, onClose, onEdit, onDelete }) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  return (
    <div className="border-t border-edge bg-surface shrink-0">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-edge">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-content">{workspace.name}</span>
          <PhaseBadge phase={workspace.phase} />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-edge text-subtle hover:text-content transition-colors"
          >
            <Pencil size={11} /> Edit
          </button>
          {deleteConfirm ? (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-red-400">Delete?</span>
              <button
                onClick={() => onDelete(workspace.name)}
                className="px-2 py-1 rounded text-[11px] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-2 py-1 rounded text-[11px] border border-edge text-subtle hover:text-content transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-edge text-subtle hover:text-red-400 transition-colors"
            >
              <Trash2 size={11} /> Delete
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded text-subtle hover:text-content transition-colors ml-1">
            <X size={13} />
          </button>
        </div>
      </div>
      <div className="px-4 py-3 space-y-1.5">
        <div className="flex gap-3">
          <span className="w-16 shrink-0 text-[11px] text-subtle font-mono">owner</span>
          <span className="text-[11px] text-content">{workspace.owner || '—'}</span>
        </div>
        <div className="flex gap-3">
          <span className="w-16 shrink-0 text-[11px] text-subtle font-mono">phase</span>
          <span className="text-[11px] text-content">{workspace.phase || '—'}</span>
        </div>
      </div>
    </div>
  )
}

export default function WorkspacesPage() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['naas-workspaces'],
    queryFn: fetchWorkspaces,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['naas-workspaces'] })
      setSelected(null)
    },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['naas-workspaces'] })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Workspaces"
        description={workspaces.length > 0 ? `${workspaces.length} workspaces` : undefined}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-brand text-white hover:bg-brand/90 transition-colors"
          >
            <Plus size={12} /> New Workspace
          </button>
        }
      />

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-canvas z-10">
              <tr className="border-b border-edge">
                {['Name', 'Owner', 'Phase'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-subtle px-4 py-2.5 first:pl-6">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 4 }, (_, i) => (
                    <tr key={i} className="border-b border-edge/50">
                      {[1, 2, 3].map(j => (
                        <td key={j} className="px-4 py-2.5 first:pl-6">
                          <div className="h-3 bg-surface-hi rounded animate-pulse" style={{ width: j === 1 ? '40%' : '70px' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : workspaces.map(ws => (
                    <tr
                      key={ws.name}
                      onClick={() => setSelected(s => s?.name === ws.name ? null : ws)}
                      className={[
                        'border-b border-edge/50 cursor-pointer transition-colors',
                        selected?.name === ws.name ? 'bg-brand/5' : 'hover:bg-surface-hi',
                      ].join(' ')}
                    >
                      <td className="px-4 py-2.5 pl-6 text-content font-medium font-mono">{ws.name}</td>
                      <td className="px-4 py-2.5 text-subtle">{ws.owner || '—'}</td>
                      <td className="px-4 py-2.5"><PhaseBadge phase={ws.phase} /></td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
          {!isLoading && workspaces.length === 0 && (
            <div className="px-6 py-8 text-xs text-subtle">No workspaces found.</div>
          )}
        </div>

        {selected && (
          <DetailPanel
            key={selected.name}
            workspace={selected}
            onClose={() => setSelected(null)}
            onEdit={() => setShowEdit(true)}
            onDelete={(name) => deleteMutation.mutate(name)}
          />
        )}
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onSuccess={invalidate}
        />
      )}
      {showEdit && selected && (
        <EditModal
          workspace={selected}
          onClose={() => setShowEdit(false)}
          onSuccess={() => { invalidate(); setSelected(null) }}
        />
      )}
    </div>
  )
}
