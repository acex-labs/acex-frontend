// Where a merge request puts its file: a folder and a file name as one path in the repository, and which
// git repositories of ACEX read that place.

/** A folder as the repository names it: no slash at either end, none doubled. Empty is the root. */
export function folderOf(text) {
  return text.trim().split('/').map(part => part.trim()).filter(Boolean).join('/')
}

/** A file name with `.py`, which ACEX reads ConfigMaps from, added when it is left out. */
export function fileNameOf(text) {
  const name = folderOf(text)
  return !name || name.endsWith('.py') ? name : `${name}.py`
}

export function pathOf(folder, name) {
  return [folderOf(folder), fileNameOf(name)].filter(Boolean).join('/')
}

const directoryOf = (path) => path.split('/').slice(0, -1).join('/')

// The same repository on the git host, whatever name it has in ACEX.
const repositoryOf = (repo) => repo.url.trim().replace(/\/+$/, '').replace(/\.git$/, '')

/** The git host and the project that a repository URL names. */
export function projectOf(url) {
  try {
    const { host, pathname } = new URL(url)
    return { host, project: pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '') }
  } catch {
    return { host: '', project: url }
  }
}

/**
 * The git repositories of ACEX that load a file at `path`: those of the same repository and branch as `target`
 * whose ConfigMaps directory holds it. None: the file can be merged, but ACEX never reads it.
 */
export function readersOf(repositories, target, path) {
  const directory = directoryOf(path)
  return repositories.filter(repo =>
    repo.enabled &&
    repositoryOf(repo) === repositoryOf(target) &&
    repo.branch === target.branch &&
    (repo.path === '' || directory === repo.path || directory.startsWith(`${repo.path}/`)))
}
