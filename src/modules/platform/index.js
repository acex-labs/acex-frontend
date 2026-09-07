import { Building2, Cloud, Users, ShieldAlert } from 'lucide-react'

export const PlatformModule = {
  id: 'platform',
  label: 'Platform',
  icon: Building2,
  adminOnly: true,
  nav: [
    { to: '/platform/admin',      text: 'Admin',      icon: ShieldAlert },
    { to: '/platform/workspaces', text: 'Workspaces', icon: Cloud },
    { to: '/platform/customers',  text: 'Customers',  icon: Users },
  ],
  routes: [
    { path: '/platform/admin',      load: () => import('../../pages/platform/AdminPage') },
    { path: '/platform/workspaces', load: () => import('../../pages/platform/WorkspacesPage') },
    { path: '/platform/customers',  load: () => import('../../pages/platform/CustomersPage') },
  ],
}
