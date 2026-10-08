import { Zap, ListChecks, Inbox } from 'lucide-react'

export const ZtpModule = {
  id: 'ztp',
  label: 'ZTP',
  icon: Zap,
  nav: [
    { to: '/ztp/overview',  text: 'Overview',         icon: ListChecks },
    { to: '/ztp/unclaimed', text: 'Unclaimed Assets', icon: Inbox },
  ],
  routes: [
    { path: '/ztp/overview',  load: () => import('../../pages/ztp/OverviewPage') },
    { path: '/ztp/unclaimed', load: () => import('../../pages/ztp/UnclaimedAssetsPage') },
  ],
}
