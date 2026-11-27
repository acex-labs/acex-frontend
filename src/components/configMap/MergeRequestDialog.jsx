import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ExternalLink, X } from 'lucide-react'
import { createMergeRequest, fetchGitRepositories, fetchGitRepositoryTree } from '../../api/gitRepositories'
import { apiErrorMessage } from '../../api/apiError'
import FormField from '../ui/FormField'
import { fileNameOf, pathOf, projectOf, readersOf } from './mergeRequestPath'

const INPUT_CLS = 'w-full bg-surface-hi border border-edge rounded px-2 py-1.5 text-xs text-content placeholder:text-subtle outline-none focus:border-brand/50 transition-colors'

/** Who reads the place the file goes to: ACEX only loads ConfigMaps from the directories of its git repositories. */
function Readers({ readers }) {
  if (readers.length === 0) {
    return (
      <p className="-mt-1 mb-3 text-[10px] text-amber-400">
        ACEX does not read this folder. The file can be merged, but it is not used until a git repository is added for the folder.
      </p>
    )
  }
  return (
    <p className="-mt-1 mb-3 text-[10px] text-subtle">
      ACEX reads this folder through{' '}
      {readers.map((repo, i) => (
        <span key={repo.id}>
          {i > 0 && ', '}
          <span className="text-content">{repo.name}</span>
          {repo.site ? ` (site ${repo.site})` : ' (any site)'}
        </span>
      ))}
      . The ConfigMap is used once the merge request is merged.
    </p>
  )
}

function Sent({ sent, onClose }) {
  return (
    <>
      <div className="p-4">
        <p className="text-xs text-content">
          Merge request !{sent.number} is open.{' '}
          <a href={sent.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
            Open it on the git host <ExternalLink size={11} />
          </a>
        </p>
        <p className="mt-2 text-[11px] text-subtle">
          <span className="font-mono text-content">{sent.path}</span> is on the new branch{' '}
          <span className="font-mono text-content">{sent.source_branch}</span>. Nothing changes on{' '}
          <span className="font-mono text-content">{sent.target_branch}</span>, or on any device, until the merge request is merged.
        </p>
      </div>
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-edge shrink-0">
        <button onClick={onClose} className="px-3 py-1 rounded text-xs bg-brand text-white font-semibold">Close</button>
      </div>
    </>
  )
}

/** Send `code` to a git repository as a merge request: the user chooses the repository, the folder and the file name. */
export default function MergeRequestDialog({ code, onClose }) {
  const [repoId, setRepoId] = useState(null)
  // Null until the user changes them: the folder is then the repository's own, the title is made from the file name.
  const [folder, setFolder] = useState(null)
  const [title, setTitle] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [replace, setReplace] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const repositories = useQuery({ queryKey: ['git-repositories'], queryFn: fetchGitRepositories })
  const all = repositories.data ?? []
  const targets = all.filter(repo => repo.merge_request_credential_id != null)
  const repo = targets.find(r => r.id === repoId) ?? targets[0] ?? null

  const tree = useQuery({
    queryKey: ['git-repository-tree', repo?.id],
    queryFn: () => fetchGitRepositoryTree(repo.id),
    enabled: Boolean(repo),
    staleTime: 30_000,
    retry: false,
  })

  const inFolder = folder ?? repo?.path ?? ''
  const fileName = fileNameOf(name)
  const path = pathOf(inFolder, name)
  const send = useMutation({
    mutationFn: (to) => createMergeRequest(to.repo, {
      path: to.path,
      content: code,
      title: usedTitle.trim(),
      description: description.trim() || null,
      replace,
    }),
  })
  // A file is known to be there from the listing, or, where the listing was cut short, from a refusal to add it.
  const refused = send.error?.status === 409 && send.variables?.repo === repo?.id && send.variables?.path === path
  const exists = Boolean(fileName) && ((tree.data?.files ?? []).includes(path) || refused)
  const usedTitle = title ?? (fileName ? `${exists ? 'Change' : 'Add'} ${path}` : '')

  const canSend = repo && fileName && usedTitle.trim() && (!exists || replace) && !send.isPending
  const { host, project } = projectOf(repo?.url ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create merge request"
        className="bg-canvas border border-edge rounded-lg shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge shrink-0">
          <h2 className="text-sm font-semibold text-content">Create merge request</h2>
          <button onClick={onClose} aria-label="Close" className="text-subtle hover:text-content transition-colors">
            <X size={14} />
          </button>
        </div>

        {send.isSuccess ? <Sent sent={send.data} onClose={onClose} /> : (
          <>
            <div className="p-4 overflow-auto flex-1">
              {repositories.isLoading && <p className="text-xs text-subtle">Reading the git repositories…</p>}
              {repositories.isError && (
                <p className="text-xs text-red-400">{apiErrorMessage(repositories.error, 'Could not load the git repositories.')}</p>
              )}
              {repositories.isSuccess && !repo && (
                <p className="text-xs text-subtle">
                  No git repository takes merge requests yet. Give one a merge request token under{' '}
                  <Link to="/settings/git-repositories" className="text-brand hover:underline">Settings &gt; Git Repositories</Link>.
                </p>
              )}

              {repo && (
                <>
                  <FormField
                    label="Git repository"
                    required
                    hint={<>The merge request asks to merge into <span className="font-mono text-content">{repo.branch}</span> of <span className="font-mono text-content break-all">{project}</span>{host && ` on ${host}`}.</>}
                  >
                    <select
                      value={repo.id}
                      onChange={e => { setRepoId(Number(e.target.value)); setFolder(null); setReplace(false) }}
                      className={INPUT_CLS}
                    >
                      {targets.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </FormField>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      label="Folder"
                      hint={
                        tree.isLoading ? 'Reading the folders of the repository…'
                          : tree.data?.truncated ? 'The repository has more folders than are listed. Any folder can be typed.'
                          : 'Choose a folder of the repository or type a new one. Empty for its root.'
                      }
                    >
                      <input
                        type="text"
                        list="merge-request-folders"
                        value={inFolder}
                        onChange={e => { setFolder(e.target.value); setReplace(false) }}
                        placeholder="Repository root"
                        spellCheck={false}
                        className={`${INPUT_CLS} font-mono`}
                      />
                      <datalist id="merge-request-folders">
                        {(tree.data?.directories ?? []).map(directory => <option key={directory} value={directory} />)}
                      </datalist>
                    </FormField>
                    <FormField label="File name" required hint="A Python file. .py is added when it is left out.">
                      <input
                        type="text"
                        value={name}
                        onChange={e => { setName(e.target.value); setReplace(false) }}
                        placeholder="ntp.py"
                        spellCheck={false}
                        autoFocus
                        className={`${INPUT_CLS} font-mono`}
                      />
                    </FormField>
                  </div>

                  {tree.isError && (
                    <p className="-mt-1 mb-3 text-[10px] text-red-400">
                      {apiErrorMessage(tree.error, 'Could not read the folders of the repository.')}
                    </p>
                  )}
                  <Readers readers={readersOf(all, repo, pathOf(inFolder, name || 'file'))} />

                  {exists && (
                    <label className="mb-3 flex items-start gap-2 text-[11px] text-amber-400">
                      <input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} className="mt-0.5" />
                      <span>
                        <span className="font-mono">{path}</span> is already in the repository. Replace it: the merge request then changes that file.
                      </span>
                    </label>
                  )}

                  <FormField label="Title" required>
                    <input type="text" value={usedTitle} onChange={e => setTitle(e.target.value)} maxLength={255} className={INPUT_CLS} />
                  </FormField>
                  <FormField label="Description" hint="Shown in the merge request, which also names you as the sender.">
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      className={`${INPUT_CLS} resize-y`}
                    />
                  </FormField>

                  {send.isError && !refused && (
                    <p className="text-[11px] text-red-400">{apiErrorMessage(send.error, 'The merge request could not be sent.')}</p>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-edge shrink-0">
              <button onClick={onClose} className="px-3 py-1 rounded text-xs border border-edge text-subtle hover:text-content transition-colors">
                Cancel
              </button>
              <button
                onClick={() => send.mutate({ repo: repo.id, path })}
                disabled={!canSend}
                className="px-3 py-1 rounded text-xs bg-brand text-white font-semibold disabled:opacity-40 transition-opacity"
              >
                {send.isPending ? 'Sending…' : 'Create merge request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
