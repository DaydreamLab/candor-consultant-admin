export type Role
  = | 'platform_viewer'
    | 'platform_assist'
    | 'consultant_ops'
    | 'consultant_admin'

export type PlanId = 'basic' | 'mid' | 'premium'

export type ReviewKind = 'manual' | 'clinical'

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export type CaseStatus
  = | 'received'
    | 'lab_pending'
    | 'lab_scheduled'
    | 'awaiting_report'
    | 'progress_due'
    | 'keyin_due'
    | 'ship_due'
    | 'shipped'
    | 'invoice_due'
    | 'invoiced'

export type LabStatus = 'unscheduled' | 'scheduled' | 'awaiting_report' | 'report_ready'

export type ShipStatus = 'picking' | 'labeling' | 'in_transit' | 'delivered'

export type InvoiceStatus = 'draft' | 'sent' | 'paid'

export type OrgStatus = 'active' | 'onboarding'

export type AccountStatus = 'active' | 'invited'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  orgId: string | null
  orgName: string | null
}

export interface ConsultantOrg {
  id: string
  name: string
  nameEn: string
  city: string
  cityEn: string
  contact: string
  warehouse: string
  warehouseEn: string
  status: OrgStatus
  since: string
}

export interface CaseRow {
  id: string
  customer: string
  customerEn: string
  email: string
  aUserId: string
  planId: PlanId
  hasReport: boolean
  orgId: string
  paidAt: string
  appointmentAt: string
  status: CaseStatus
}

export interface LabRow {
  id: string
  caseId: string
  orgId: string
  customer: string
  site: string
  siteEn: string
  scheduledAt: string | null
  status: LabStatus
}

export interface ProgressRow {
  caseId: string
  orgId: string
  planId: PlanId
  customer: string
  labScheduled: boolean | null
  reportBack: boolean | null
  consultDone: boolean
  keyedIn: boolean | null
  labeled: boolean | null
  shipped: boolean | null
  missing: string
  missingEn: string
}

export interface ProductRow {
  sku: string
  orgId: string
  name: string
  nameEn: string
  aLabel: string
  aLabelEn: string
  spec: string
  cost: number
  priceToA: number
  labelVersion: string
}

export interface InventoryRow {
  sku: string
  orgId: string
  onHand: number
  reserved: number
  reorderAt: number
}

export interface KeyInLine {
  id: string
  caseId: string
  orgId: string
  sku: string
  qty: number
  status: 'draft' | 'confirmed'
  confirmedAt: string | null
}

export interface ShipmentEvent {
  status: ShipStatus
  at: string
}

export interface ShipmentRow {
  id: string
  caseId: string
  orgId: string
  customer: string
  status: ShipStatus
  tracking: string | null
  shippedAt: string | null
  items: { sku: string, qty: number }[]
  events: ShipmentEvent[]
}

export interface InvoiceRow {
  id: string
  orgId: string
  caseIds: string[]
  serviceFee: number
  goodsAmount: number
  status: InvoiceStatus
  issuedAt: string
}

export interface ReviewRow {
  id: string
  caseId: string
  orgId: string
  orgName: string
  kind: ReviewKind
  status: ReviewStatus
  updatedAt: string
}

export interface StaffRow {
  id: string
  name: string
  email: string
  role: Role
  orgId: string | null
  status: AccountStatus
  lastLogin: string
}

export interface LabelVersion {
  id: string
  name: string
  nameEn: string
  effective: string
  current: boolean
}

export function isPlatformRole(role: Role) {
  return role === 'platform_viewer' || role === 'platform_assist'
}

export function canWrite(role: Role) {
  return role === 'platform_assist' || role === 'consultant_ops' || role === 'consultant_admin'
}

export function canManageUsers(role: Role) {
  return role === 'platform_assist' || role === 'consultant_admin'
}

export interface AuditLogRow {
  id: string
  at: string
  actor: string
  action: string
  target: string
}
