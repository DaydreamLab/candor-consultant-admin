/**
 * Admin／expert read-only projection of hydrated `reply_actions`
 * (candor-core CTA grey-retain / design B v3).
 *
 * Missing `interaction`／`status` (legacy backends) → treat as disabled; never throw.
 */

export type CtaControlStatus = 'current' | 'selected' | 'disabled'

export type CtaRoundStatus = 'current' | 'historical'

export type CtaInteractionOutcome = 'option_selected' | 'free_text'

export type VitalsField = 'age' | 'height' | 'weight'

export interface ReplyActionsInteraction {
  round_status: CtaRoundStatus
  outcome: CtaInteractionOutcome | null
}

export interface ReplyActionOption {
  code: string
  label: string
  status: CtaControlStatus
  maps_to?: string
}

export interface ChooseOptionPayloadView {
  kind: string | null
  mode: string | null
  confirm: boolean
  confirm_status: CtaControlStatus | null
  options: ReplyActionOption[]
}

export interface AskVitalsPayloadView {
  fields: VitalsField[]
  gap_code: string | null
  status: CtaControlStatus
  has_stored_value: boolean
  stored_value: number | null
}

export interface WholeActionPayloadView {
  status: CtaControlStatus
  label: string
}

export type ReplyActionView
  = | { type: 'choose_option' | 'ask_goal', payload: ChooseOptionPayloadView }
    | { type: 'ask_vitals', payload: AskVitalsPayloadView }
    | { type: 'whole', actionType: string, payload: WholeActionPayloadView }

export interface ReplyActionsView {
  interaction: ReplyActionsInteraction | null
  actions: ReplyActionView[]
}

const STATUS_SET = new Set<CtaControlStatus>(['current', 'selected', 'disabled'])
const VITALS_SET = new Set<VitalsField>(['age', 'height', 'weight'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asCtaControlStatus(value: unknown, fallback: CtaControlStatus = 'disabled'): CtaControlStatus {
  return typeof value === 'string' && STATUS_SET.has(value as CtaControlStatus)
    ? value as CtaControlStatus
    : fallback
}

function asVitalsField(value: unknown): VitalsField | null {
  return typeof value === 'string' && VITALS_SET.has(value as VitalsField)
    ? value as VitalsField
    : null
}

function optionLabel(raw: Record<string, unknown>): string {
  if (typeof raw.label === 'string' && raw.label.trim()) {
    return raw.label.trim()
  }
  if (typeof raw.code === 'string' && raw.code.trim()) {
    return raw.code.trim()
  }
  return ''
}

function parseOptions(raw: unknown): ReplyActionOption[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const out: ReplyActionOption[] = []
  for (const item of raw) {
    if (!isRecord(item)) {
      continue
    }
    const label = optionLabel(item)
    const code = typeof item.code === 'string' ? item.code : label
    if (!label && !code) {
      continue
    }
    out.push({
      code,
      label: label || code,
      status: asCtaControlStatus(item.status),
      ...(typeof item.maps_to === 'string' ? { maps_to: item.maps_to } : {})
    })
  }
  return out
}

function parseChoosePayload(raw: Record<string, unknown>): ChooseOptionPayloadView {
  const confirm = raw.confirm === true
  const confirmStatus = Object.prototype.hasOwnProperty.call(raw, 'confirm_status')
    || confirm
    ? asCtaControlStatus(raw.confirm_status)
    : null
  return {
    kind: typeof raw.kind === 'string' ? raw.kind : null,
    mode: typeof raw.mode === 'string' ? raw.mode : null,
    confirm: confirm || confirmStatus != null || raw.mode === 'multi',
    confirm_status: confirmStatus,
    options: parseOptions(raw.options)
  }
}

function parseVitalsPayload(raw: Record<string, unknown>): AskVitalsPayloadView {
  const fields: VitalsField[] = []
  if (Array.isArray(raw.fields)) {
    for (const item of raw.fields) {
      const field = asVitalsField(item)
      if (field && !fields.includes(field)) {
        fields.push(field)
      }
    }
  }
  let gapCode = typeof raw.gap_code === 'string' && raw.gap_code.trim()
    ? raw.gap_code.trim()
    : null
  if (!gapCode && fields[0]) {
    gapCode = fields[0]
  }
  if (fields.length === 0 && gapCode) {
    const field = asVitalsField(gapCode)
    if (field) {
      fields.push(field)
    }
  }
  const hasStored = raw.has_stored_value === true
  const storedRaw = raw.stored_value
  const storedValue = hasStored && typeof storedRaw === 'number' && Number.isFinite(storedRaw)
    ? storedRaw
    : hasStored && typeof storedRaw === 'string' && storedRaw.trim() && Number.isFinite(Number(storedRaw))
      ? Number(storedRaw)
      : null
  return {
    fields,
    gap_code: gapCode,
    status: asCtaControlStatus(raw.status),
    has_stored_value: hasStored && storedValue != null,
    stored_value: hasStored && storedValue != null ? storedValue : null
  }
}

/**
 * Whole-button CTA types → i18n keys (mirrors health-client-chat-younger
 * `chat.upload` / `chat.checkupLink` / `chat.viewRecommend` / …).
 * Aliases cover catalog／maps_to variants that may appear as `type`.
 */
export const WHOLE_ACTION_LABEL_KEYS: Readonly<Record<string, string>> = {
  ask_report: 'chatCta.askReport',
  upload: 'chatCta.askReport',
  ask_upload: 'chatCta.askReport',
  offer_checkup: 'chatCta.offerCheckup',
  go_checkup: 'chatCta.offerCheckup',
  checkup: 'chatCta.offerCheckup',
  offer_recommend: 'chatCta.offerRecommend',
  offer_full_test: 'chatCta.offerFullTest',
  offer_expert_booking: 'chatCta.offerExpertBooking',
  continue_chat: 'chatCta.continueConsult',
  continue_consultation: 'chatCta.continueConsult',
  continue_health_consultation: 'chatCta.continueConsult'
}

/** Payload button copy only — not `copy` (offer_full_test hint text). */
export function payloadWholeLabel(raw: Record<string, unknown>): string {
  for (const key of ['label', 'button_label', 'title'] as const) {
    if (typeof raw[key] === 'string' && raw[key].trim()) {
      return String(raw[key]).trim()
    }
  }
  return ''
}

/** i18n key for a whole action type; unknown → generic neutral. */
export function wholeActionLabelKey(actionType: string): string {
  return WHOLE_ACTION_LABEL_KEYS[actionType] ?? 'chatCta.unknown'
}

/**
 * Prefer core payload label; else type mapping; never return raw snake_case.
 */
export function resolveWholeActionLabel(
  actionType: string,
  payloadLabel: string | null | undefined,
  translate: (key: string) => string
): string {
  const fromPayload = String(payloadLabel ?? '').trim()
  if (fromPayload) {
    return fromPayload
  }
  return translate(wholeActionLabelKey(actionType))
}

function parseAction(raw: unknown): ReplyActionView | null {
  if (!isRecord(raw)) {
    return null
  }
  const type = typeof raw.type === 'string' ? raw.type : ''
  if (!type || type === 'none') {
    return null
  }
  const payload = isRecord(raw.payload) ? raw.payload : {}

  if (type === 'choose_option' || type === 'ask_goal') {
    const view = parseChoosePayload(payload)
    if (view.options.length === 0 && !view.confirm) {
      return null
    }
    return { type, payload: view }
  }

  if (type === 'ask_vitals') {
    return { type: 'ask_vitals', payload: parseVitalsPayload(payload) }
  }

  return {
    type: 'whole',
    actionType: type,
    payload: {
      status: asCtaControlStatus(payload.status),
      // Keep payload label (may be ''); UI resolves via resolveWholeActionLabel.
      label: payloadWholeLabel(payload)
    }
  }
}

function parseInteraction(raw: unknown): ReplyActionsInteraction | null {
  if (!isRecord(raw)) {
    return null
  }
  const round = raw.round_status === 'current' || raw.round_status === 'historical'
    ? raw.round_status
    : 'historical'
  const outcome = raw.outcome === 'option_selected' || raw.outcome === 'free_text'
    ? raw.outcome
    : null
  return { round_status: round, outcome }
}

/** Extract `reply_actions` from a loose message row (admin／expert payloads). */
export function extractReplyActions(row: unknown): unknown {
  if (!isRecord(row)) {
    return null
  }
  if (row.reply_actions != null) {
    return row.reply_actions
  }
  const meta = row.meta
  if (isRecord(meta) && meta.reply_actions != null) {
    return meta.reply_actions
  }
  return null
}

/** Normalize unknown API payload into a renderable view (legacy-safe). */
export function parseReplyActionsView(raw: unknown): ReplyActionsView | null {
  if (!isRecord(raw)) {
    return null
  }
  const actionsRaw = Array.isArray(raw.actions) ? raw.actions : []
  const actions: ReplyActionView[] = []
  for (const item of actionsRaw) {
    const parsed = parseAction(item)
    if (parsed) {
      actions.push(parsed)
    }
  }
  if (actions.length === 0) {
    return null
  }
  return {
    interaction: parseInteraction(raw.interaction),
    actions
  }
}

export function vitalsDisplayField(payload: AskVitalsPayloadView): VitalsField {
  const fromGap = asVitalsField(payload.gap_code)
  if (fromGap) {
    return fromGap
  }
  return payload.fields[0] ?? 'age'
}

export function ctaStatusClass(status: CtaControlStatus): string {
  if (status === 'selected') {
    return 'is-on'
  }
  if (status === 'current') {
    return 'is-current'
  }
  return 'is-off'
}
