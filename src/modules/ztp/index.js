import { Zap, ListChecks } from 'lucide-react'

export const ZtpModule = {
  id: 'ztp',
  label: 'ZTP',
  icon: Zap,
  nav: [
    { to: '/ztp/overview', text: 'Overview', icon: ListChecks },
  ],
  routes: [
    { path: '/ztp/overview', load: () => import('../../pages/ztp/OverviewPage') },
  ],
}
