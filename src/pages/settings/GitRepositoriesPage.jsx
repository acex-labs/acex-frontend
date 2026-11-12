import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Pencil, Trash2, RefreshCw, GitBranch } from 'lucide-react'
import {
  fetchGitRepositories,
  createGitRepository,
  updateGitRepository,
  deleteGitRepository,
  syncGitRepository,
} from '../../api/gitRepositories'
import { fetchCredentials, createCredential, updateCredential, deleteCredential } from '../../api/inventory'
import PageHeader from '../../components/ui/PageHeader'

const INPUT_CLS = 'w-full bg-surface-hi border border-edge rounded px-2 py-1.5 text-xs text-content placeholder:text-subtle outline-none focus:border-brand/50 transition-colors'
const BTN_CLS = 'flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-edge text-subtle hover:text-content disabled:opacity-40 transition-colors'

const AUTH_METHODS = {
  https_token: 'Personal access token',
  https_anonymous: 'Public repository (no sign-in)',
}

const NEW_TOKEN = 'new'

// Timestamps come without a zone from the backend; they are UTC.
function ago(iso) {
  if (!iso) return 'Never'
  const t = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`).getTime()
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function errorText(err, fallback) {
  const detail = err?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map(d => d.msg?.replace(/^Value error, /, '')).filter(Boolean).join('; ')
  return fallback
}

function repoStatus(repo) {
  if (!repo.enabled) return { label: 'Disabled', cls: 'bg-surface-hi text-subtle border border-edge' }
  if (repo.last_error) return { label: 'Error', cls: 'bg-red-500/10 text-red-400' }
  if (repo.commit) return { label: 'Synced', cls: 'bg-emerald-500/10 text-emerald-400' }
  return { label: 'Pending', cls: 'bg-amber-500/10 text-amber-400' }
}

function StatusBadge({ repo }) {
  const { label, cls } = repoStatus(repo)
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>{label}</span>
}

function FormField({ label, required, hint, children }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] text-subtle mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-subtle">{hint}</p>}
    </div>
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

/** Create a repository, or edit `repo`. A pasted token is saved as a token credential first. */
function RepositoryModal({ repo, tokenCredentials, onClose, onSaved }) {
  const editing = Boolean(repo)
  const [form, setForm] = useState({
    name: repo?.name ?? '',
    url: repo?.url ?? '',
    branch: repo?.branch ?? 'main',
    path: repo?.path ?? '',
    auth_method: repo?.auth_method ?? 'https_token',
    credential: repo?.credential_id != null ? String(repo.credential_id) : (tokenCredentials.length ? '' : NEW_TOKEN),
    username: repo?.username ?? '',
    ca_certificate: repo?.ca_certificate ?? '',
    enabled: repo?.enabled ?? true,
  })
  const [showTls, setShowTls] = useState(Boolean(repo?.ca_certificate))
  const [token, setToken] = useState('')
  const [credentialName, setCredentialName] = useState('')
  const [replaceToken, setReplaceToken] = useState(false)
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const usesToken = form.auth_method === 'https_token'
  const newToken = usesToken && form.credential === NEW_TOKEN
  const currentCredential = tokenCredentials.find(c => String(c.id) === form.credential)

  const mutation = useMutation({
    mutationFn: async () => {
      let credentialId = usesToken && !newToken && form.credential ? Number(form.credential) : null
      let created = null
      if (newToken) {
        created = await createCredential({
          name: (credentialName || `git-${form.name}`).trim(),
          credential_type: 'token',
          fields: { token },
        })
        credentialId = created.id
      } else if (replaceToken && credentialId != null && token) {
        await updateCredential(credentialId, { fields: { token } })
      }
      const payload = {
        name: form.name.trim(),
        url: form.url.trim(),
        branch: form.branch.trim(),
        path: form.path.trim(),
        auth_method: form.auth_method,
        credential_id: usesToken ? credentialId : null,
        username: form.username.trim() || null,
        ca_certificate: form.ca_certificate.trim() || null,
        enabled: form.enabled,
      }
      try {
        return editing ? await updateGitRepository(repo.id, payload) : await createGitRepository(payload)
      } catch (err) {
        // Don't leave a credential behind for a repository that was never saved.
        if (created) await deleteCredential(created.id).catch(() => {})
        throw err
      }
    },
    onSuccess: (saved) => { onSaved(saved); onClose() },
  })

  const canSave =
    form.name.trim() && form.url.trim() && form.branch.trim() &&
    (!usesToken || (newToken ? token : form.credential)) &&
    !(replaceToken && !token)

  return (
    <Modal
      title={editing ? 'Edit Git Repository' : 'Add Git Repository'}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-3 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSave || mutation.isPending}
            className="px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
          >
            {mutation.isPending ? 'Saving and syncing…' : editing ? 'Save' : 'Add'}
          </button>
        </>
      }
    >
      <FormField label="Name" required>
        <input type="text" value={form.name} onChange={e => set('name', e.target.value)} className={INPUT_CLS} autoFocus />
      </FormField>

      <FormField label="Repository URL" required hint="The HTTPS clone URL, without credentials in it.">
        <input
          type="text"
          value={form.url}
          onChange={e => set('url', e.target.value)}
          placeholder="https://github.com/acme/network-config.git"
          className={`${INPUT_CLS} font-mono`}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Branch" required>
          <input type="text" value={form.branch} onChange={e => set('branch', e.target.value)} className={`${INPUT_CLS} font-mono`} />
        </FormField>
        <FormField label="Directory" hint="Empty for the repository's root.">
          <input
            type="text"
            value={form.path}
            onChange={e => set('path', e.target.value)}
            placeholder="config_maps"
            className={`${INPUT_CLS} font-mono`}
          />
        </FormField>
      </div>

      <FormField label="Authentication" required>
        <select value={form.auth_method} onChange={e => set('auth_method', e.target.value)} className={INPUT_CLS}>
          {Object.entries(AUTH_METHODS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </FormField>

      {usesToken && (
        <>
          <FormField label="Token" required>
            <select
              value={form.credential}
              onChange={e => { set('credential', e.target.value); setReplaceToken(false); setToken('') }}
              className={INPUT_CLS}
            >
              <option value="" disabled>Choose a token credential…</option>
              {tokenCredentials.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              <option value={NEW_TOKEN}>+ Paste a new token…</option>
            </select>
          </FormField>

          {newToken && (
            <>
              <FormField label="Personal access token" required hint="Needs read access to the repository only.">
                <input type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} className={INPUT_CLS} />
              </FormField>
              <FormField label="Save as credential" hint="Stored encrypted under Settings > Credentials.">
                <input
                  type="text"
                  value={credentialName}
                  onChange={e => setCredentialName(e.target.value)}
                  placeholder={`git-${form.name || 'repository'}`}
                  className={INPUT_CLS}
                />
              </FormField>
            </>
          )}

          {editing && currentCredential && (
            replaceToken ? (
              <FormField
                label="New token"
                required
                hint={`Replaces the token in credential ${currentCredential.name}, also for anything else that uses it.`}
              >
                <input type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} className={INPUT_CLS} />
              </FormField>
            ) : (
              <button onClick={() => setReplaceToken(true)} className="-mt-1 mb-3 text-[11px] text-brand hover:underline">
                Replace the token in {currentCredential.name}
              </button>
            )
          )}

          <FormField label="Username" hint="Most hosts accept any. Bitbucket needs the account's username.">
            <input
              type="text"
              value={form.username}
              onChange={e => set('username', e.target.value)}
              placeholder="x-access-token"
              className={INPUT_CLS}
            />
          </FormField>
        </>
      )}

      {showTls ? (
        <FormField
          label="CA certificate (PEM)"
          hint="For a host whose certificate an internal CA signed. Paste the CA chain, including intermediates the host doesn't send. Leave empty to trust only public CAs."
        >
          <textarea
            value={form.ca_certificate}
            onChange={e => set('ca_certificate', e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder={'-----BEGIN CERTIFICATE-----\n…\n-----END CERTIFICATE-----'}
            className={`${INPUT_CLS} font-mono text-[10px] resize-y`}
          />
        </FormField>
      ) : (
        <button onClick={() => setShowTls(true)} className="-mt-1 mb-3 block text-[11px] text-brand hover:underline">
          Trust an internal CA…
        </button>
      )}

      <label className="flex items-center gap-2 text-xs text-content">
        <input type="checkbox" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} />
        Enabled: sync this repository and use its ConfigMaps
      </label>

      {mutation.isError && (
        <p className="mt-3 text-[11px] text-red-400">{errorText(mutation.error, 'Failed to save the repository.')}</p>
      )}
    </Modal>
  )
}

function Detail({ label, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-28 shrink-0 text-[11px] text-subtle">{label}</span>
      <span className="flex-1 min-w-0 text-[11px] text-content break-all">{children}</span>
    </div>
  )
}

function DetailPanel({ repo, credentialName, onClose, onEdit, onDeleted, onSynced }) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const sync = useMutation({ mutationFn: () => syncGitRepository(repo.id), onSuccess: onSynced })
  const remove = useMutation({ mutationFn: () => deleteGitRepository(repo.id), onSuccess: onDeleted })

  return (
    <div className="border-t border-edge bg-surface shrink-0 overflow-auto" style={{ maxHeight: '45%' }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-edge sticky top-0 bg-surface z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-content truncate">{repo.name}</span>
          <StatusBadge repo={repo} />
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-3">
          <button
            onClick={() => sync.mutate()}
            disabled={sync.isPending || !repo.enabled}
            title="Fetch and load the branch's latest commit now"
            className={BTN_CLS}
          >
            <RefreshCw size={11} className={sync.isPending ? 'animate-spin' : ''} />
            {sync.isPending ? 'Syncing…' : 'Sync now'}
          </button>
          <button onClick={onEdit} className={BTN_CLS}>
            <Pencil size={11} />
            Edit
          </button>
          {deleteConfirm ? (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-red-400">Delete? Its ConfigMaps stop being used.</span>
              <button
                onClick={() => remove.mutate()}
                disabled={remove.isPending}
                className="px-2 py-1 rounded text-[11px] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Confirm
              </button>
              <button onClick={() => setDeleteConfirm(false)} className={BTN_CLS}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setDeleteConfirm(true)} className={`${BTN_CLS} hover:text-red-400`}>
              <Trash2 size={11} />
              Delete
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded text-subtle hover:text-content transition-colors ml-1">
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {(sync.isError || remove.isError) && (
          <p className="text-[11px] text-red-400">{errorText(sync.error || remove.error, 'The request failed.')}</p>
        )}
        {repo.last_error && (
          <pre className="text-[11px] text-red-400 bg-red-500/5 border border-red-500/20 rounded p-2 whitespace-pre-wrap break-words font-mono">
            {repo.last_error}
          </pre>
        )}

        <div className="space-y-1.5">
          <Detail label="URL"><span className="font-mono">{repo.url}</span></Detail>
          <Detail label="Branch / directory">
            <span className="font-mono">{repo.branch}{repo.path ? ` : ${repo.path}` : ''}</span>
          </Detail>
          <Detail label="Authentication">
            {AUTH_METHODS[repo.auth_method] ?? repo.auth_method}
            {repo.credential_id != null && <> · {credentialName ?? `credential ${repo.credential_id}`}</>}
            {repo.username && <> · as {repo.username}</>}
          </Detail>
          <Detail label="TLS">{repo.ca_certificate ? 'Trusts its own CA certificate' : 'Public CAs'}</Detail>
          <Detail label="Loaded commit"><span className="font-mono">{repo.commit ? repo.commit.slice(0, 12) : '—'}</span></Detail>
          <Detail label="Last loaded">{ago(repo.last_synced_at)}</Detail>
          <Detail label="Last checked">{ago(repo.last_checked_at)}</Detail>
        </div>

        <div>
          <div className="text-[11px] text-subtle mb-1.5">ConfigMaps ({repo.config_maps.length})</div>
          {repo.config_maps.length ? (
            <div className="flex flex-wrap gap-1">
              {repo.config_maps.map(name => (
                <span key={name} className="px-1.5 py-0.5 rounded bg-surface-hi border border-edge text-[10px] font-mono text-content">
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-subtle">None loaded.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function GitRepositoriesPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState(null)
  const [modal, setModal] = useState(null) // 'create' | 'edit' | null

  const { data: repos = [], isLoading, error } = useQuery({
    queryKey: ['git-repositories'],
    queryFn: fetchGitRepositories,
    refetchInterval: 60_000,
  })
  const { data: credentials } = useQuery({
    queryKey: ['credentials', 'all'],
    queryFn: () => fetchCredentials({ limit: 1000 }),
  })
  const allCredentials = credentials?.items ?? (Array.isArray(credentials) ? credentials : [])
  const tokenCredentials = allCredentials.filter(c => c.credential_type === 'token')
  const credentialNames = Object.fromEntries(allCredentials.map(c => [c.id, c.name]))

  const selected = repos.find(r => r.id === selectedId) ?? null

  const refresh = (saved) => {
    if (saved) queryClient.setQueryData(['git-repositories'], (old = []) =>
      old.some(r => r.id === saved.id) ? old.map(r => (r.id === saved.id ? saved : r)) : [...old, saved])
    queryClient.invalidateQueries({ queryKey: ['git-repositories'] })
    queryClient.invalidateQueries({ queryKey: ['credentials'] })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Git Repositories"
        description="ConfigMaps read from git. Each repository is checked for new commits every 30 minutes by default."
        actions={
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-brand text-white hover:bg-brand/90 transition-colors"
          >
            <Plus size={12} />
            Add Repository
          </button>
        }
      />

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-canvas z-10">
              <tr className="border-b border-edge">
                {['Name', 'Repository', 'Status', 'ConfigMaps', 'Commit', 'Last checked'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-subtle px-4 py-2.5 first:pl-6">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 3 }, (_, i) => (
                    <tr key={i} className="border-b border-edge/50">
                      {[1, 2, 3, 4, 5, 6].map(j => (
                        <td key={j} className="px-4 py-2.5 first:pl-6">
                          <div className="h-3 bg-surface-hi rounded animate-pulse" style={{ width: j === 2 ? '60%' : '60px' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : repos.map(repo => (
                    <tr
                      key={repo.id}
                      onClick={() => setSelectedId(id => (id === repo.id ? null : repo.id))}
                      className={[
                        'border-b border-edge/50 cursor-pointer transition-colors',
                        selectedId === repo.id ? 'bg-brand/5' : 'hover:bg-surface-hi',
                      ].join(' ')}
                    >
                      <td className="px-4 py-2.5 pl-6 text-content font-medium">{repo.name}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-subtle max-w-0 w-[40%]">
                        <div className="truncate" title={repo.url}>{repo.url}</div>
                        <div className="flex items-center gap-1 text-[10px]">
                          <GitBranch size={10} />
                          {repo.branch}{repo.path ? ` : ${repo.path}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><StatusBadge repo={repo} /></td>
                      <td className="px-4 py-2.5 text-content">{repo.config_maps.length}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-content">{repo.commit ? repo.commit.slice(0, 8) : '—'}</td>
                      <td className="px-4 py-2.5 text-subtle">{ago(repo.last_checked_at)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {error && (
            <div className="px-6 py-8 text-xs text-red-400">{errorText(error, 'Could not load the repositories.')}</div>
          )}
          {!isLoading && !error && repos.length === 0 && (
            <div className="px-6 py-8 text-xs text-subtle">
              No repositories. Add one to read ConfigMaps from git instead of a mounted directory.
            </div>
          )}
        </div>

        {selected && (
          <DetailPanel
            key={selected.id}
            repo={selected}
            credentialName={credentialNames[selected.credential_id]}
            onClose={() => setSelectedId(null)}
            onEdit={() => setModal('edit')}
            onSynced={refresh}
            onDeleted={() => { setSelectedId(null); refresh() }}
          />
        )}
      </div>

      {modal && (
        <RepositoryModal
          repo={modal === 'edit' ? selected : null}
          tokenCredentials={tokenCredentials}
          onClose={() => setModal(null)}
          onSaved={(saved) => { setSelectedId(saved.id); refresh(saved) }}
        />
      )}
    </div>
  )
}
