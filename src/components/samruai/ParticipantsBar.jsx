import { useState } from 'react'
import { ChevronDown, ChevronRight, CircleCheck, CircleX, Crown, Eye, GitFork, UserRound } from 'lucide-react'
import { STATUSES } from './hypotree'

const CHIP = 'shrink-0 px-1.5 py-0.5 rounded border text-[9px] font-normal'

function Count({ icon: Icon, value, className, title }) {
  if (!value) return null
  return <span className={`flex items-center gap-0.5 ${className}`} title={title}><Icon size={10} /> {value}</span>
}

function PersonCard({ person, expanded, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={`min-w-52 max-w-72 shrink-0 rounded-md border px-2.5 py-1.5 text-left ${person.isLead ? 'border-amber-400/60 bg-amber-400/5' : 'border-edge bg-surface-hi/40 hover:border-brand/40'}`}
    >
      <div className="flex items-center gap-1.5">
        {expanded ? <ChevronDown size={11} className="shrink-0 text-subtle" /> : <ChevronRight size={11} className="shrink-0 text-subtle" />}
        <span className="truncate text-xs font-semibold text-content">{person.name}</span>
        {person.isLead && <span className={`${CHIP} flex items-center gap-1 border-amber-400/50 text-amber-400`}><Crown size={10} /> Lead</span>}
        <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[10px]">
          <Count icon={CircleCheck} value={person.rootCauseCount} className="text-green-400" title="Root causes validated" />
          <Count icon={CircleX} value={person.notRootCauseCount} className="text-red-400" title="Hypotheses ruled out" />
        </span>
      </div>
      {person.branches.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {person.branches.map(branch => (
            <span key={branch.id} className={`${CHIP} flex min-w-0 items-center gap-1 border-brand/30 text-brand`} title={branch.title}>
              <GitFork size={9} className="shrink-0 rotate-90" /> Sublead · <span className="truncate">{branch.title}</span>
            </span>
          ))}
        </div>
      )}
      {person.observationCount > 0 && (
        <div className="mt-1 flex gap-2 text-[10px]">
          <Count icon={Eye} value={person.observationCount} className="text-subtle" title="Observations written" />
        </div>
      )}
    </button>
  )
}

function WorkDetails({ person }) {
  const hasWork = person.ownedSteps.length || person.verdicts.length || person.observations.length
  if (!hasWork) return <p className="text-[11px] text-subtle">No recorded work yet.</p>
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {person.ownedSteps.length > 0 && (
        <section>
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-subtle">Owned nodes</h3>
          <ul className="space-y-1">
            {person.ownedSteps.map(step => {
              const status = STATUSES[step.status] ?? STATUSES.open
              return (
                <li key={step.id} className="flex items-center gap-2 text-[11px]">
                  <span className="min-w-0 truncate text-content" title={step.title || `Untitled ${step.kind}`}>{step.title || `Untitled ${step.kind}`}</span>
                  <span className={`${CHIP} ml-auto ${status.className}`}>{status.label}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
      {person.verdicts.length > 0 && (
        <section>
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-subtle">Verdicts</h3>
          <ul className="space-y-1">
            {person.verdicts.map(verdict => {
              const root = verdict.status === 'root_cause'
              return (
                <li key={verdict.id} className="flex items-center gap-1.5 text-[11px]">
                  {root ? <CircleCheck size={11} className="shrink-0 text-green-400" /> : <CircleX size={11} className="shrink-0 text-red-400" />}
                  <span className="min-w-0 truncate text-content" title={verdict.title}>{verdict.title}</span>
                  <span className={`ml-auto shrink-0 ${root ? 'text-green-400' : 'text-red-400'}`}>{root ? 'Root cause ✓' : 'Not root cause ✗'}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
      {person.observations.length > 0 && (
        <section>
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-subtle">Written down</h3>
          <ul className="space-y-1">
            {person.observations.map(observation => (
              <li key={observation.id} className="flex items-center gap-1.5 text-[11px]">
                <span className={`${CHIP} border-edge text-subtle`}>Observation</span>
                <span className="min-w-0 truncate text-content" title={observation.title}>{observation.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

// The people involved and their recorded work stay at the bottom of the canvas, with details expanding in place.
export default function ParticipantsBar({ people }) {
  const [open, setOpen] = useState(null)
  const shown = people.find(p => p.name === open)
  return (
    <footer className="shrink-0 border-t border-edge bg-surface">
      <div className="flex items-start gap-2 overflow-x-auto px-3 py-2">
        <div className="flex shrink-0 items-center gap-1.5 py-2 text-[10px] font-semibold uppercase tracking-widest text-subtle">
          <UserRound size={12} /> Participants
        </div>
        {people.length === 0 && <p className="py-2 text-[11px] text-subtle">No participants assigned yet.</p>}
        {people.map(person => (
          <PersonCard key={person.name} person={person} expanded={open === person.name} onToggle={() => setOpen(open === person.name ? null : person.name)} />
        ))}
      </div>
      {shown && <div className="border-t border-edge px-3 py-2"><WorkDetails person={shown} /></div>}
    </footer>
  )
}
