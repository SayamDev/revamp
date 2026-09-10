import {
  Activity as ActivityIcon,
  Inbox,
  LayoutDashboard,
  ListChecks,
  MessagesSquare,
  Workflow,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  description: string
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, description: 'Business health at a glance' },
  { to: '/inbox', label: 'Inbox', icon: Inbox, description: 'Enquiries and AI analysis' },
  { to: '/analyst', label: 'Analyst', icon: MessagesSquare, description: 'Ask questions about the business' },
  { to: '/automations', label: 'Automations', icon: Workflow, description: 'Workflows and runs' },
  { to: '/tasks', label: 'Tasks', icon: ListChecks, description: 'Follow-up work' },
  { to: '/activity', label: 'Activity', icon: ActivityIcon, description: 'Full audit trail' },
]
