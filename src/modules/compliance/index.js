import { ShieldCheck, ScrollText, Gauge } from 'lucide-react'

export const ComplianceModule = {
  id: 'compliance',
  label: 'Compliance',
  icon: ShieldCheck,
  nav: [
    { to: '/compliance/overview', text: 'Overview', icon: Gauge },
    { to: '/compliance/policies', text: 'Policies', icon: ScrollText },
  ],
  routes: [
    { path: '/compliance/overview', load: () => import('../../pages/compliance/OverviewPage') },
    { path: '/compliance/policies', load: () => import('../../pages/compliance/PoliciesPage') },
  ],
}
