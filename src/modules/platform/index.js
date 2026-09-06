import { Building2, Cloud, Users } from 'lucide-react'

export const PlatformModule = {
  id: 'platform',
  label: 'Platform',
  icon: Building2,
  adminOnly: true,
  nav: [
    { to: '/platform/workspaces', text: 'Workspaces', icon: Cloud },
    { to: '/platform/customers',  text: 'Customers',  icon: Users },
  ],
  routes: [
    { path: '/platform/workspaces', load: () => import('../../pages/platform/WorkspacesPage') },
    { path: '/platform/customers',  load: () => import('../../pages/platform/CustomersPage') },
  ],
}
