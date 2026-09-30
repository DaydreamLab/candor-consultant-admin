export type HealthReportResult = {
  id: string
  biomarker_id?: string | null
  raw_name?: string | null
  raw_value?: string | null
  raw_unit?: string | null
  value_numeric?: number | null
  unit?: string | null
  ref_low?: number | null
  ref_high?: number | null
  borderline_low?: number | null
  borderline_high?: number | null
  critical_low?: number | null
  critical_high?: number | null
  confidence?: number | null
  needs_review?: boolean
  page?: number | null
}

export type ResultStatusClass = 'ok' | 'warn' | 'alert' | 'unknown'

export function resultNumeric(r: HealthReportResult): number | null {
  if (r.value_numeric != null && !Number.isNaN(Number(r.value_numeric))) {
    return Number(r.value_numeric)
  }
  if (r.raw_value != null && r.raw_value !== '' && !Number.isNaN(Number(r.raw_value))) {
    return Number(r.raw_value)
  }
  return null
}

export function resultStatusClass(r: HealthReportResult): ResultStatusClass {
  const v = resultNumeric(r)
  if (v == null) {
    return r.needs_review ? 'warn' : 'unknown'
  }
  if (r.critical_low != null && v < Number(r.critical_low)) {
    return 'alert'
  }
  if (r.critical_high != null && v > Number(r.critical_high)) {
    return 'alert'
  }
  if (r.borderline_low != null && v < Number(r.borderline_low)) {
    return 'warn'
  }
  if (r.borderline_high != null && v > Number(r.borderline_high)) {
    return 'warn'
  }
  if (r.ref_low != null && v < Number(r.ref_low)) {
    return 'warn'
  }
  if (r.ref_high != null && v > Number(r.ref_high)) {
    return 'warn'
  }
  if (r.ref_low != null || r.ref_high != null) {
    return 'ok'
  }
  return r.needs_review ? 'warn' : 'unknown'
}

export function formatResultRef(r: HealthReportResult) {
  const low = r.ref_low
  const high = r.ref_high
  if (low == null && high == null) {
    return '—'
  }
  if (low != null && high != null) {
    return `${low} ~ ${high}`
  }
  if (low != null) {
    return `≥ ${low}`
  }
  return `≤ ${high}`
}

export function resultGaugePct(r: HealthReportResult): number | null {
  const v = resultNumeric(r)
  const low = r.ref_low != null ? Number(r.ref_low) : null
  const high = r.ref_high != null ? Number(r.ref_high) : null
  if (v == null || low == null || high == null || high <= low) {
    return null
  }
  const pad = (high - low) * 0.5
  const min = low - pad
  const max = high + pad
  return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))
}

export function displayResultValue(r: HealthReportResult) {
  const v = resultNumeric(r)
  if (v != null) {
    return String(v)
  }
  return r.raw_value != null ? String(r.raw_value) : '—'
}
