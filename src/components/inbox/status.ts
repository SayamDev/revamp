import type { EnquiryStatus } from '@/types'

export const STATUS_LABEL: Record<EnquiryStatus, string> = {
  new: 'New',
  analysed: 'Analysed',
  awaiting_approval: 'Awaiting approval',
  responded: 'Responded',
  archived: 'Archived',
}

export const STATUS_TONE: Record<EnquiryStatus, 'neutral' | 'info' | 'warning' | 'positive'> = {
  new: 'neutral',
  analysed: 'info',
  awaiting_approval: 'warning',
  responded: 'positive',
  archived: 'neutral',
}
