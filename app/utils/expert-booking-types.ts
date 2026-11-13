/**
 * Domain types aligned to candor-core OpenAPI admin (PR #155 @ 27901b4)
 * and docs/spec/34-expert-booking.md.
 */

export type ExpertBookingStatus
  = | 'awaiting_schedule'
    | 'scheduled'
    | 'completed'
    | 'cancelled'

export type ExpertBookingAttachmentContentType
  = | 'application/pdf'
    | 'image/jpeg'
    | 'image/png'
    | 'image/webp'

export interface ExpertBookingAttachment {
  key: string
  filename: string
  content_type: ExpertBookingAttachmentContentType
  size_bytes: number
}

export interface ExpertBookingProductPick {
  id: string
  sellable_item_id: string
  sellable_item_code: string | null
  sellable_item_name: string | null
  reason: string
  sort_order: number
}

/** Request item for PUT product-picks (id／name assigned by core). */
export interface ExpertBookingProductPickInput {
  sellable_item_id?: string
  sellable_item_code?: string
  reason: string
}

/** UI draft before PUT product-picks. */
export interface ExpertBookingProductPickDraft {
  sellable_item_id: string
  name_zh: string
  name_en: string
  reason: string
}

export interface ExpertBookingMemberProfile {
  sex: string | null
  birth_year: number | null
  height_cm: number | null
  weight_kg: number | null
  goals: string[]
  conditions: string[]
}

export interface ExpertBookingServiceRecord {
  booking_id: string
  served_at: string
  service_method: string
  content: string
  sales_content: string
  duration_minutes: number | null
  sales_result: string | null
  deal_amount: number | null
  follow_up: string | null
  attachments: ExpertBookingAttachment[]
  filled_by_operator_id: string | null
  filled_at: string | null
  updated_at: string | null
}

export interface ExpertBookingServiceRecordInput {
  served_at: string
  service_method: string
  content: string
  sales_content?: string
  duration_minutes?: number | null
  sales_result?: string | null
  deal_amount?: number | null
  follow_up?: string | null
  attachments?: ExpertBookingAttachment[]
}

export interface ExpertBookingListItem {
  id: string
  order_id: string
  order_no: string | null
  paid_at: string | null
  user_id: string
  member_email: string | null
  status: ExpertBookingStatus
  contact_name: string
  contact_phone: string
  contact_email: string
  contact_line: string | null
  preferred_slots: string[]
  confirmed_starts_at: string | null
  confirmed_ends_at: string | null
  pinned?: boolean
  created_at: string | null
  updated_at: string | null
}

export interface ExpertBookingDetail extends ExpertBookingListItem {
  requirement_note: string
  attachments: ExpertBookingAttachment[]
  cancelled_at: string | null
  cancel_reason: string | null
  completed_at: string | null
  product_picks: ExpertBookingProductPick[]
  member_profile: ExpertBookingMemberProfile | null
  service_record: ExpertBookingServiceRecord | null
}

export interface ExpertBookingListResult {
  expert_bookings: ExpertBookingListItem[]
  total: number
  last_seen_booking_id: string | null
}

export interface ExpertBookingConversationMessage {
  id: string
  role: string
  content: string
  created_at: string | null
  /** Hydrated reply_actions (core CTA grey-retain); optional for legacy payloads. */
  reply_actions?: unknown
}

export interface ExpertBookingConversation {
  id: string
  entry_path: string | null
  goals: string[]
  created_at: string | null
  updated_at: string | null
  messages: ExpertBookingConversationMessage[]
}

export interface ExpertBookingConversationsResult {
  conversations: ExpertBookingConversation[]
  total: number
}

export interface ExpertCalendarExpert {
  id: string
  name: string | null
  email: string | null
  role: string
}

/** weekday: 0=Sunday … 6=Saturday; slot_start_minute multiple of 30. */
export interface ExpertCalendarWeeklySlot {
  id?: string
  weekday: number
  slot_start_minute: number
  expert_operator_id?: string
  updated_by_operator_id?: string | null
  updated_at?: string | null
}

export interface ExpertCalendarDayOverride {
  expert_operator_id: string
  override_date: string
  is_customized?: boolean
  slots: number[]
  updated_by_operator_id?: string | null
  updated_at?: string | null
}

export interface ExpertCalendarScheduledBooking {
  id: string
  status: string
  contact_name?: string
  confirmed_starts_at: string | null
  confirmed_ends_at: string | null
  confirmed_by_operator_id: string | null
}

export interface ExpertCalendarSnapshot {
  weekly: ExpertCalendarWeeklySlot[]
  day_overrides: ExpertCalendarDayOverride[]
  scheduled_bookings: ExpertCalendarScheduledBooking[]
  experts: ExpertCalendarExpert[]
}

export interface ExpertBookingSellableOption {
  id: string
  name_zh: string
  name_en: string
  sku: string | null
  code?: string | null
}

export function isExpertBookingStatus(value: unknown): value is ExpertBookingStatus {
  return value === 'awaiting_schedule'
    || value === 'scheduled'
    || value === 'completed'
    || value === 'cancelled'
}
