import { ShieldCheck, ScrollText, Gauge, PackageCheck } from 'lucide-react'

export const ComplianceModule = {
  id: 'compliance',
  label: 'Compliance',
  icon: ShieldCheck,
  nav: [
    { to: '/compliance/overview', text: 'Overview', icon: Gauge },
    { to: '/compliance/software', text: 'Software', icon: PackageCheck },
    { to: '/compliance/policies', text: 'Policies', icon: ScrollText },
  ],
  routes: [
    { path: '/compliance/overview', load: () => import('../../pages/compliance/OverviewPage') },
    { path: '/compliance/software', load: () => import('../../pages/compliance/SoftwareAssetsPage') },
    { path: '/compliance/policies', load: () => import('../../pages/compliance/PoliciesPage') },
  ],
}
