import type { CaseStatus } from '~/types/admin'

export const CASE_STATUS_COLOR = {
  received: 'info',
  lab_pending: 'warning',
  lab_scheduled: 'warning',
  awaiting_report: 'warning',
  progress_due: 'primary',
  keyin_due: 'primary',
  ship_due: 'warning',
  shipped: 'success',
  invoice_due: 'info',
  invoiced: 'success'
} as const

export const LAB_STATUS_COLOR = {
  unscheduled: 'neutral',
  scheduled: 'info',
  awaiting_report: 'warning',
  report_ready: 'success'
} as const

export const SHIP_STATUS_COLOR = {
  picking: 'neutral',
  labeling: 'warning',
  in_transit: 'info',
  delivered: 'success'
} as const

export const INVOICE_STATUS_COLOR = {
  draft: 'neutral',
  sent: 'warning',
  paid: 'success'
} as const

export function nextAction(status: CaseStatus) {
  switch (status) {
    case 'received':
      return { to: '/cases', key: 'flow.intake' }
    case 'lab_pending':
    case 'lab_scheduled':
    case 'awaiting_report':
      return { to: '/labs', key: 'flow.lab' }
    case 'progress_due':
      return { to: '/progress', key: 'flow.progress' }
    case 'keyin_due':
      return { to: '/selections', key: 'flow.selection' }
    case 'ship_due':
      return { to: '/shipping', key: 'flow.ship' }
    case 'invoice_due':
      return { to: '/invoices', key: 'flow.invoice' }
    default:
      return null
  }
}
