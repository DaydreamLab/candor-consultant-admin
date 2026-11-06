/**
 * Domain types for「專人預約」admin + expert station.
 * Field names follow assumed candor-core contracts (pending merge).
 */

export type ExpertBookingStatus = 'pending_schedule' | 'scheduled' | 'completed' | 'cancelled'

export type ExpertBookingPaymentStatus = 'paid' | 'refunded' | 'unpaid'

export type ExpertServiceMethod = 'phone' | 'online_meeting' | 'in_person' | 'other'

export interface ExpertBookingPreferredSlot {
  /** Local date YYYY-MM-DD */
  date: string
  /** Start hour inclusive, e.g. 14 */
  start_hour: number
  /** End hour exclusive, e.g. 16 */
  end_hour: number
}

export interface ExpertBookingProductReason {
  sellable_item_id: string
  name_zh: string
  name_en: string
  reason: string
}

export interface ExpertBookingServiceRecord {
  actual_service_time: string
  service_method: ExpertServiceMethod
  content: string
  sales_content: string
  /** Optional duration in minutes */
  duration_minutes: number | null
  sales_result: string | null
  deal_amount: number | null
  follow_up: string | null
  attachment_note: string | null
  updated_by_operator_id: string | null
  updated_by_name: string | null
  updated_at: string | null
}

export interface ExpertBookingMemberProfile {
  user_id: string
  display_name: string
  email: string
  phone: string | null
  goals: string[]
  summary: string
}

export interface ExpertBookingConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

export interface ExpertBookingConversation {
  id: string
  started_at: string
  messages: ExpertBookingConversationMessage[]
}

export interface ExpertBookingListItem {
  id: string
  order_id: string
  order_code: string
  member_name: string
  status: ExpertBookingStatus
  payment_status: ExpertBookingPaymentStatus
  preferred_slots: ExpertBookingPreferredSlot[]
  confirmed_at: string | null
  annotated_expert_id: string | null
  annotated_expert_name: string | null
  pinned: boolean
  paid_at: string
  amount: number
}

export interface ExpertBookingDetail extends ExpertBookingListItem {
  need_description: string
  contact_email: string
  contact_phone: string | null
  contact_line: string | null
  profile: ExpertBookingMemberProfile
  product_reasons: ExpertBookingProductReason[]
  service_record: ExpertBookingServiceRecord | null
  conversations: ExpertBookingConversation[]
  conversations_has_more: boolean
}

export interface ExpertBookingLastSeen {
  booking_id: string
  order_code: string
  member_name: string
  status: ExpertBookingStatus
  seen_at: string
}

export interface ExpertBookingListResult {
  items: ExpertBookingListItem[]
  page: number
  page_size: number
  total: number
  last_seen: ExpertBookingLastSeen | null
}

export interface ExpertCalendarExpert {
  id: string
  name: string
  /** CSS color token for calendar blocks */
  color: string
}

/** Weekly recurring availability: weekday 1=Mon … 7=Sun */
export interface ExpertWeeklyAvailabilityRule {
  expert_id: string
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7
  /** HH:mm 30-min grid */
  start_time: string
  end_time: string
}

/** Per-date override that replaces the weekly template for that day */
export interface ExpertDayAvailabilityOverride {
  expert_id: string
  date: string
  slots: Array<{ start_time: string, end_time: string }>
  updated_by_operator_id: string | null
  updated_by_name: string | null
  updated_at: string | null
}

export interface ExpertCalendarAppointmentBlock {
  booking_id: string
  expert_id: string
  expert_name: string
  member_name: string
  date: string
  start_time: string
  end_time: string
}

export interface ExpertCalendarSnapshot {
  experts: ExpertCalendarExpert[]
  weekly_rules: ExpertWeeklyAvailabilityRule[]
  day_overrides: ExpertDayAvailabilityOverride[]
  appointments: ExpertCalendarAppointmentBlock[]
  last_modified_by_name: string | null
  last_modified_at: string | null
}

export interface ExpertBookingSellableOption {
  id: string
  name_zh: string
  name_en: string
  sku: string | null
}

export function isExpertBookingStatus(value: unknown): value is ExpertBookingStatus {
  return value === 'pending_schedule'
    || value === 'scheduled'
    || value === 'completed'
    || value === 'cancelled'
}
