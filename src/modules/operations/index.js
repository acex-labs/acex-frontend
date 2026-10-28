import { Zap, GitBranch, ListChecks, CalendarClock } from 'lucide-react'

export const OperationsModule = {
  id: 'operations',
  label: 'Operations',
  icon: Zap,
  nav: [
    { to: '/operations/run',          text: 'Run',          icon: ListChecks },
    { to: '/operations/workflows',    text: 'Workflows',    icon: GitBranch },
    { to: '/operations/triggers',     text: 'Triggers',     icon: Zap },
    { to: '/operations/scheduled',    text: 'Scheduled',    icon: CalendarClock },
  ],
  routes: [
    { path: '/operations/workflows',               load: () => import('../../pages/operations/workflows/WorkflowsPage') },
    { path: '/operations/workflows/:section',      load: () => import('../../pages/operations/workflows/WorkflowsPage') },
    { path: '/operations/workflows/edit/:id',      load: () => import('../../pages/operations/workflows/WorkflowBuilderPage') },
    { path: '/operations/workflows/run/:runId',    load: () => import('../../pages/operations/workflows/WorkflowRunPage') },
    { path: '/operations/run',          load: () => import('../../pages/operations/RunPage') },
    { path: '/operations/run/:section', load: () => import('../../pages/operations/RunPage') },
    { path: '/operations/triggers',     placeholder: 'Triggers' },
    { path: '/operations/scheduled',    placeholder: 'Scheduled' },
  ],
}
