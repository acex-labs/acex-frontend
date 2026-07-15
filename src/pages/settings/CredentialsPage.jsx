import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Plus, X, Eye, EyeOff, Clipboard, Check, Pencil, Trash2 } from 'lucide-react'
import {
  fetchCredentials,
  fetchCredentialSecret,
  createCredential,
  updateCredential,
  deleteCredential,
} from '../../api/inventory'
import { useQueryParams } from '../../hooks/useQueryParams'
import PageHeader from '../../components/ui/PageHeader'
import TableToolbar from '../../components/table/TableToolbar'
import Pagination from '../../components/table/Pagination'

const CRED_TYPES = {
  userpass: {
    label: 'Username / Password',
    color: 'blue',
    fields: [
      { name: 'username', sensitive: false },
      { name: 'password', sensitive: true },
    ],
  },
  privilege_escalation: {
    label: 'Privilege Escalation',
    color: 'orange',
    fields: [{ name: 'password', sensitive: true }],
  },
  token: {
    label: 'API Token',
    color: 'purple',
    fields: [{ name: 'token', sensitive: true }],
  },
  snmp_community: {
    label: 'SNMP Community',
    color: 'green',
    fields: [{ name: 'community', sensitive: true }],
  },
  snmpv3: {
    label: 'SNMPv3',
    color: 'emerald',
    fields: [
      { name: 'username', sensitive: false },
      { name: 'auth_protocol', sensitive: false },
      { name: 'auth_password', sensitive: true },
      { name: 'priv_protocol', sensitive: false },
      { name: 'priv_password', sensitive: true },
    ],
  },
  ssh_key: {
    label: 'SSH Key',
    color: 'amber',
    fields: [
      { name: 'username', sensitive: false },
      { name: 'private_key', sensitive: true },
      { name: 'passphrase', sensitive: true },
    ],
  },
}

const BADGE = {
  blue:    'bg-blue-500/10 text-blue-400',
  orange:  'bg-orange-500/10 text-orange-400',
  purple:  'bg-purple-500/10 text-purple-400',
  green:   'bg-green-500/10 text-green-400',
  emerald: 'bg-emerald-500/10 text-emerald-400',
  amber:   'bg-amber-500/10 text-amber-400',
}

function TypeBadge({ type }) {
  const def = CRED_TYPES[type]
  if (!def) return <span className="text-subtle text-[10px]">{type}</span>
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${BADGE[def.color]}`}>
      {def.label}
    </span>
  )
}

function SourceBadge({ source }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
      source === 'vault'
        ? 'bg-indigo-500/10 text-indigo-400'
        : 'bg-surface-hi text-subtle border border-edge'
    }`}>
      {source}
    </span>
  )
}

const INPUT_CLS = 'w-full bg-surface-hi border border-edge rounded px-2 py-1.5 text-xs text-content placeholder:text-subtle outline-none focus:border-brand/50 transition-colors'

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

function DynamicFields({ credType, values, onChange, showSensitive = true }) {
  const typeDef = CRED_TYPES[credType]
  if (!typeDef) return null
  return (
    <>
      {typeDef.fields.map(f => (
        <FormField key={f.name} label={f.name.replace(/_/g, ' ')}>
          <input
            type={f.sensitive && showSensitive ? 'password' : 'text'}
            autoComplete="off"
            value={values[f.name] ?? ''}
            onChange={e => onChange(f.name, e.target.value)}
            className={INPUT_CLS}
          />
        </FormField>
      ))}
    </>
  )
}

function Modal({ title, onClose, footer, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-canvas border border-edge rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge shrink-0">
          <h2 className="text-sm font-semibold text-content">{title}</h2>
          <button onClick={onClose} className="text-subtle hover:text-content transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="p-4 overflow-auto flex-1">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-edge shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

function CreateModal({ onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [credType, setCredType] = useState('userpass')
  const [source, setSource] = useState('local')
  const [fieldValues, setFieldValues] = useState({})
  const [vaultPath, setVaultPath] = useState('')

  const setField = (key, val) => setFieldValues(prev => ({ ...prev, [key]: val }))

  const mutation = useMutation({
    mutationFn: createCredential,
    onSuccess: () => { onSuccess(); onClose() },
  })

  const submit = () => {
    const payload = { name: name.trim(), credential_type: credType, source }
    if (source === 'vault') {
      payload.vault_path = vaultPath.trim()
    } else {
      payload.fields = Object.fromEntries(
        Object.entries(fieldValues).filter(([, v]) => v !== '')
      )
    }
    mutation.mutate(payload)
  }

  return (
    <Modal
      title="New Credential"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-3 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || mutation.isPending}
            className="px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
          >
            {mutation.isPending ? 'Creating…' : 'Create'}
          </button>
        </>
      }
    >
      <FormField label="Name" required>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className={INPUT_CLS}
          autoFocus
        />
      </FormField>

      <FormField label="Type" required>
        <select
          value={credType}
          onChange={e => { setCredType(e.target.value); setFieldValues({}) }}
          className={INPUT_CLS}
        >
          {Object.entries(CRED_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Source" required>
        <select value={source} onChange={e => setSource(e.target.value)} className={INPUT_CLS}>
          <option value="local">Local (encrypted in database)</option>
          <option value="vault">HashiCorp Vault</option>
        </select>
      </FormField>

      {source === 'vault' ? (
        <FormField label="Vault Path" required>
          <input
            type="text"
            value={vaultPath}
            onChange={e => setVaultPath(e.target.value)}
            placeholder="secret/network/core-switches"
            className={INPUT_CLS}
          />
          <p className="mt-1 text-[10px] text-subtle">KV v2 path. Keys must match field names for this type.</p>
        </FormField>
      ) : (
        <DynamicFields credType={credType} values={fieldValues} onChange={setField} />
      )}

      {mutation.isError && (
        <p className="mt-2 text-[11px] text-red-400">Failed to create credential.</p>
      )}
    </Modal>
  )
}

function EditModal({ credential, onClose, onSuccess }) {
  const typeDef = CRED_TYPES[credential.credential_type] ?? { fields: [] }

  const initialValues = Object.fromEntries(
    typeDef.fields
      .filter(f => !f.sensitive)
      .map(f => {
        const existing = credential.fields?.find(cf => cf.field_name === f.name)
        return [f.name, existing?.field_value ?? '']
      })
  )

  const [name, setName] = useState(credential.name)
  const [fieldValues, setFieldValues] = useState(initialValues)

  const setField = (key, val) => setFieldValues(prev => ({ ...prev, [key]: val }))

  const mutation = useMutation({
    mutationFn: (data) => updateCredential(credential.id, data),
    onSuccess: (updated) => { onSuccess(updated); onClose() },
  })

  const submit = () => {
    const payload = { name: name.trim() }
    const fields = Object.fromEntries(Object.entries(fieldValues).filter(([, v]) => v !== ''))
    if (Object.keys(fields).length > 0) payload.fields = fields
    mutation.mutate(payload)
  }

  return (
    <Modal
      title="Edit Credential"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-3 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || mutation.isPending}
            className="px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <FormField label="Name" required>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className={INPUT_CLS}
          autoFocus
        />
      </FormField>

      <DynamicFields credType={credential.credential_type} values={fieldValues} onChange={setField} />
      <p className="text-[10px] text-subtle -mt-1">Leave sensitive fields empty to keep current values.</p>

      {mutation.isError && (
        <p className="mt-2 text-[11px] text-red-400">Failed to save.</p>
      )}
    </Modal>
  )
}

function DetailPanel({ credential, onClose, onEdit, onDelete }) {
  const [secretFields, setSecretFields] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [copyStates, setCopyStates] = useState({})
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const typeDef = CRED_TYPES[credential.credential_type] ?? { fields: [] }
  const hasSensitive = typeDef.fields.some(f => f.sensitive)

  const loadSecret = async () => {
    if (secretFields) return secretFields
    const data = await fetchCredentialSecret(credential.id)
    setSecretFields(data.fields)
    return data.fields
  }

  const handleRevealDown = async () => {
    await loadSecret()
    setRevealed(true)
  }

  const handleRevealUp = () => setRevealed(false)

  const copyField = async (fieldName) => {
    setCopyStates(s => ({ ...s, [fieldName]: 'loading' }))
    try {
      const fields = await loadSecret()
      await navigator.clipboard.writeText(fields[fieldName] ?? '')
      setCopyStates(s => ({ ...s, [fieldName]: 'copied' }))
      setTimeout(() => setCopyStates(s => ({ ...s, [fieldName]: undefined })), 1500)
    } catch {
      setCopyStates(s => ({ ...s, [fieldName]: undefined }))
    }
  }

  const fieldMap = Object.fromEntries(
    (credential.fields ?? []).map(f => [f.field_name, f])
  )

  return (
    <div className="border-t border-edge bg-surface shrink-0 overflow-auto" style={{ maxHeight: '260px' }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-edge sticky top-0 bg-surface z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-content truncate">{credential.name}</span>
          <TypeBadge type={credential.credential_type} />
          <SourceBadge source={credential.source} />
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-3">
          {credential.source === 'local' && hasSensitive && (
            <>
              <button
                onMouseDown={handleRevealDown}
                onMouseUp={handleRevealUp}
                onMouseLeave={handleRevealUp}
                onTouchStart={handleRevealDown}
                onTouchEnd={handleRevealUp}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-edge text-subtle hover:text-content transition-colors select-none"
              >
                {revealed ? <EyeOff size={11} /> : <Eye size={11} />}
                Reveal
              </button>
              {typeDef.fields.filter(f => f.sensitive).map(f => {
                const copyState = copyStates[f.name]
                return (
                  <button
                    key={f.name}
                    onClick={() => copyField(f.name)}
                    disabled={copyState === 'loading'}
                    title={`Copy ${f.name} to clipboard`}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-edge text-subtle hover:text-content disabled:opacity-40 transition-colors"
                  >
                    {copyState === 'copied'
                      ? <Check size={11} className="text-green-400" />
                      : <Clipboard size={11} />
                    }
                    {copyState === 'copied' ? 'Copied!' : 'Copy to clipboard'}
                  </button>
                )
              })}
            </>
          )}
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-edge text-subtle hover:text-content transition-colors"
          >
            <Pencil size={11} />
            Edit
          </button>
          {deleteConfirm ? (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-red-400">Delete?</span>
              <button
                onClick={() => onDelete(credential.id)}
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
              <Trash2 size={11} />
              Delete
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded text-subtle hover:text-content transition-colors ml-1">
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="px-4 py-3">
        {credential.source === 'vault' ? (
          <div className="text-[11px] text-subtle">
            Vault path:{' '}
            <span className="font-mono text-indigo-400">{credential.vault_path}</span>
          </div>
        ) : (
          <div className="space-y-2">
            {typeDef.fields.map(f => {
              const fieldData = fieldMap[f.name]
              const displayValue = f.sensitive
                ? (revealed && secretFields ? secretFields[f.name] : '••••••••')
                : (fieldData?.field_value ?? '—')

              return (
                <div key={f.name} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-[11px] text-subtle font-mono">{f.name}</span>
                  <span className={`flex-1 text-[11px] font-mono break-all ${
                    f.sensitive && revealed ? 'text-amber-300' : 'text-content'
                  }`}>
                    {displayValue}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const DEFAULTS = { name: '', limit: 50, offset: 0 }
const FILTERS = [{ key: 'name', label: 'Name', width: '200px' }]

export default function CredentialsPage() {
  const queryClient = useQueryClient()
  const [params, setParams] = useQueryParams(DEFAULTS)
  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['credentials', params],
    queryFn: () => fetchCredentials(params),
    placeholderData: keepPreviousData,
  })

  const credentials = data?.items ?? (Array.isArray(data) ? data : [])
  const total = data?.total ?? credentials.length

  const deleteMutation = useMutation({
    mutationFn: deleteCredential,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] })
      setSelected(null)
    },
  })

  const handleRowClick = (cred) => {
    setSelected(sel => sel?.id === cred.id ? null : cred)
  }

  const handleEditSuccess = (updated) => {
    setSelected(updated)
    queryClient.invalidateQueries({ queryKey: ['credentials'] })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Credentials"
        description={total > 0 ? `${total} credentials` : undefined}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-brand text-white hover:bg-brand/90 transition-colors"
          >
            <Plus size={12} />
            Add Credential
          </button>
        }
      />

      <TableToolbar
        filters={FILTERS}
        values={{ name: params.name }}
        onChange={vals => setParams({ ...vals, offset: 0 })}
      />

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-canvas z-10">
              <tr className="border-b border-edge">
                {['Name', 'Type', 'Source'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-subtle px-4 py-2.5 first:pl-6">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }, (_, i) => (
                    <tr key={i} className="border-b border-edge/50">
                      {[1, 2, 3].map(j => (
                        <td key={j} className="px-4 py-2.5 first:pl-6">
                          <div className="h-3 bg-surface-hi rounded animate-pulse" style={{ width: j === 1 ? '40%' : '70px' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : credentials.map(cred => (
                    <tr
                      key={cred.id}
                      onClick={() => handleRowClick(cred)}
                      className={[
                        'border-b border-edge/50 cursor-pointer transition-colors',
                        selected?.id === cred.id
                          ? 'bg-brand/5'
                          : 'hover:bg-surface-hi',
                      ].join(' ')}
                    >
                      <td className="px-4 py-2.5 pl-6 text-content font-medium">{cred.name}</td>
                      <td className="px-4 py-2.5"><TypeBadge type={cred.credential_type} /></td>
                      <td className="px-4 py-2.5"><SourceBadge source={cred.source} /></td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
          {!isLoading && credentials.length === 0 && (
            <div className="px-6 py-8 text-xs text-subtle">No credentials found.</div>
          )}
        </div>

        {selected && (
          <DetailPanel
            key={selected.id}
            credential={selected}
            onClose={() => setSelected(null)}
            onEdit={() => setShowEdit(true)}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        )}
      </div>

      <Pagination
        offset={params.offset}
        limit={params.limit}
        total={total}
        onChange={offset => setParams({ offset })}
      />

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['credentials'] })}
        />
      )}

      {showEdit && selected && (
        <EditModal
          credential={selected}
          onClose={() => setShowEdit(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  )
}
