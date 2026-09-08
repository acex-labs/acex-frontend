import { Bot, Sparkles } from 'lucide-react'

export const AutopilotModule = {
  id: 'autopilot',
  label: 'Autopilot',
  icon: Bot,
  nav: [
    { to: '/autopilot/ai-ops',  text: 'AI Ops',  icon: Sparkles },
    { to: '/autopilot/agents',  text: 'Agents',  icon: Bot },
  ],
  routes: [
    { path: '/autopilot/ai-ops', placeholder: 'AI Ops' },
    { path: '/autopilot/agents', placeholder: 'Agents' },
  ],
}
