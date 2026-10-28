import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Box, ChevronRight, Folder, FolderOpen, X } from 'lucide-react'
import { fetchConfigTree, fetchNeds } from '../../api/operations'
import { fetchAnnotatedDesiredConfig } from '../../api/config'
import { check, childrenOf, coveredLines, pathId, within, writable } from './scope'

const FOLDERS = ['root', 'branch', 'collection']

// One field of the tree and, when open, what it holds. Checking it puts it and everything below it in the
// scope; a field below a checked one is in it already, so its box is ticked and locked.
function TreeRow({ item, depth, tree }) {
  const { scopes, spans, expanded, templates, onToggle, onCheck, onUncheck } = tree
  const id = pathId(item.path)
  const children = childrenOf(item, spans)
  const open = expanded.has(id)
  const checked = scopes.some(s => pathId(s) === id)
  const covering = scopes.find(s => s.length < item.path.length && within(item.path, s))
  const partly = !checked && !covering && scopes.some(s => s.length > item.path.length && within(s, item.path))
  const canWrite = item.kind === 'root' || writable(item.path, templates)
  const Icon = FOLDERS.includes(item.kind) ? (open ? FolderOpen : Folder) : Box
  return (
    <>
      <div
        className={`flex items-center gap-1.5 pr-3 py-0.5 text-[11px] ${checked || covering ? 'bg-brand/5' : ''} hover:bg-surface-hi`}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        <button
          onClick={() => onToggle(id)}
          className={`shrink-0 text-subtle ${children.length ? 'hover:text-content' : 'invisible'}`}
        >
          <ChevronRight size={12} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
        <input
          type="checkbox"
          checked={checked || !!covering}
          disabled={!!covering}
          ref={el => el && (el.indeterminate = partly)}
          onChange={() => (checked ? onUncheck(item.path) : onCheck(item.path))}
          title={covering ? `In the scope with ${covering.join(' › ') || 'the whole configuration'}` : undefined}
        />
        {item.kind !== 'attribute' && <Icon size={12} className={canWrite ? 'text-brand shrink-0' : 'text-subtle shrink-0'} />}
        <span
          onClick={() => children.length && onToggle(id)}
          className={[
            'truncate',
            item.kind === 'entry' ? 'font-mono' : '',
            item.kind === 'attribute' ? 'italic text-subtle' : 'text-content',
            FOLDERS.includes(item.kind) ? 'font-semibold' : '',
            canWrite ? '' : 'opacity-50',
            children.length ? 'cursor-pointer' : '',
          ].join(' ')}
          title={canWrite ? item.type ?? undefined : 'No driver of the chosen nodes writes this'}
        >
          {item.name}
        </span>
        {item.kind === 'collection' && <span className="text-[10px] text-subtle tabular-nums">({children.length})</span>}
      </div>
      {open && children.map(child => <TreeRow key={pathId(child.path)} item={child} depth={depth + 1} tree={tree} />)}
    </>
  )
}

// The reference node's rendered desired configuration, the lines the scopes cover lit and the rest faded.
function ConfigPreview({ annotated, scopes }) {
  const box = useRef(null)
  const lines = annotated.content.split('\n')
  const covered = coveredLines(annotated.spans, scopes)
  const first = lines.findIndex((_, i) => covered.has(i + 1))
  useEffect(() => {
    box.current?.querySelector('[data-first]')?.scrollIntoView({ block: 'nearest' })
  }, [first])
  return (
    <div ref={box} className="h-80 overflow-auto bg-surface-hi text-[11px] font-mono py-1">
      {lines.map((line, i) => (
        <div
          key={i}
          data-first={i === first ? '' : undefined}
          className={`px-3 whitespace-pre ${covered.has(i + 1) ? 'bg-brand/10 text-content' : 'text-subtle/50'}`}
        >
          {line || ' '}
        </div>
      ))}
    </div>
  )
}

// Where in the configuration tree a patch reaches: the fields checked and everything below them. The tree has
// the configuration's shape; collections open to the entries a reference node has, and its rendered desired
// configuration shows which lines the scope covers.
export default function ScopePicker({ nodes, scopes, onChange }) {
  const { data: schema } = useQuery({ queryKey: ['config-tree'], queryFn: fetchConfigTree, staleTime: Infinity })
  const { data: neds = [] } = useQuery({ queryKey: ['neds'], queryFn: fetchNeds, staleTime: 300_000 })
  const [referenceId, setReferenceId] = useState(null)
  const reference = nodes.find(n => n.id === referenceId) ?? nodes[0]
  const { data: annotated } = useQuery({
    queryKey: ['annotated-desired', reference?.id],
    queryFn: () => fetchAnnotatedDesiredConfig(reference.id),
    enabled: !!reference,
  })
  const [expanded, setExpanded] = useState(() => new Set([pathId([])]))

  // The top-level paths the chosen nodes' drivers write; unknown when one of them doesn't say.
  const templates = useMemo(() => {
    const used = new Set(nodes.map(n => n.ned_id))
    const lists = neds.filter(n => used.has(n.name)).map(n => n.capabilities?.configuration ?? [])
    return lists.length && lists.every(l => l.length) ? lists.flat() : null
  }, [nodes, neds])

  const tree = {
    scopes,
    spans: annotated?.spans ?? [],
    expanded,
    templates,
    onToggle: id => setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    }),
    onCheck: path => onChange(check(scopes, path)),
    onUncheck: path => onChange(scopes.filter(s => pathId(s) !== pathId(path))),
  }
  const lit = annotated ? coveredLines(annotated.spans, scopes).size : 0

  return (
    <div className="border border-edge rounded-md overflow-hidden">
      <div className="px-3 py-2 border-b border-edge flex items-center gap-1.5 flex-wrap text-[11px]">
        <span className="text-subtle mr-1">Scope</span>
        {scopes.length === 0 && <span className="text-subtle italic">Check what to patch below</span>}
        {scopes.map(s => (
          <span key={pathId(s)} className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded bg-brand/15 text-brand font-mono">
            {s.length ? s.join(' › ') : 'Whole configuration'}
            <button onClick={() => tree.onUncheck(s)} className="hover:text-content"><X size={10} /></button>
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 divide-x divide-edge">
        <div className="h-[22rem] overflow-auto py-1">
          {schema && <TreeRow item={{ path: [], name: 'Whole configuration', kind: 'root', schema }} depth={0} tree={tree} />}
        </div>
        <div className="flex flex-col">
          <div className="px-3 py-1.5 flex items-center gap-2 text-[11px] text-subtle border-b border-edge">
            {reference ? (
              <>
                Desired on
                <select
                  value={reference.id}
                  onChange={e => setReferenceId(Number(e.target.value))}
                  className="bg-surface-hi border border-edge rounded px-1.5 py-0.5 text-content"
                >
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.hostname}</option>)}
                </select>
                <span>· {lit} line{lit === 1 ? '' : 's'} in scope</span>
              </>
            ) : (
              <span>Choose nodes to see their entries and the lines the scope covers.</span>
            )}
          </div>
          {annotated && <ConfigPreview annotated={annotated} scopes={scopes} />}
        </div>
      </div>
      {reference && (
        <div className="px-3 py-1.5 border-t border-edge text-[10px] text-subtle">
          Collections list {reference.hostname}'s entries; the scope applies to every chosen node.
        </div>
      )}
    </div>
  )
}
