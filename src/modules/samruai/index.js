import { Stethoscope, Gauge, NotebookPen } from 'lucide-react'

// Shown only when ACEX lists the "samruai" service (ACEX_SERVICES_SAMRUAI_URL).
export const SamruaiModule = {
  id: 'samruai',
  label: 'SamruAI',
  icon: Stethoscope,
  requires: 'samruai',
  nav: [
    { to: '/samruai', text: 'Overview', icon: Gauge, end: true },
    { to: '/samruai/triage', text: 'Triage', icon: NotebookPen },
  ],
  routes: [
    { path: '/samruai', load: () => import('../../pages/samruai/OverviewPage') },
    { path: '/samruai/triage', load: () => import('../../pages/samruai/TriagesPage') },
    { path: '/samruai/triage/new', load: () => import('../../pages/samruai/NewTriagePage') },
    { path: '/samruai/triage/:id', load: () => import('../../pages/samruai/ScratchpadPage') },
  ],
}
