import { Building2, ShieldAlert } from 'lucide-react'

export const PlatformModule = {
  id: 'platform',
  label: 'Platform',
  icon: Building2,
  adminOnly: true,
  nav: [
    { to: '/platform/admin', text: 'Admin', icon: ShieldAlert },
  ],
  routes: [
    { path: '/platform/admin', load: () => import('../../pages/platform/AdminPage') },
  ],
}
