import dagre from '@dagrejs/dagre'
import { Lightbulb, Wrench } from 'lucide-react'

// The triage is the root of its hypotree. Its nodes are actions and hypotheses: actions are the steps, done one
// after the other; only a hypothesis opens a new thread, a hypobranch (the hypothesis and everything after it).
// So a node has at most one action after it, and any number of hypotheses. A hypobranch ends where its chain of
// actions ends, and is validated there: root cause or not. What was seen is not a node but an observation, kept
// beside the tree and linked to the hypotheses it supports or contradicts.
export const ROOT = 'triage'

export const KINDS = {
  hypothesis: {
    label: 'Hypothesis',
    icon: Lightbulb,
    about: 'A possible cause. It opens a hypobranch, worked through with actions and validated at its end.',
    placeholder: 'What might cause it?',
  },
  action: {
    label: 'Action',
    icon: Wrench,
    about: 'An action point: something to do, check or change. Actions follow one another.',
    placeholder: 'What is to be done?',
  },
}

export const STATUSES = {
  open: { label: 'Open', className: 'text-subtle border-edge' },
  done: { label: 'Done', className: 'text-green-400 border-green-500/50' },
  root_cause: { label: 'Root cause', className: 'text-green-400 border-green-500/60' },
  not_root_cause: { label: 'Not root cause', className: 'text-red-400 border-red-500/50' },
}

export const observationTitle = o => o.title.trim() || 'Untitled observation'

// Everything the canvas and panels need to know about the tree, worked out once per change.
export function analyse(triage, steps, observations = []) {
  const byId = new Map(steps.map(s => [s.id, s]))
  const parentOf = s => (s.parent_id == null ? ROOT : s.parent_id)
  const children = new Map([[ROOT, []]])
  steps.forEach(s => children.set(s.id, []))
  steps.forEach(s => children.get(parentOf(s))?.push(s.id))
  // The one action after a node, if any.
  const actionAfter = id => children.get(id).find(c => byId.get(c).kind === 'action') ?? null

  // Who owns a node: its own assignee, else the nearest one upstream, else the lead.
  const owners = new Map()
  const ownerOf = id => {
    if (id === ROOT) return triage.assignee ?? null
    if (!owners.has(id)) {
      const s = byId.get(id)
      owners.set(id, s.assignee ?? ownerOf(parentOf(s)))
    }
    return owners.get(id)
  }

  // The hypothesis whose hypobranch a node is in: itself, or the nearest one upstream (null under the triage).
  const branchOf = id => {
    for (let s = byId.get(id); s; s = s.parent_id == null ? null : byId.get(s.parent_id)) {
      if (s.kind === 'hypothesis') return s
    }
    return null
  }
  // Where each hypobranch ends: the last action in its hypothesis' chain, or the hypothesis itself.
  const ends = new Map()
  steps.filter(s => s.kind === 'hypothesis').forEach(h => {
    let end = h.id
    for (let next = actionAfter(end); next != null; next = actionAfter(next)) end = next
    ends.set(end, h)
  })

  // A hypothesis that is not the root cause, and everything after it, is greyed out.
  const ruledOut = new Set()
  const mark = id => { ruledOut.add(id); children.get(id).forEach(mark) }
  steps.filter(s => s.status === 'not_root_cause').forEach(s => mark(s.id))

  // The evidence for and against each hypothesis: the observations linked to it.
  const evidence = new Map(steps.map(s => [s.id, { supports: [], contradicts: [] }]))
  observations.forEach(o => o.links.forEach(l => evidence.get(l.step_id)?.[l.effect].push(o)))

  // Everyone in the triage: the lead and every assignee, for picking one.
  const people = [...new Set([triage.assignee, ...steps.map(s => s.assignee)].filter(Boolean))].sort()

  return {
    byId,
    children,
    parentOf,
    actionAfter,
    ownerOf,
    branchOf,
    // The hypothesis a node ends the hypobranch of, if it does: where that hypothesis is validated.
    endOf: id => ends.get(id) ?? null,
    ends,
    ruledOut,
    people,
    evidence,
    hypotheses: steps.filter(s => s.kind === 'hypothesis'),
    rootCauses: steps.filter(s => s.status === 'root_cause'),
    upstreamOwner: s => ownerOf(parentOf(s)),
  }
}

// Everyone visibly involved, with the work that shows what each person did. Names are compared trimmed, not
// case-folded, so the spelling chosen in the triage remains the identity shown in the footer.
export function participants(triage, steps, observations = []) {
  const people = new Map()
  const person = value => {
    const name = value?.trim()
    if (!name) return null
    if (!people.has(name)) {
      people.set(name, { name, isLead: false, branches: [], ownedSteps: [], verdicts: [], observations: [] })
    }
    return people.get(name)
  }

  const lead = person(triage.assignee)
  if (lead) lead.isLead = true
  steps.forEach(s => {
    const owner = person(s.assignee)
    if (owner) {
      owner.ownedSteps.push({ id: s.id, title: s.title, kind: s.kind, status: s.status })
      if (s.kind === 'hypothesis') owner.branches.push({ id: s.id, title: s.title || 'Untitled hypothesis' })
    }
    if (s.status === 'root_cause' || s.status === 'not_root_cause') {
      person(s.validated_by)?.verdicts.push({ id: s.id, title: s.title || 'Untitled hypothesis', status: s.status })
    }
  })
  observations.forEach(o => {
    person(o.created_by)?.observations.push({ id: o.id, title: observationTitle(o) })
  })

  return [...people.values()].map(p => ({
    ...p,
    observationCount: p.observations.length,
    rootCauseCount: p.verdicts.filter(v => v.status === 'root_cause').length,
    notRootCauseCount: p.verdicts.filter(v => v.status === 'not_root_cause').length,
  })).sort((a, b) => Number(b.isLead) - Number(a.isLead) || a.name.localeCompare(b.name))
}

const SIZES = { root: { width: 270, height: 100 }, step: { width: 250, height: 118 }, verdict: { width: 150, height: 40 } }

// Positions left to right, the tree laid out from its structure; nothing is dragged or saved. `verdicts` are the
// ends of validated hypobranches: { id, after } with `after` the node they follow.
export function layout(steps, verdicts = []) {
  const g = new dagre.graphlib.Graph().setGraph({ rankdir: 'LR', nodesep: 28, ranksep: 64 }).setDefaultEdgeLabel(() => ({}))
  g.setNode(ROOT, SIZES.root)
  steps.forEach(s => g.setNode(String(s.id), SIZES.step))
  steps.forEach(s => g.setEdge(s.parent_id == null ? ROOT : String(s.parent_id), String(s.id)))
  verdicts.forEach(v => { g.setNode(v.id, SIZES.verdict); g.setEdge(String(v.after), v.id) })
  dagre.layout(g)
  const at = (id, size) => { const { x, y } = g.node(id); return { x: x - size.width / 2, y: y - size.height / 2 } }
  return new Map([
    [ROOT, at(ROOT, SIZES.root)],
    ...steps.map(s => [s.id, at(String(s.id), SIZES.step)]),
    ...verdicts.map(v => [v.id, at(v.id, SIZES.verdict)]),
  ])
}
