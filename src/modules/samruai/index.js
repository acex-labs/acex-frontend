import { Stethoscope, Gauge } from 'lucide-react'

// Shown only when ACEX lists the "samruai" service (ACEX_SERVICES_SAMRUAI_URL).
export const SamruaiModule = {
  id: 'samruai',
  label: 'SamruAI',
  icon: Stethoscope,
  requires: 'samruai',
  nav: [
    { to: '/samruai', text: 'Overview', icon: Gauge, end: true },
  ],
  routes: [
    { path: '/samruai', load: () => import('../../pages/samruai/OverviewPage') },
  ],
}
