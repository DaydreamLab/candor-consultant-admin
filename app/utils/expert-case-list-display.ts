/**
 * Display helpers for expert-case-reviews list (admin Wave-2 table).
 */

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Prefer human display name; fall back to short user id. */
export function expertCaseMemberName(row: Record<string, unknown>): string {
  const candidates = [
    row.user_display_name,
    row.member_display_name,
    row.display_name,
    row.member_name,
    row.user_name,
    row.customer_name,
    row.customer
  ]
  for (const value of candidates) {
    const text = asTrimmedString(value)
    if (text) {
      return text
    }
  }
  const userId = asTrimmedString(row.user_id)
  return userId ? shortExpertCaseId(userId) : '—'
}

export function expertCaseUserId(row: Record<string, unknown>): string {
  return asTrimmedString(row.user_id)
}

/** Truncate ids for mono secondary line (e.g. user_8f3a…c2). */
export function shortExpertCaseId(value: unknown, head = 8, tail = 2): string {
  const id = asTrimmedString(value)
  if (!id) {
    return '—'
  }
  if (id.length <= head + tail + 1) {
    return id
  }
  return `${id.slice(0, head)}…${id.slice(-tail)}`
}

/** Demo / sample rows may carry explicit flags from mock or fixtures. */
export function isExpertCaseDemoRow(row: Record<string, unknown>): boolean {
  if (row.is_demo === true || row.demo === true || row.is_sample === true) {
    return true
  }
  const source = asTrimmedString(row.source).toLowerCase()
  return source === 'demo' || source === 'mock' || source === 'sample'
}

export function formatExpertCaseListTime(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    return '—'
  }
  const raw = value.trim()
  // Keep API wall-clock (e.g. 2026-10-25T14:22:00+08:00 → 2026-10-25 14:22)
  const wall = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/)
  if (wall) {
    return `${wall[1]} ${wall[2]}:${wall[3]}`
  }
  const parsed = Date.parse(raw)
  if (Number.isNaN(parsed)) {
    return raw
  }
  const d = new Date(parsed)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
