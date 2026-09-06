import { Zap, GitBranch, ListChecks, CalendarClock } from 'lucide-react'

export const OperationsModule = {
  id: 'operations',
  label: 'Operations',
  icon: Zap,
  nav: [
    { to: '/operations/workflows',    text: 'Workflows',    icon: GitBranch },
    { to: '/operations/bulk-actions', text: 'Bulk Actions', icon: ListChecks },
    { to: '/operations/triggers',     text: 'Triggers',     icon: Zap },
    { to: '/operations/scheduled',    text: 'Scheduled',    icon: CalendarClock },
  ],
  routes: [
    { path: '/operations/workflows',    placeholder: 'Workflows' },
    { path: '/operations/bulk-actions', placeholder: 'Bulk Actions' },
    { path: '/operations/triggers',     placeholder: 'Triggers' },
    { path: '/operations/scheduled',    placeholder: 'Scheduled' },
  ],
}
