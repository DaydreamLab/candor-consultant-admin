import type {
  ExpertBookingDetail,
  ExpertBookingListItem,
  ExpertBookingSellableOption,
  ExpertCalendarSnapshot
} from '~/utils/expert-booking-types'

export const EXPERT_BOOKING_MOCK_EXPERTS = [
  { id: 'op-expert-wang', name: '王專家', color: '#3b82f6' },
  { id: 'op-expert-li', name: '李專家', color: '#8b5cf6' },
  { id: 'op-expert-chen', name: '陳專家', color: '#22c55e' }
] as const

export const EXPERT_BOOKING_SELLABLE_OPTIONS: ExpertBookingSellableOption[] = [
  {
    id: 'si-magnesium',
    name_zh: 'Magnesium 6 in 1 6合1鎂',
    name_en: 'Magnesium 6 in 1',
    sku: 'MG-6IN1'
  },
  {
    id: 'si-active-b',
    name_zh: 'Active B complex 綜合活性B群',
    name_en: 'Active B complex',
    sku: 'B-ACTIVE'
  },
  {
    id: 'si-liquid-d3',
    name_zh: 'Liquid D3+K2',
    name_en: 'Liquid D3+K2',
    sku: 'D3K2'
  }
]

function baseList(): ExpertBookingListItem[] {
  return [
    {
      id: 'eb-0021',
      order_id: 'ord-261106-000021',
      order_code: 'ORD-261106-000021',
      member_name: '王小明',
      status: 'pending_schedule',
      payment_status: 'paid',
      preferred_slots: [
        { date: '2026-11-12', start_hour: 14, end_hour: 16 },
        { date: '2026-11-13', start_hour: 10, end_hour: 12 }
      ],
      confirmed_at: null,
      annotated_expert_id: null,
      annotated_expert_name: null,
      pinned: true,
      paid_at: '2026-11-06T14:22:00+08:00',
      amount: 6000
    },
    {
      id: 'eb-0019',
      order_id: 'ord-261105-000019',
      order_code: 'ORD-261105-000019',
      member_name: '陳美玲',
      status: 'scheduled',
      payment_status: 'paid',
      preferred_slots: [
        { date: '2026-11-10', start_hour: 10, end_hour: 12 }
      ],
      confirmed_at: '2026-11-10T10:00:00+08:00',
      annotated_expert_id: 'op-expert-wang',
      annotated_expert_name: '王專家',
      pinned: false,
      paid_at: '2026-11-05T09:10:00+08:00',
      amount: 6000
    },
    {
      id: 'eb-0015',
      order_id: 'ord-261104-000015',
      order_code: 'ORD-261104-000015',
      member_name: '林大同',
      status: 'scheduled',
      payment_status: 'paid',
      preferred_slots: [
        { date: '2026-11-12', start_hour: 14, end_hour: 15 }
      ],
      confirmed_at: '2026-11-12T14:00:00+08:00',
      annotated_expert_id: 'op-expert-chen',
      annotated_expert_name: '陳專家',
      pinned: false,
      paid_at: '2026-11-04T18:00:00+08:00',
      amount: 6000
    },
    {
      id: 'eb-0010',
      order_id: 'ord-261101-000010',
      order_code: 'ORD-261101-000010',
      member_name: '張雅婷',
      status: 'completed',
      payment_status: 'paid',
      preferred_slots: [
        { date: '2026-11-03', start_hour: 15, end_hour: 17 }
      ],
      confirmed_at: '2026-11-03T15:00:00+08:00',
      annotated_expert_id: 'op-expert-li',
      annotated_expert_name: '李專家',
      pinned: false,
      paid_at: '2026-11-01T11:00:00+08:00',
      amount: 6000
    }
  ]
}

export function createExpertBookingFixtureStore() {
  const list = baseList()
  const details = new Map<string, ExpertBookingDetail>()
  for (const row of list) {
    details.set(row.id, detailFor(row))
  }

  const lastSeenByExpert: Record<string, { booking_id: string, seen_at: string }> = {
    'op-expert-wang': { booking_id: 'eb-0021', seen_at: '2026-11-06T16:00:00+08:00' }
  }

  const pinsByExpert: Record<string, Set<string>> = {
    'op-expert-wang': new Set(['eb-0021'])
  }

  const calendar: ExpertCalendarSnapshot = {
    experts: EXPERT_BOOKING_MOCK_EXPERTS.map(e => ({ ...e })),
    weekly_rules: [
      { expert_id: 'op-expert-wang', weekday: 4, start_time: '09:30', end_time: '12:00' },
      { expert_id: 'op-expert-wang', weekday: 4, start_time: '13:00', end_time: '18:00' },
      { expert_id: 'op-expert-wang', weekday: 5, start_time: '09:00', end_time: '12:00' },
      { expert_id: 'op-expert-li', weekday: 1, start_time: '10:00', end_time: '12:00' },
      { expert_id: 'op-expert-chen', weekday: 4, start_time: '13:00', end_time: '17:00' }
    ],
    day_overrides: [
      {
        expert_id: 'op-expert-wang',
        date: '2026-11-13',
        slots: [
          { start_time: '10:00', end_time: '12:00' },
          { start_time: '14:00', end_time: '16:00' }
        ],
        updated_by_operator_id: 'op-expert-wang',
        updated_by_name: '王專家',
        updated_at: '2026-11-08T15:40:00+08:00'
      }
    ],
    appointments: [
      {
        booking_id: 'eb-0019',
        expert_id: 'op-expert-li',
        expert_name: '李專家',
        member_name: '陳美玲',
        date: '2026-11-10',
        start_time: '10:00',
        end_time: '11:00'
      },
      {
        booking_id: 'eb-0015',
        expert_id: 'op-expert-chen',
        expert_name: '陳專家',
        member_name: '林大同',
        date: '2026-11-12',
        start_time: '14:00',
        end_time: '15:00'
      },
      {
        booking_id: 'eb-0019b',
        expert_id: 'op-expert-wang',
        expert_name: '王專家',
        member_name: '王小明',
        date: '2026-11-12',
        start_time: '15:00',
        end_time: '16:00'
      }
    ],
    last_modified_by_name: '王專家',
    last_modified_at: '2026-11-08T15:40:00+08:00'
  }

  return {
    list,
    details,
    lastSeenByExpert,
    pinsByExpert,
    calendar,
    setLastSeen(expertId: string, bookingId: string) {
      lastSeenByExpert[expertId] = {
        booking_id: bookingId,
        seen_at: new Date().toISOString()
      }
    },
    togglePin(expertId: string, bookingId: string, pinned: boolean) {
      if (!pinsByExpert[expertId]) {
        pinsByExpert[expertId] = new Set()
      }
      if (pinned) {
        pinsByExpert[expertId]!.add(bookingId)
      } else {
        pinsByExpert[expertId]!.delete(bookingId)
      }
    },
    isPinned(expertId: string, bookingId: string) {
      return pinsByExpert[expertId]?.has(bookingId) ?? false
    }
  }
}

function detailFor(row: ExpertBookingListItem): ExpertBookingDetail {
  return {
    ...row,
    need_description: row.id === 'eb-0021'
      ? '想討論減重與作息'
      : '希望調整營養補充節奏',
    contact_email: 'member@example.com',
    contact_phone: '0912-345-678',
    contact_line: null,
    profile: {
      user_id: `user-${row.id}`,
      display_name: row.member_name,
      email: 'member@example.com',
      phone: '0912-345-678',
      goals: ['減重', '睡眠', '壓力'],
      summary: '會員基本資料摘要（示意）'
    },
    product_reasons: row.id === 'eb-0010'
      ? [
          {
            sellable_item_id: 'si-magnesium',
            name_zh: 'Magnesium 6 in 1 6合1鎂',
            name_en: 'Magnesium 6 in 1',
            reason: '協助放鬆與睡眠品質'
          }
        ]
      : [],
    service_record: row.status === 'completed'
      ? {
          actual_service_time: '2026-11-03 15:00-15:45',
          service_method: 'phone',
          content: '討論減重與作息',
          sales_content: '建議 Magnesium',
          duration_minutes: 45,
          sales_result: null,
          deal_amount: null,
          follow_up: null,
          attachment_note: null,
          updated_by_operator_id: 'op-expert-li',
          updated_by_name: '李專家',
          updated_at: '2026-11-03T16:00:00+08:00'
        }
      : null,
    conversations: [
      {
        id: 'conv-3',
        started_at: '2026-11-06T13:40:00+08:00',
        messages: [
          {
            role: 'assistant',
            content: '根據您的目標「減重」，我們可以先從作息與飲食節奏討論。',
            created_at: '2026-11-06T13:40:00+08:00'
          },
          {
            role: 'user',
            content: '好，我想先跟專家聊聊',
            created_at: '2026-11-06T13:41:00+08:00'
          },
          {
            role: 'assistant',
            content: '可以預約專家諮詢，專人會再與您確認時間。',
            created_at: '2026-11-06T13:42:00+08:00'
          }
        ]
      },
      {
        id: 'conv-2',
        started_at: '2026-11-05T09:12:00+08:00',
        messages: [
          {
            role: 'user',
            content: '最近睡不好，壓力也大。',
            created_at: '2026-11-05T09:12:00+08:00'
          },
          {
            role: 'assistant',
            content: '了解，我們可以先釐清作息與壓力來源。',
            created_at: '2026-11-05T09:13:00+08:00'
          }
        ]
      },
      {
        id: 'conv-1',
        started_at: '2026-11-01T20:05:00+08:00',
        messages: [
          {
            role: 'user',
            content: '想了解減重方向。',
            created_at: '2026-11-01T20:05:00+08:00'
          }
        ]
      }
    ],
    conversations_has_more: false
  }
}

export type ExpertBookingFixtureStore = ReturnType<typeof createExpertBookingFixtureStore>
