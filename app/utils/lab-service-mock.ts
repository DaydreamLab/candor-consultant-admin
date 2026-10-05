/** Local mock only — not wired to `/admin/lab-services` or appointment HTTP. */

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type LabServiceItemMock = {
  id: string
  name_zh: string
  name_en: string
  unit_price: number
  required: boolean
}

export type LabServiceWindowMock = {
  id: string
  start: string
  end: string
  capacity: number
}

export type LabServiceScheduleRuleMock = {
  id: string
  weekdays: Weekday[]
  windows: LabServiceWindowMock[]
}

export type LabServiceMock = {
  id: string
  code: string
  name_zh: string
  name_en: string
  description: string
  partner_name: string
  partner_phone: string
  partner_address: string
  items: LabServiceItemMock[]
  schedule_rules: LabServiceScheduleRuleMock[]
  sort_order: number
  active: boolean
  updated_at: string
}

export type LabAppointmentStatus = 'booked' | 'cancelled'

export type LabAppointmentSelectedItemMock = {
  item_id: string
  name_zh: string
  name_en: string
  unit_price: number
  required: boolean
}

export type LabAppointmentMock = {
  id: string
  lab_service_id: string
  lab_service_code: string
  lab_service_name_zh: string
  lab_service_name_en: string
  partner_name: string
  user_display_name: string
  user_email: string
  appointment_date: string
  window_start: string
  window_end: string
  selected_items: LabAppointmentSelectedItemMock[]
  amount_total: number
  status: LabAppointmentStatus
  booked_at: string
  cancelled_at: string | null
}

export type LabServiceWrite = {
  code: string
  name_zh: string
  name_en: string
  description: string
  partner_name: string
  partner_phone: string
  partner_address: string
  items: LabServiceItemMock[]
  schedule_rules: LabServiceScheduleRuleMock[]
  sort_order: number
  active: boolean
}

export function basePriceOf(service: Pick<LabServiceMock, 'items'>): number {
  return service.items
    .filter(item => item.required)
    .reduce((sum, item) => sum + item.unit_price, 0)
}

export function amountOfSelected(items: Array<Pick<LabAppointmentSelectedItemMock, 'unit_price'>>): number {
  return items.reduce((sum, item) => sum + item.unit_price, 0)
}

export function cloneLabService(service: LabServiceMock): LabServiceMock {
  return JSON.parse(JSON.stringify(service)) as LabServiceMock
}

export function cloneLabAppointment(row: LabAppointmentMock): LabAppointmentMock {
  return JSON.parse(JSON.stringify(row)) as LabAppointmentMock
}

export function newLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const SEED_SERVICE_BASIC: LabServiceMock = {
  id: 'ls-younger-basic',
  code: 'blood_panel_basic',
  name_zh: '基礎血檢組合',
  name_en: 'Basic blood panel',
  description: '配合 Younger 據點的示範採檢服務（mock）。',
  partner_name: 'Younger',
  partner_phone: '02-0000-0000（示範）',
  partner_address: '台北市示範區示範路 1 號（示範地址）',
  items: [
    {
      id: 'lsi-cbc',
      name_zh: '全血球計數',
      name_en: 'CBC',
      unit_price: 800,
      required: true
    },
    {
      id: 'lsi-metabolic',
      name_zh: '代謝指標組合',
      name_en: 'Metabolic panel',
      unit_price: 1200,
      required: true
    },
    {
      id: 'lsi-vitd',
      name_zh: '維生素 D',
      name_en: 'Vitamin D',
      unit_price: 600,
      required: false
    }
  ],
  schedule_rules: [
    {
      id: 'lsr-weekday',
      weekdays: [1, 2, 3, 4, 5],
      windows: [
        { id: 'lsw-am', start: '09:00', end: '12:00', capacity: 8 },
        { id: 'lsw-pm', start: '14:00', end: '17:00', capacity: 6 }
      ]
    }
  ],
  sort_order: 10,
  active: true,
  updated_at: '2026-10-01T02:00:00.000Z'
}

const SEED_SERVICE_CHECKUP: LabServiceMock = {
  id: 'ls-younger-checkup',
  code: 'checkup_focus',
  name_zh: '健檢重點組合',
  name_en: 'Focused checkup',
  description: 'Younger 示範採檢服務；含必選與可加選項目（mock）。',
  partner_name: 'Younger',
  partner_phone: '02-0000-0000（示範）',
  partner_address: '台北市示範區示範路 1 號（示範地址）',
  items: [
    {
      id: 'lsi-urine',
      name_zh: '尿液檢查',
      name_en: 'Urinalysis',
      unit_price: 500,
      required: true
    },
    {
      id: 'lsi-lipid',
      name_zh: '血脂檢查',
      name_en: 'Lipid panel',
      unit_price: 900,
      required: true
    },
    {
      id: 'lsi-thyroid',
      name_zh: '甲狀腺指標',
      name_en: 'Thyroid markers',
      unit_price: 1100,
      required: false
    }
  ],
  schedule_rules: [
    {
      id: 'lsr-thu',
      weekdays: [4],
      windows: [
        { id: 'lsw-thu-am', start: '10:00', end: '12:00', capacity: 4 }
      ]
    },
    {
      id: 'lsr-sat',
      weekdays: [6],
      windows: [
        { id: 'lsw-sat-am', start: '09:00', end: '11:30', capacity: 3 }
      ]
    }
  ],
  sort_order: 20,
  active: true,
  updated_at: '2026-10-02T03:00:00.000Z'
}

export const LAB_SERVICE_SEED: LabServiceMock[] = [
  cloneLabService(SEED_SERVICE_BASIC),
  cloneLabService(SEED_SERVICE_CHECKUP)
]

const bookedItems: LabAppointmentSelectedItemMock[] = [
  {
    item_id: 'lsi-cbc',
    name_zh: '全血球計數',
    name_en: 'CBC',
    unit_price: 800,
    required: true
  },
  {
    item_id: 'lsi-metabolic',
    name_zh: '代謝指標組合',
    name_en: 'Metabolic panel',
    unit_price: 1200,
    required: true
  },
  {
    item_id: 'lsi-vitd',
    name_zh: '維生素 D',
    name_en: 'Vitamin D',
    unit_price: 600,
    required: false
  }
]

const cancelledItems: LabAppointmentSelectedItemMock[] = [
  {
    item_id: 'lsi-urine',
    name_zh: '尿液檢查',
    name_en: 'Urinalysis',
    unit_price: 500,
    required: true
  },
  {
    item_id: 'lsi-lipid',
    name_zh: '血脂檢查',
    name_en: 'Lipid panel',
    unit_price: 900,
    required: true
  }
]

function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function localDateOffset(daysFromToday: number): string {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + daysFromToday)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const DEMO_MEMBER_LABELS = [
  '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸',
  '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉'
] as const

type AppointmentSeedTemplate = Omit<LabAppointmentMock, 'appointment_date'> & { day_offset: number }

function memberLabel(index: number): string {
  return DEMO_MEMBER_LABELS[index % DEMO_MEMBER_LABELS.length] ?? String(index + 1)
}

function makeBookedSeed(input: {
  id: string
  day_offset: number
  window_start: string
  window_end: string
  memberIndex: number
  service: LabServiceMock
  items: LabAppointmentSelectedItemMock[]
  status?: LabAppointmentStatus
  booked_at: string
  cancelled_at?: string | null
}): AppointmentSeedTemplate {
  const status = input.status ?? 'booked'
  return {
    id: input.id,
    lab_service_id: input.service.id,
    lab_service_code: input.service.code,
    lab_service_name_zh: input.service.name_zh,
    lab_service_name_en: input.service.name_en,
    partner_name: input.service.partner_name,
    user_display_name: `示範會員${memberLabel(input.memberIndex)}`,
    user_email: `member-${String(input.memberIndex + 1).padStart(2, '0')}@example.com`,
    day_offset: input.day_offset,
    window_start: input.window_start,
    window_end: input.window_end,
    selected_items: clonePlain(input.items),
    amount_total: amountOfSelected(input.items),
    status,
    booked_at: input.booked_at,
    cancelled_at: status === 'cancelled' ? (input.cancelled_at ?? input.booked_at) : null
  }
}

/**
 * Pack today to capacity for the basic service windows (AM 8 + PM 6),
 * plus a few sparse rows on other days for week-view contrast.
 */
function buildAppointmentSeedTemplates(): AppointmentSeedTemplate[] {
  const requiredOnly = bookedItems.filter(item => item.required)
  const packedToday: AppointmentSeedTemplate[] = []
  let memberIndex = 0

  // AM window capacity 8
  for (let slot = 0; slot < 8; slot += 1) {
    packedToday.push(makeBookedSeed({
      id: `la-today-am-${String(slot + 1).padStart(2, '0')}`,
      day_offset: 0,
      window_start: '09:00',
      window_end: '12:00',
      memberIndex,
      service: SEED_SERVICE_BASIC,
      items: slot % 3 === 0 ? bookedItems : requiredOnly,
      booked_at: `2026-10-04T0${Math.min(slot, 9)}:10:00.000Z`
    }))
    memberIndex += 1
  }

  // PM window capacity 6
  for (let slot = 0; slot < 6; slot += 1) {
    packedToday.push(makeBookedSeed({
      id: `la-today-pm-${String(slot + 1).padStart(2, '0')}`,
      day_offset: 0,
      window_start: '14:00',
      window_end: '17:00',
      memberIndex,
      service: SEED_SERVICE_BASIC,
      items: slot % 2 === 0 ? bookedItems : requiredOnly,
      status: slot === 5 ? 'cancelled' : 'booked',
      booked_at: `2026-10-04T1${slot}:20:00.000Z`,
      cancelled_at: slot === 5 ? '2026-10-05T01:00:00.000Z' : null
    }))
    memberIndex += 1
  }

  const sparseOtherDays: AppointmentSeedTemplate[] = [
    makeBookedSeed({
      id: 'la-booked-tomorrow',
      day_offset: 1,
      window_start: '10:00',
      window_end: '12:00',
      memberIndex: memberIndex++,
      service: SEED_SERVICE_CHECKUP,
      items: cancelledItems,
      booked_at: '2026-10-04T05:00:00.000Z'
    }),
    makeBookedSeed({
      id: 'la-booked-plus-3',
      day_offset: 3,
      window_start: '09:00',
      window_end: '12:00',
      memberIndex: memberIndex++,
      service: SEED_SERVICE_BASIC,
      items: bookedItems,
      booked_at: '2026-10-03T08:00:00.000Z'
    }),
    makeBookedSeed({
      id: 'la-cancelled-plus-4',
      day_offset: 4,
      window_start: '10:00',
      window_end: '12:00',
      memberIndex: memberIndex++,
      service: SEED_SERVICE_CHECKUP,
      items: cancelledItems,
      status: 'cancelled',
      booked_at: '2026-09-28T04:00:00.000Z',
      cancelled_at: '2026-10-01T06:30:00.000Z'
    }),
    makeBookedSeed({
      id: 'la-booked-plus-5',
      day_offset: 5,
      window_start: '09:00',
      window_end: '12:00',
      memberIndex: memberIndex++,
      service: SEED_SERVICE_BASIC,
      items: bookedItems,
      booked_at: '2026-10-05T01:00:00.000Z'
    })
  ]

  return [...packedToday, ...sparseOtherDays]
}

export function seedLabServices(): LabServiceMock[] {
  return LAB_SERVICE_SEED.map(cloneLabService)
}

export function seedLabAppointments(): LabAppointmentMock[] {
  return buildAppointmentSeedTemplates().map((row) => {
    const { day_offset, ...rest } = row
    return cloneLabAppointment({
      ...rest,
      appointment_date: localDateOffset(day_offset)
    })
  })
}

/** Monday (local) of the week that contains `date`, as YYYY-MM-DD. */
export function weekStartMonday(date = new Date()): string {
  const local = new Date(date)
  local.setHours(12, 0, 0, 0)
  const day = local.getDay()
  const offset = day === 0 ? -6 : 1 - day
  local.setDate(local.getDate() + offset)
  const year = local.getFullYear()
  const month = String(local.getMonth() + 1).padStart(2, '0')
  const dayNum = String(local.getDate()).padStart(2, '0')
  return `${year}-${month}-${dayNum}`
}

export function addDaysToDateString(dateText: string, days: number): string {
  const [year, month, day] = dateText.split('-').map(Number)
  const local = new Date(year!, month! - 1, day!, 12, 0, 0, 0)
  local.setDate(local.getDate() + days)
  const y = local.getFullYear()
  const m = String(local.getMonth() + 1).padStart(2, '0')
  const d = String(local.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDaysToDateString(weekStart, index))
}
