import type {
  ExpertBookingAttachment,
  ExpertBookingConversation,
  ExpertBookingDetail,
  ExpertBookingListItem,
  ExpertBookingProductPick,
  ExpertBookingSellableOption,
  ExpertBookingServiceRecord,
  ExpertCalendarDayOverride,
  ExpertCalendarExpert,
  ExpertCalendarScheduledBooking,
  ExpertCalendarSnapshot,
  ExpertCalendarWeeklySlot
} from './expert-booking-types'

export const EXPERT_BOOKING_FIXTURE_EXPERT_A = 'op-expert-wang'
export const EXPERT_BOOKING_FIXTURE_EXPERT_B = 'op-expert-li'
export const EXPERT_BOOKING_FIXTURE_OPS = 'op-ops-1'

function baseList(
  partial: Partial<ExpertBookingListItem> & Pick<ExpertBookingListItem, 'id' | 'status' | 'contact_name'>
): ExpertBookingListItem {
  return {
    id: partial.id,
    order_id: partial.order_id ?? `ord-${partial.id}`,
    order_no: partial.order_no ?? `EB-${partial.id.slice(-4).toUpperCase()}`,
    paid_at: partial.paid_at ?? '2026-04-01T02:00:00.000Z',
    user_id: partial.user_id ?? `user-${partial.id}`,
    member_email: partial.member_email ?? 'member@example.com',
    status: partial.status,
    contact_name: partial.contact_name,
    contact_phone: partial.contact_phone ?? '0912000000',
    contact_email: partial.contact_email ?? 'contact@example.com',
    contact_line: partial.contact_line ?? null,
    preferred_slots: partial.preferred_slots ?? ['平日晚上', '週六上午'],
    confirmed_starts_at: partial.confirmed_starts_at ?? null,
    confirmed_ends_at: partial.confirmed_ends_at ?? null,
    pinned: partial.pinned,
    created_at: partial.created_at ?? '2026-04-01T03:00:00.000Z',
    updated_at: partial.updated_at ?? '2026-04-01T03:00:00.000Z'
  }
}

export const EXPERT_BOOKING_FIXTURE_LIST: ExpertBookingListItem[] = [
  baseList({
    id: 'eb-await-1',
    status: 'awaiting_schedule',
    contact_name: '王小明',
    contact_phone: '0912111111',
    contact_email: 'wang@example.com',
    contact_line: 'wang_line',
    preferred_slots: ['週二 19:00–21:00', '週四 14:00–16:00'],
    order_no: 'EB-A001'
  }),
  baseList({
    id: 'eb-sched-1',
    status: 'scheduled',
    contact_name: '陳美麗',
    contact_phone: '0912222222',
    contact_email: 'chen@example.com',
    contact_line: null,
    preferred_slots: ['週末下午'],
    confirmed_starts_at: '2026-04-10T10:00:00.000Z',
    confirmed_ends_at: '2026-04-10T10:30:00.000Z',
    order_no: 'EB-S001',
    pinned: true
  }),
  baseList({
    id: 'eb-done-1',
    status: 'completed',
    contact_name: '林大華',
    contact_phone: '0912333333',
    contact_email: 'lin@example.com',
    preferred_slots: ['平日中午'],
    confirmed_starts_at: '2026-03-20T04:00:00.000Z',
    confirmed_ends_at: '2026-03-20T04:30:00.000Z',
    order_no: 'EB-C001'
  }),
  baseList({
    id: 'eb-cancel-1',
    status: 'cancelled',
    contact_name: '黃取消',
    contact_phone: '0912444444',
    contact_email: 'huang@example.com',
    preferred_slots: ['任意'],
    order_no: 'EB-X001'
  })
]

const sampleAttachment: ExpertBookingAttachment = {
  key: 'expert-booking/eb-await-1/req-1.pdf',
  filename: '需求說明.pdf',
  content_type: 'application/pdf',
  size_bytes: 12000
}

const sampleServiceRecord = (bookingId: string): ExpertBookingServiceRecord => ({
  booking_id: bookingId,
  served_at: '2026-03-20T04:00:00.000Z',
  service_method: '線上會議',
  content: '已完成健康諮詢，建議複檢。',
  sales_content: '無',
  duration_minutes: 30,
  sales_result: null,
  deal_amount: null,
  follow_up: '兩週後追蹤',
  attachments: [],
  filled_by_operator_id: EXPERT_BOOKING_FIXTURE_EXPERT_A,
  filled_at: '2026-03-20T05:00:00.000Z',
  updated_at: '2026-03-20T05:00:00.000Z'
})

function detailFrom(
  list: ExpertBookingListItem,
  extra: Omit<ExpertBookingDetail, keyof ExpertBookingListItem>
): ExpertBookingDetail {
  return { ...list, ...extra }
}

export const EXPERT_BOOKING_FIXTURE_DETAILS: Record<string, ExpertBookingDetail> = {
  'eb-await-1': detailFrom(EXPERT_BOOKING_FIXTURE_LIST[0]!, {
    requirement_note: '希望討論睡眠與壓力管理。',
    attachments: [sampleAttachment],
    cancelled_at: null,
    cancel_reason: null,
    completed_at: null,
    product_picks: [],
    member_profile: {
      sex: 'male',
      birth_year: 1988,
      height_cm: 175,
      weight_kg: 70,
      goals: ['改善睡眠'],
      conditions: ['高血壓家族史']
    },
    service_record: null
  }),
  'eb-sched-1': detailFrom(EXPERT_BOOKING_FIXTURE_LIST[1]!, {
    requirement_note: '想了解健檢套餐差異。',
    attachments: [],
    cancelled_at: null,
    cancel_reason: null,
    completed_at: null,
    product_picks: [
      {
        id: 'pp-1',
        sellable_item_id: 'si-alpha',
        sellable_item_code: 'PKG-A',
        sellable_item_name: '基礎健檢',
        reason: '適合初篩',
        sort_order: 0
      }
    ],
    member_profile: {
      sex: 'female',
      birth_year: 1992,
      height_cm: 162,
      weight_kg: 52,
      goals: ['產前健檢'],
      conditions: []
    },
    service_record: null
  }),
  'eb-done-1': detailFrom(EXPERT_BOOKING_FIXTURE_LIST[2]!, {
    requirement_note: '追蹤去年報告。',
    attachments: [],
    cancelled_at: null,
    cancel_reason: null,
    completed_at: '2026-03-20T05:10:00.000Z',
    product_picks: [],
    member_profile: {
      sex: 'male',
      birth_year: 1975,
      height_cm: 170,
      weight_kg: 78,
      goals: ['代謝追蹤'],
      conditions: ['血脂偏高']
    },
    service_record: sampleServiceRecord('eb-done-1')
  }),
  'eb-cancel-1': detailFrom(EXPERT_BOOKING_FIXTURE_LIST[3]!, {
    requirement_note: '行程衝突。',
    attachments: [],
    cancelled_at: '2026-04-02T01:00:00.000Z',
    cancel_reason: '客戶行程衝突',
    completed_at: null,
    product_picks: [],
    member_profile: null,
    service_record: null
  })
}

export const EXPERT_BOOKING_SELLABLE_OPTIONS: ExpertBookingSellableOption[] = [
  { id: 'si-alpha', name_zh: '基礎健檢', name_en: 'Basic checkup', sku: 'PKG-A', code: 'PKG-A' },
  { id: 'si-beta', name_zh: '進階代謝', name_en: 'Metabolic plus', sku: 'PKG-B', code: 'PKG-B' },
  { id: 'si-gamma', name_zh: '睡眠評估', name_en: 'Sleep assess', sku: 'PKG-C', code: 'PKG-C' }
]

/** Design B v3 sample: selected chips + confirm + vitals with stored value. */
export const EXPERT_BOOKING_FIXTURE_CONVERSATIONS: ExpertBookingConversation[] = [
  {
    id: 'conv-1',
    entry_path: '/chat',
    goals: ['睡眠', '精神元氣'],
    created_at: '2026-03-28T08:00:00.000Z',
    updated_at: '2026-03-28T09:00:00.000Z',
    messages: [
      {
        id: 'msg-path',
        role: 'assistant',
        content: '你想先從哪裡開始？',
        created_at: '2026-03-28T08:00:00.000Z',
        reply_actions: {
          schema_version: '0.1',
          interaction: { round_status: 'historical', outcome: 'option_selected' },
          actions: [{
            type: 'choose_option',
            payload: {
              kind: 'path',
              mode: 'single',
              options: [
                { code: 'chat', label: '我想聊聊', status: 'disabled' },
                { code: 'plan', label: '我想諮詢健康方案', status: 'selected' },
                { code: 'report', label: '幫我看報告', status: 'disabled' }
              ]
            }
          }]
        }
      },
      {
        id: 'msg-path-user',
        role: 'user',
        content: '我想諮詢健康方案',
        created_at: '2026-03-28T08:00:30.000Z'
      },
      {
        id: 'msg-goals',
        role: 'assistant',
        content: '這次最想改善的是？',
        created_at: '2026-03-28T08:01:00.000Z',
        reply_actions: {
          schema_version: '0.1',
          interaction: { round_status: 'historical', outcome: 'option_selected' },
          actions: [{
            type: 'choose_option',
            payload: {
              kind: 'consultation_goals',
              mode: 'multi',
              confirm: true,
              confirm_status: 'selected',
              options: [
                { code: 'sleep', label: '睡眠', status: 'selected' },
                { code: 'energy', label: '精神元氣', status: 'selected' },
                { code: 'gi', label: '腸胃道', status: 'disabled' },
                { code: 'weight', label: '減重', status: 'disabled' },
                { code: 'skin', label: '皮膚氣色', status: 'disabled' }
              ]
            }
          }]
        }
      },
      {
        id: 'msg-goals-user',
        role: 'user',
        content: '睡眠、精神元氣',
        created_at: '2026-03-28T08:01:30.000Z'
      },
      {
        id: 'msg-age',
        role: 'assistant',
        content: '請問你的年紀是？',
        created_at: '2026-03-28T08:02:00.000Z',
        reply_actions: {
          schema_version: '0.1',
          interaction: { round_status: 'historical', outcome: 'option_selected' },
          actions: [{
            type: 'ask_vitals',
            payload: {
              fields: ['age'],
              gap_code: 'age',
              status: 'selected',
              has_stored_value: true,
              stored_value: 36
            }
          }]
        }
      },
      {
        id: 'msg-age-user',
        role: 'user',
        content: '36',
        created_at: '2026-03-28T08:02:30.000Z'
      },
      {
        id: 'msg-upload-prompt',
        role: 'assistant',
        content: '若想確認是否缺維生素 D，最準確的方式是抽血檢測。有報告可上傳一起看；還沒檢查也可討論是否安排。',
        created_at: '2026-03-28T08:03:00.000Z',
        reply_actions: {
          schema_version: '0.1',
          interaction: { round_status: 'historical', outcome: null },
          actions: [
            { type: 'ask_report', payload: { status: 'disabled' } },
            { type: 'offer_checkup', payload: { status: 'disabled', url: 'https://example.com/checkup' } }
          ]
        }
      }
    ]
  }
]

/** Design B v3 grey sample: free_text chips + vitals stored／unstored. */
export const EXPERT_BOOKING_FIXTURE_CONVERSATIONS_GREY: ExpertBookingConversation[] = [
  {
    id: 'conv-grey',
    entry_path: '/chat',
    goals: [],
    created_at: '2026-03-28T08:00:00.000Z',
    updated_at: '2026-03-28T09:00:00.000Z',
    messages: [
      {
        id: 'msg-grey-path',
        role: 'assistant',
        content: '你想先從哪裡開始？',
        created_at: '2026-03-28T08:00:00.000Z',
        reply_actions: {
          schema_version: '0.1',
          interaction: { round_status: 'historical', outcome: 'free_text' },
          actions: [{
            type: 'choose_option',
            payload: {
              kind: 'path',
              mode: 'single',
              options: [
                { code: 'chat', label: '我想聊聊', status: 'disabled' },
                { code: 'plan', label: '我想諮詢健康方案', status: 'disabled' },
                { code: 'report', label: '幫我看報告', status: 'disabled' }
              ]
            }
          }]
        }
      },
      {
        id: 'msg-grey-path-user',
        role: 'user',
        content: '想先了解可以怎麼調理，再決定要不要看報告。',
        created_at: '2026-03-28T08:00:30.000Z'
      },
      {
        id: 'msg-grey-age-stored',
        role: 'assistant',
        content: '請問你的年紀是？',
        created_at: '2026-03-28T08:01:00.000Z',
        reply_actions: {
          schema_version: '0.1',
          interaction: { round_status: 'historical', outcome: 'free_text' },
          actions: [{
            type: 'ask_vitals',
            payload: {
              fields: ['age'],
              gap_code: 'age',
              status: 'disabled',
              has_stored_value: true,
              stored_value: 36
            }
          }]
        }
      },
      {
        id: 'msg-grey-age-stored-user',
        role: 'user',
        content: '我今年 36 歲。',
        created_at: '2026-03-28T08:01:30.000Z'
      },
      {
        id: 'msg-grey-age-empty',
        role: 'assistant',
        content: '請問你的年紀是？',
        created_at: '2026-03-28T08:02:00.000Z',
        reply_actions: {
          schema_version: '0.1',
          interaction: { round_status: 'historical', outcome: 'free_text' },
          actions: [{
            type: 'ask_vitals',
            payload: {
              fields: ['age'],
              gap_code: 'age',
              status: 'disabled',
              has_stored_value: false,
              stored_value: null
            }
          }]
        }
      },
      {
        id: 'msg-grey-age-empty-user',
        role: 'user',
        content: '我不太確定。',
        created_at: '2026-03-28T08:02:30.000Z'
      }
    ]
  }
]

export const EXPERT_BOOKING_FIXTURE_WEEKLY: ExpertCalendarWeeklySlot[] = [
  { id: 'w-a-1', weekday: 2, slot_start_minute: 600, expert_operator_id: EXPERT_BOOKING_FIXTURE_EXPERT_A },
  { id: 'w-a-2', weekday: 2, slot_start_minute: 630, expert_operator_id: EXPERT_BOOKING_FIXTURE_EXPERT_A },
  { id: 'w-a-3', weekday: 4, slot_start_minute: 840, expert_operator_id: EXPERT_BOOKING_FIXTURE_EXPERT_A },
  { id: 'w-b-1', weekday: 1, slot_start_minute: 540, expert_operator_id: EXPERT_BOOKING_FIXTURE_EXPERT_B },
  { id: 'w-b-2', weekday: 3, slot_start_minute: 720, expert_operator_id: EXPERT_BOOKING_FIXTURE_EXPERT_B }
]

export const EXPERT_BOOKING_FIXTURE_DAY_OVERRIDES: ExpertCalendarDayOverride[] = [
  {
    expert_operator_id: EXPERT_BOOKING_FIXTURE_EXPERT_A,
    override_date: '2026-04-10',
    is_customized: true,
    slots: [600, 630, 660]
  }
]

export const EXPERT_BOOKING_FIXTURE_EXPERTS: ExpertCalendarExpert[] = [
  { id: EXPERT_BOOKING_FIXTURE_EXPERT_A, name: '王專家', email: 'expert-wang@example.com', role: 'expert' },
  { id: EXPERT_BOOKING_FIXTURE_EXPERT_B, name: '李專家', email: 'expert-li@example.com', role: 'expert' }
]

export function createExpertBookingFixtureStore() {
  const details = new Map<string, ExpertBookingDetail>(
    Object.entries(EXPERT_BOOKING_FIXTURE_DETAILS).map(([id, d]) => [id, structuredClone(d)])
  )
  let weekly = EXPERT_BOOKING_FIXTURE_WEEKLY.map(s => ({ ...s }))
  let dayOverrides = EXPERT_BOOKING_FIXTURE_DAY_OVERRIDES.map(d => ({
    ...d,
    slots: [...d.slots]
  }))
  const lastSeenByExpert: Record<string, string | null> = {
    [EXPERT_BOOKING_FIXTURE_EXPERT_A]: 'eb-await-1'
  }
  const pinnedByExpert: Record<string, Set<string>> = {
    [EXPERT_BOOKING_FIXTURE_EXPERT_A]: new Set(['eb-sched-1'])
  }
  let attachmentSeq = 0

  function syncListFields(detail: ExpertBookingDetail) {
    // list fields live on detail; callers read from details map
    void detail
  }

  function allDetails(): ExpertBookingDetail[] {
    return [...details.values()]
  }

  function listItem(detail: ExpertBookingDetail, expertId: string | null): ExpertBookingListItem {
    return {
      id: detail.id,
      order_id: detail.order_id,
      order_no: detail.order_no,
      paid_at: detail.paid_at,
      user_id: detail.user_id,
      member_email: detail.member_email,
      status: detail.status,
      contact_name: detail.contact_name,
      contact_phone: detail.contact_phone,
      contact_email: detail.contact_email,
      contact_line: detail.contact_line,
      preferred_slots: [...detail.preferred_slots],
      confirmed_starts_at: detail.confirmed_starts_at,
      confirmed_ends_at: detail.confirmed_ends_at,
      pinned: expertId ? isPinned(expertId, detail.id) : detail.pinned,
      created_at: detail.created_at,
      updated_at: detail.updated_at
    }
  }

  function isPinned(expertId: string, bookingId: string) {
    return pinnedByExpert[expertId]?.has(bookingId) ?? false
  }

  function setPinned(expertId: string, bookingId: string, pinned: boolean) {
    if (!pinnedByExpert[expertId]) {
      pinnedByExpert[expertId] = new Set()
    }
    if (pinned) {
      pinnedByExpert[expertId]!.add(bookingId)
    } else {
      pinnedByExpert[expertId]!.delete(bookingId)
    }
  }

  function calendarSnapshot(params: {
    from: string
    to: string
    expertOperatorId?: string | null
  }): ExpertCalendarSnapshot {
    const expertId = params.expertOperatorId || null
    const weeklyFiltered = expertId
      ? weekly.filter(s => s.expert_operator_id === expertId)
      : [...weekly]
    const overridesFiltered = expertId
      ? dayOverrides.filter(d => d.expert_operator_id === expertId)
      : [...dayOverrides]
    const scheduled_bookings: ExpertCalendarScheduledBooking[] = allDetails()
      .filter(b => b.status === 'scheduled' && b.confirmed_starts_at)
      .map(b => ({
        id: b.id,
        status: b.status,
        contact_name: b.contact_name,
        confirmed_starts_at: b.confirmed_starts_at,
        confirmed_ends_at: b.confirmed_ends_at,
        confirmed_by_operator_id: EXPERT_BOOKING_FIXTURE_EXPERT_A
      }))
    return {
      weekly: weeklyFiltered,
      day_overrides: overridesFiltered,
      scheduled_bookings,
      experts: EXPERT_BOOKING_FIXTURE_EXPERTS.map(e => ({ ...e }))
    }
  }

  function nextProductPickId() {
    return `pp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  }

  function applyProductPicks(
    bookingId: string,
    inputs: Array<{ sellable_item_id?: string, sellable_item_code?: string, reason: string }>
  ): ExpertBookingProductPick[] {
    const picks = inputs.map((input, index) => {
      const option = EXPERT_BOOKING_SELLABLE_OPTIONS.find(
        o => o.id === input.sellable_item_id || o.code === input.sellable_item_code
      )
      return {
        id: nextProductPickId(),
        sellable_item_id: input.sellable_item_id || option?.id || `si-unknown-${index}`,
        sellable_item_code: input.sellable_item_code ?? option?.code ?? null,
        sellable_item_name: option?.name_zh ?? null,
        reason: input.reason,
        sort_order: index
      }
    })
    const row = details.get(bookingId)
    if (row) {
      row.product_picks = picks
      syncListFields(row)
    }
    return picks
  }

  function uploadAttachment(bookingId: string, file: { name: string, type: string, size: number }): ExpertBookingAttachment {
    if (!details.has(bookingId)) {
      throw new Error('not_found')
    }
    attachmentSeq += 1
    const contentType = (
      file.type === 'application/pdf'
      || file.type === 'image/jpeg'
      || file.type === 'image/png'
      || file.type === 'image/webp'
    )
      ? file.type
      : 'application/pdf'
    return {
      key: `expert-booking/${bookingId}/svc-${attachmentSeq}-${file.name}`,
      filename: file.name,
      content_type: contentType,
      size_bytes: Math.max(1, file.size || 1)
    }
  }

  return {
    details,
    allDetails,
    listItem,
    isPinned,
    setPinned,
    getLastSeen: (expertId: string) => lastSeenByExpert[expertId] ?? null,
    setLastSeen: (expertId: string, bookingId: string) => {
      lastSeenByExpert[expertId] = bookingId
    },
    calendarSnapshot,
    getWeekly: () => weekly,
    replaceWeeklyForExpert: (expertOperatorId: string, slots: Array<{ weekday: number, slot_start_minute: number }>) => {
      weekly = [
        ...weekly.filter(s => s.expert_operator_id !== expertOperatorId),
        ...slots.map((s, i) => ({
          id: `w-${expertOperatorId}-${i}`,
          weekday: s.weekday,
          slot_start_minute: s.slot_start_minute,
          expert_operator_id: expertOperatorId,
          updated_by_operator_id: expertOperatorId,
          updated_at: new Date().toISOString()
        }))
      ]
      return weekly.filter(s => s.expert_operator_id === expertOperatorId)
    },
    getDayOverrides: () => dayOverrides,
    putDayOverride: (input: {
      expert_operator_id: string
      override_date: string
      slots: number[]
    }) => {
      dayOverrides = [
        ...dayOverrides.filter(
          d => !(d.expert_operator_id === input.expert_operator_id && d.override_date === input.override_date)
        ),
        {
          expert_operator_id: input.expert_operator_id,
          override_date: input.override_date,
          is_customized: true,
          slots: [...input.slots],
          updated_by_operator_id: input.expert_operator_id,
          updated_at: new Date().toISOString()
        }
      ]
      return dayOverrides.find(
        d => d.expert_operator_id === input.expert_operator_id && d.override_date === input.override_date
      )!
    },
    deleteDayOverride: (expertOperatorId: string, overrideDate: string) => {
      dayOverrides = dayOverrides.filter(
        d => !(d.expert_operator_id === expertOperatorId && d.override_date === overrideDate)
      )
      return { cleared: true }
    },
    applyProductPicks,
    uploadAttachment,
    conversations: (bookingId?: string) => structuredClone(
      bookingId === 'eb-sched-1' || bookingId === 'eb-done-1'
        ? EXPERT_BOOKING_FIXTURE_CONVERSATIONS_GREY
        : EXPERT_BOOKING_FIXTURE_CONVERSATIONS
    )
  }
}

export type ExpertBookingFixtureStore = ReturnType<typeof createExpertBookingFixtureStore>
