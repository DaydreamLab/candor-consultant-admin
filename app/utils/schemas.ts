import * as z from 'zod'

export const caseSchema = z.object({
  customer: z.string().min(1),
  customerEn: z.string().min(1),
  email: z.email(),
  planId: z.enum(['basic', 'mid', 'premium']),
  hasReport: z.boolean(),
  orgId: z.string().min(1),
  paidAt: z.string().min(1),
  appointmentAt: z.string().min(1),
  status: z.enum([
    'received',
    'lab_pending',
    'lab_scheduled',
    'awaiting_report',
    'progress_due',
    'keyin_due',
    'ship_due',
    'shipped',
    'invoice_due',
    'invoiced'
  ])
})

export const labSchema = z.object({
  caseId: z.string().min(1),
  site: z.string().min(1),
  siteEn: z.string().min(1),
  scheduledAt: z.string().optional(),
  status: z.enum(['unscheduled', 'scheduled', 'awaiting_report', 'report_ready'])
})

export const productSchema = z.object({
  sku: z.string().min(1),
  orgId: z.string().min(1),
  name: z.string().min(1),
  nameEn: z.string().min(1),
  aLabel: z.string().min(1),
  aLabelEn: z.string().min(1),
  spec: z.string().min(1),
  cost: z.coerce.number().min(0),
  priceToA: z.coerce.number().min(0),
  labelVersion: z.string().min(1),
  image: z.string().nullable().optional(),
  onHand: z.coerce.number().int().min(0),
  reserved: z.coerce.number().int().min(0),
  reorderAt: z.coerce.number().int().min(0)
})

export const selectionLineSchema = z.object({
  caseId: z.string().min(1),
  sku: z.string().min(1),
  qty: z.coerce.number().int().min(1)
})

export const shipmentSchema = z.object({
  caseId: z.string().min(1),
  status: z.enum(['picking', 'labeling', 'in_transit', 'delivered']),
  tracking: z.string().optional()
})

export const invoiceSchema = z.object({
  orgId: z.string().min(1),
  caseIds: z.array(z.string()).min(1),
  serviceFee: z.coerce.number().min(0),
  goodsAmount: z.coerce.number().min(0),
  status: z.enum(['draft', 'sent', 'paid'])
})

export const staffSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  role: z.enum(['platform_viewer', 'platform_assist', 'consultant_ops', 'consultant_admin']),
  orgId: z.string().optional(),
  status: z.enum(['active', 'invited'])
})

export type CaseForm = z.output<typeof caseSchema>
export type LabForm = z.output<typeof labSchema>
export type ProductForm = z.output<typeof productSchema>
export type SelectionLineForm = z.output<typeof selectionLineSchema>
export type ShipmentForm = z.output<typeof shipmentSchema>
export type InvoiceForm = z.output<typeof invoiceSchema>
export type StaffForm = z.output<typeof staffSchema>
