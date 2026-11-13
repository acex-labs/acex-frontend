export const TRIAGES_KEY = ['samruai', 'triages']
export const triageKey = id => ['samruai', 'triage', String(id)]

// What a triage is called: the first line of its fault description.
export const triageTitle = triage => triage.description.trim().split('\n')[0] || 'New triage'

export const TRIAGE_STATUSES = {
  ongoing: { label: 'Ongoing', className: 'text-brand border-brand/40 bg-brand/10' },
  closed: { label: 'Closed', className: 'text-subtle border-edge' },
}
