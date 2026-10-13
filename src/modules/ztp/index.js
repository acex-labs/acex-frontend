import { Zap, ListChecks, Inbox, ShieldCheck, Radar, Settings } from 'lucide-react'

export const ZtpModule = {
  id: 'ztp',
  label: 'ZTP',
  icon: Zap,
  nav: [
    { to: '/ztp/overview',  text: 'Overview',         icon: ListChecks },
    { to: '/ztp/unclaimed', text: 'Unclaimed Assets', icon: Inbox },
    { to: '/ztp/discovery', text: 'Discovery',        icon: Radar },
    { to: '/ztp/approvals', text: 'Approvals',        icon: ShieldCheck },
    { to: '/ztp/settings',  text: 'Settings',         icon: Settings },
  ],
  routes: [
    { path: '/ztp/overview',  load: () => import('../../pages/ztp/OverviewPage') },
    { path: '/ztp/unclaimed', load: () => import('../../pages/ztp/UnclaimedAssetsPage') },
    { path: '/ztp/discovery', load: () => import('../../pages/ztp/DiscoveryPage') },
    { path: '/ztp/approvals', load: () => import('../../pages/ztp/ReviewPage') },
    { path: '/ztp/settings',  load: () => import('../../pages/ztp/SettingsPage') },
  ],
}
