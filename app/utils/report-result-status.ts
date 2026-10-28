export type HealthReportResult = {
  id: string
  biomarker_id?: string | null
  raw_name?: string | null
  name_zh?: string | null
  name_zh_source?: 'report' | 'ai' | 'dictionary' | 'raw' | null
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
  range_status?: 'low' | 'high' | 'normal' | 'unknown' | null
  description?: string | null
  possible_causes?: string | null
  possible_risks?: string | null
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

/** Align with core SignalEvaluator: status vs ref_*; borderline_* only refine outside ref. */
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

/** Same as younger: pad beyond ref as multiple of span (green ≈ 37.5%–62.5%). */
export const GAUGE_PAD_RATIO = 1.5

export function resultGaugePct(r: HealthReportResult): number | null {
  const v = resultNumeric(r)
  const low = r.ref_low != null ? Number(r.ref_low) : null
  const high = r.ref_high != null ? Number(r.ref_high) : null
  if (v == null || low == null || high == null || high <= low) {
    return null
  }
  const pad = (high - low) * GAUGE_PAD_RATIO
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

export function displayResultName(r: HealthReportResult) {
  const zh = r.name_zh != null ? String(r.name_zh).trim() : ''
  if (zh !== '') {
    return zh
  }
  const raw = r.raw_name != null ? String(r.raw_name).trim() : ''
  if (raw !== '') {
    return raw
  }
  const id = r.biomarker_id != null ? String(r.biomarker_id).trim() : ''
  return id !== '' ? id : '—'
}

/** Report raw_name when it differs from the displayed Chinese/preferred name. */
export function displayResultOriginalName(r: HealthReportResult): string | null {
  const raw = r.raw_name != null ? String(r.raw_name).trim() : ''
  if (raw === '') {
    return null
  }
  const display = displayResultName(r)
  if (raw === display) {
    return null
  }
  return raw
}


export function hasResultInterpretation(r: HealthReportResult) {
  const description = r.description != null ? String(r.description).trim() : ''
  const causes = r.possible_causes != null ? String(r.possible_causes).trim() : ''
  const risks = r.possible_risks != null ? String(r.possible_risks).trim() : ''
  return description !== '' || causes !== '' || risks !== ''
}

/** Map one core health-report result row into the shared UI shape. */
export function mapHealthReportResultRow(row: Record<string, unknown>): HealthReportResult | null {
  const id = typeof row.id === 'string' && row.id.trim() !== '' ? row.id : null
  if (!id) {
    return null
  }
  const optionalString = (value: unknown) => (typeof value === 'string' ? value : null)
  const optionalNumber = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value)
    }
    return null
  }
  const nameZhSource = optionalString(row.name_zh_source)
  const rangeStatus = optionalString(row.range_status)
  return {
    id,
    biomarker_id: optionalString(row.biomarker_id),
    raw_name: optionalString(row.raw_name),
    name_zh: optionalString(row.name_zh),
    name_zh_source: nameZhSource === 'report' || nameZhSource === 'ai'
      || nameZhSource === 'dictionary' || nameZhSource === 'raw'
      ? nameZhSource
      : null,
    raw_value: optionalString(row.raw_value),
    raw_unit: optionalString(row.raw_unit),
    value_numeric: optionalNumber(row.value_numeric),
    unit: optionalString(row.unit),
    ref_low: optionalNumber(row.ref_low),
    ref_high: optionalNumber(row.ref_high),
    borderline_low: optionalNumber(row.borderline_low),
    borderline_high: optionalNumber(row.borderline_high),
    critical_low: optionalNumber(row.critical_low),
    critical_high: optionalNumber(row.critical_high),
    confidence: optionalNumber(row.confidence),
    needs_review: typeof row.needs_review === 'boolean' ? row.needs_review : undefined,
    page: optionalNumber(row.page),
    range_status: rangeStatus === 'low' || rangeStatus === 'high'
      || rangeStatus === 'normal' || rangeStatus === 'unknown'
      ? rangeStatus
      : null,
    description: optionalString(row.description),
    possible_causes: optionalString(row.possible_causes),
    possible_risks: optionalString(row.possible_risks)
  }
}
