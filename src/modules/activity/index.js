import { ScrollText, ListTodo } from 'lucide-react'

// What has happened under the hood: jobs now, audit logging later.
export const ActivityModule = {
  id: 'activity',
  label: 'Activity',
  icon: ScrollText,
  nav: [
    { to: '/activity/jobs', text: 'Jobs', icon: ListTodo },
  ],
  routes: [
    { path: '/activity/jobs',     load: () => import('../../pages/activity/JobsPage') },
    { path: '/activity/jobs/:id', load: () => import('../../pages/activity/JobPage') },
  ],
}
