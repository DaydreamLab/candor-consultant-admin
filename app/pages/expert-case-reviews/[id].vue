<script setup lang="ts">
import {
  AdminApiError,
  adminConfirmExpertCaseReviewKnowledge,
  adminExportExpertCaseReview,
  adminGetExpertCaseMemberData,
  adminGetExpertCaseReview,
  adminListSellableItems,
  adminPatchExpertCaseReviewItem,
  adminResetExpertCaseReviewItems,
  adminSubmitExpertCaseReview
} from '~/utils/admin-api'
import {
  adjustmentReasonIsMemberFacing,
  adjustmentTypeKey,
  excludedReasonParts,
  formatScoreNorm,
  isRecord,
  itemRationaleText,
  parseAdjustments,
  parseExcludedRows,
  parseItemContributionBlocks,
  parsePackageRationales,
  parseTopDomains,
  profileFieldLabelKey,
  sortItemsByScoreNorm,
  tierLabelKey,
  type ExpertCaseAdjustment,
  type ExpertCaseExcludedRow
} from '~/utils/expert-case-display'
import {
  defaultDoseForItem,
  parseSellablePickRow,
  reasonIsFilled,
  validateDailyDose,
  type ExpertCaseItemChangeMode,
  type SellablePickRow
} from '~/utils/expert-case-sellable'
import { readOperatorToken } from '~/utils/operator-session'
import type { HealthReportResult } from '~/utils/report-result-status'

const CUSTOMER_ROLES = new Set(['user', 'customer', 'client', 'member'])

const config = useRuntimeConfig()
const localePath = useLocalePath()
const route = useRoute()
const { t } = useI18n()
const feedback = useOpsFeedback()

const detail = ref<Record<string, unknown> | null>(null)
const memberData = ref<Record<string, unknown> | null>(null)
const pending = ref(true)
const memberPending = ref(false)
const busy = ref(false)
const errorMessage = ref('')
const memberError = ref('')
const reasonByLine = ref<Record<string, string>>({})
const doseByLine = ref<Record<string, string>>({})
const inlineErrorByLine = ref<Record<string, string>>({})

const catalog = ref<SellablePickRow[]>([])
const catalogPending = ref(false)
const catalogError = ref('')
const catalogById = computed(() => {
  const map = new Map<string, SellablePickRow>()
  for (const row of catalog.value) {
    map.set(row.id, row)
  }
  return map
})

const changeOpen = ref(false)
const changeMode = ref<ExpertCaseItemChangeMode>('swap')
const changePlanCode = ref('')
const changeOriginalSellableId = ref<string | null>(null)

const caseId = computed(() => String(route.params.id || ''))

const awaiting = computed(() => detail.value?.status === 'awaiting_review')
const packages = computed(() => {
  const snap = detail.value?.original_snapshot
  if (!isRecord(snap) || !Array.isArray(snap.packages)) {
    return [] as Record<string, unknown>[]
  }
  return snap.packages.filter(isRecord)
})

const revisedPackages = computed(() => {
  const snap = detail.value?.revised_snapshot
  if (!isRecord(snap) || !Array.isArray(snap.packages)) {
    return [] as Record<string, unknown>[]
  }
  return snap.packages.filter(isRecord)
})

const knowledge = computed(() => {
  const rows = detail.value?.knowledge
  if (!Array.isArray(rows)) {
    return [] as Record<string, unknown>[]
  }
  return rows.filter(isRecord)
})

const excludedRows = computed((): ExpertCaseExcludedRow[] => {
  return parseExcludedRows(detail.value?.original_snapshot).map((row) => {
    const hit = catalogById.value.get(row.sellable_item_id)
    return {
      ...row,
      name: row.name || hit?.name || null
    }
  })
})

const adjustments = computed((): ExpertCaseAdjustment[] => {
  return parseAdjustments(detail.value?.adjustments)
})

const weightRationales = computed(() => parsePackageRationales(detail.value?.original_snapshot))

const weightTopDomains = computed(() => {
  const snap = detail.value?.original_snapshot
  return isRecord(snap) ? parseTopDomains(snap.summary) : []
})

const weightContributionBlocks = computed(() => {
  return parseItemContributionBlocks(detail.value?.original_snapshot)
})

const workingByKey = computed(() => {
  const map = new Map<string, Record<string, unknown>>()
  const rows = detail.value?.working_decisions
  if (!Array.isArray(rows)) {
    return map
  }
  for (const row of rows) {
    if (isRecord(row) && typeof row.line_key === 'string') {
      map.set(row.line_key, row)
    }
  }
  return map
})

/** Right-hand scheme: immutable revised when reviewed; else original + working_decisions preview. */
const comparisonPackages = computed((): Record<string, unknown>[] => {
  if (revisedPackages.value.length) {
    return revisedPackages.value
  }
  return packages.value.map((pkg) => {
    const plan = planCode(pkg)
    const items: Record<string, unknown>[] = packageItems(pkg).map((item) => {
      const key = lineKey(plan, itemId(item))
      const row = workingByKey.value.get(key)
      if (!row) {
        return { ...item }
      }
      const decision = typeof row.decision === 'string' ? row.decision : ''
      const afterId = typeof row.sellable_item_after === 'string' ? row.sellable_item_after : ''
      const catalogHit = afterId ? catalogById.value.get(afterId) : undefined
      const doseAfter
        = typeof row.dose_after === 'number'
          ? row.dose_after
          : item.daily_dose
      const name
        = catalogHit?.name
          || (typeof item.name === 'string' ? item.name : undefined)
          || item.code
      return {
        ...item,
        name: afterId && afterId !== itemId(item) ? name : item.name,
        sellable_item_id: afterId || item.sellable_item_id,
        daily_dose: decision === 'adjust' ? doseAfter : item.daily_dose,
        removed: decision === 'reject' || row.removed === true,
        decision,
        display_reason: typeof row.reason === 'string' ? row.reason : undefined
      }
    })

    for (const [key, row] of workingByKey.value) {
      if (!key.startsWith(`${plan}:`) || row.is_new !== true) {
        continue
      }
      const afterId = typeof row.sellable_item_after === 'string' ? row.sellable_item_after : ''
      const catalogHit = afterId ? catalogById.value.get(afterId) : undefined
      items.push({
        sellable_item_id: afterId,
        name: catalogHit?.name || afterId,
        code: catalogHit?.code,
        daily_dose: typeof row.dose_after === 'number' ? row.dose_after : null,
        decision: typeof row.decision === 'string' ? row.decision : 'adjust',
        display_reason: typeof row.reason === 'string' ? row.reason : undefined,
        is_new: true
      })
    }

    return { ...pkg, items }
  })
})

const comparisonTitle = computed(() => {
  if (revisedPackages.value.length) {
    return t('expertCaseReviews.revised')
  }
  return t('expertCaseReviews.workingPreview')
})

const profileSnapshot = computed(() => {
  const profile = memberData.value?.profile
  if (!isRecord(profile)) {
    return null
  }
  return isRecord(profile.snapshot) ? profile.snapshot : null
})

const profileMissingReason = computed(() => {
  const profile = memberData.value?.profile
  if (!isRecord(profile)) {
    return null
  }
  return typeof profile.missing_reason === 'string' ? profile.missing_reason : null
})

const profileUpdate = computed(() => {
  const profile = memberData.value?.profile
  if (!isRecord(profile) || !isRecord(profile.update)) {
    return null
  }
  return profile.update
})

const hasProfileUpdates = computed(() => profileUpdate.value?.has_updates === true)

const changedFieldLabels = computed(() => {
  const fields = profileUpdate.value?.changed_fields
  if (!Array.isArray(fields)) {
    return [] as string[]
  }
  return fields
    .filter((field): field is string => typeof field === 'string' && field.length > 0)
    .map(field => profileFieldLabel(field))
})

const memberGoals = computed(() => {
  const goals = memberData.value?.goals
  if (!Array.isArray(goals)) {
    return [] as string[]
  }
  return goals.filter((goal): goal is string => typeof goal === 'string')
})

const memberMessages = computed(() => {
  const bag = memberData.value?.messages
  if (!isRecord(bag) || !Array.isArray(bag.messages)) {
    return [] as Record<string, unknown>[]
  }
  return bag.messages.filter(isRecord)
})

const messagesHasMore = computed(() => {
  const bag = memberData.value?.messages
  return isRecord(bag) && bag.has_more === true
})

const chatMessages = computed(() => memberMessages.value.map(toChatMessage))

const healthReport = computed(() => {
  const report = memberData.value?.health_report
  return isRecord(report) ? report : null
})

const healthReportResults = computed((): HealthReportResult[] => {
  const report = healthReport.value
  if (!report || !Array.isArray(report.results)) {
    return []
  }
  const out: HealthReportResult[] = []
  for (const row of report.results) {
    if (!isRecord(row) || typeof row.id !== 'string') {
      continue
    }
    out.push({
      id: row.id,
      biomarker_id: typeof row.biomarker_id === 'string' ? row.biomarker_id : null,
      raw_name: typeof row.raw_name === 'string' ? row.raw_name : null,
      raw_value: typeof row.raw_value === 'string' ? row.raw_value : null,
      raw_unit: typeof row.raw_unit === 'string' ? row.raw_unit : null,
      value_numeric: typeof row.value_numeric === 'number' ? row.value_numeric : null,
      unit: typeof row.unit === 'string' ? row.unit : null,
      ref_low: typeof row.ref_low === 'number' ? row.ref_low : null,
      ref_high: typeof row.ref_high === 'number' ? row.ref_high : null,
      borderline_low: typeof row.borderline_low === 'number' ? row.borderline_low : null,
      borderline_high: typeof row.borderline_high === 'number' ? row.borderline_high : null,
      critical_low: typeof row.critical_low === 'number' ? row.critical_low : null,
      critical_high: typeof row.critical_high === 'number' ? row.critical_high : null,
      confidence: typeof row.confidence === 'number' ? row.confidence : null,
      needs_review: row.needs_review === true,
      page: typeof row.page === 'number' ? row.page : null
    })
  }
  return out
})

const assistantMessage = {
  side: 'left' as const,
  variant: 'soft' as const
}
const userMessage = {
  side: 'right' as const,
  variant: 'solid' as const
}

onMounted(() => {
  void load()
  void loadCatalog()
})

async function load() {
  const token = readOperatorToken()
  if (!token || !caseId.value) {
    detail.value = null
    memberData.value = null
    errorMessage.value = t('expertCaseReviews.failed')
    pending.value = false
    return
  }
  pending.value = true
  errorMessage.value = ''
  try {
    detail.value = await adminGetExpertCaseReview(config.public.apiBase, token, caseId.value)
    void loadMemberData(token)
  } catch (error) {
    detail.value = null
    memberData.value = null
    errorMessage.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('expertCaseReviews.failed')
  } finally {
    pending.value = false
  }
}

async function loadMemberData(token: string) {
  memberPending.value = true
  memberError.value = ''
  try {
    memberData.value = await adminGetExpertCaseMemberData(
      config.public.apiBase,
      token,
      caseId.value
    )
  } catch (error) {
    memberData.value = null
    memberError.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('expertCaseReviews.memberDataFailed')
  } finally {
    memberPending.value = false
  }
}

async function loadCatalog() {
  const token = readOperatorToken()
  if (!token) {
    catalog.value = []
    catalogError.value = t('expertCaseReviews.pickerLoadFailed')
    return
  }
  catalogPending.value = true
  catalogError.value = ''
  try {
    const rows = await adminListSellableItems(config.public.apiBase, token)
    catalog.value = rows
      .map(row => parseSellablePickRow(row))
      .filter((row): row is SellablePickRow => row !== null)
  } catch (error) {
    catalog.value = []
    catalogError.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('expertCaseReviews.pickerLoadFailed')
  } finally {
    catalogPending.value = false
  }
}

function lineKey(planCodeValue: string, itemIdValue: string) {
  return `${planCodeValue}:orig:${itemIdValue}`
}

function itemId(item: Record<string, unknown>) {
  return typeof item.sellable_item_id === 'string' ? item.sellable_item_id : ''
}

function planCode(pkg: Record<string, unknown>) {
  return typeof pkg.package_plan_code === 'string' ? pkg.package_plan_code : ''
}

function packageItems(pkg: Record<string, unknown>) {
  const items = Array.isArray(pkg.items) ? pkg.items.filter(isRecord) : []
  return sortItemsByScoreNorm(items)
}

function ensureInlineReason(key: string): boolean {
  if (reasonIsFilled(reasonByLine.value[key])) {
    inlineErrorByLine.value[key] = ''
    return true
  }
  inlineErrorByLine.value[key] = t('expertCaseReviews.reasonRequiredAdminOnly')
  feedback.notify({
    title: t('expertCaseReviews.reasonRequiredAdminOnly'),
    color: 'error'
  })
  return false
}

async function decide(
  pkg: Record<string, unknown>,
  item: Record<string, unknown>,
  decision: 'approve' | 'reject' | 'adjust'
) {
  const token = readOperatorToken()
  if (!token || !awaiting.value) {
    return
  }
  const plan = planCode(pkg)
  const sellableId = itemId(item)
  const key = lineKey(plan, sellableId)

  if (decision === 'reject' || decision === 'adjust') {
    if (!ensureInlineReason(key)) {
      return
    }
  }

  let dose: number | null = null
  if (decision === 'adjust') {
    const catalogItem = catalogById.value.get(sellableId)
      ?? parseSellablePickRow({
        id: sellableId,
        sale_status: 'on_sale',
        daily_servings_min: null,
        daily_servings_max: null,
        daily_dose: item.daily_dose
      })
    const doseRaw = doseByLine.value[key]
    const fallback = doseRaw !== undefined && doseRaw !== ''
      ? doseRaw
      : String(item.daily_dose ?? catalogItem?.daily_dose ?? '')
    const doseCheck = validateDailyDose(fallback, catalogItem)
    if (!doseCheck.ok) {
      const message = doseCheck.code === 'below_min'
        ? t('expertCaseReviews.doseBelowMin', { min: doseCheck.min })
        : doseCheck.code === 'above_max'
          ? t('expertCaseReviews.doseAboveMax', { max: doseCheck.max })
          : t('expertCaseReviews.doseInvalid')
      inlineErrorByLine.value[key] = message
      feedback.notify({ title: message, color: 'error' })
      return
    }
    dose = doseCheck.dose
  }

  const reason = (reasonByLine.value[key] || '').trim()
  busy.value = true
  try {
    detail.value = await adminPatchExpertCaseReviewItem(config.public.apiBase, token, caseId.value, {
      package_plan_code: plan,
      sellable_item_id: sellableId,
      decision,
      reason: decision === 'approve' ? (reason || null) : reason,
      daily_dose: decision === 'adjust' ? dose : null,
      sellable_item_after: decision === 'adjust' ? sellableId : null
    })
    inlineErrorByLine.value[key] = ''
  } catch (error) {
    feedback.notify({
      title: error instanceof AdminApiError && error.message
        ? error.message
        : t('expertCaseReviews.failed'),
      color: 'error'
    })
  } finally {
    busy.value = false
  }
}

function openSwap(pkg: Record<string, unknown>, item: Record<string, unknown>) {
  changeMode.value = 'swap'
  changePlanCode.value = planCode(pkg)
  changeOriginalSellableId.value = itemId(item)
  const key = lineKey(changePlanCode.value, changeOriginalSellableId.value || '')
  // Seed dose field from line input if present; never from member profile.
  if (!doseByLine.value[key] && item.daily_dose != null) {
    doseByLine.value[key] = String(item.daily_dose)
  }
  changeOpen.value = true
}

function openAdd(pkg: Record<string, unknown>) {
  changeMode.value = 'add'
  changePlanCode.value = planCode(pkg)
  changeOriginalSellableId.value = null
  changeOpen.value = true
}

async function onChangeConfirm(payload: {
  sellableItemId: string
  dailyDose: number
  reason: string
}) {
  const token = readOperatorToken()
  if (!token || !awaiting.value || !changePlanCode.value) {
    return
  }
  busy.value = true
  try {
    if (changeMode.value === 'add') {
      detail.value = await adminPatchExpertCaseReviewItem(config.public.apiBase, token, caseId.value, {
        package_plan_code: changePlanCode.value,
        decision: 'adjust',
        is_new: true,
        sellable_item_id: null,
        sellable_item_after: payload.sellableItemId,
        daily_dose: payload.dailyDose,
        reason: payload.reason
      })
    } else {
      detail.value = await adminPatchExpertCaseReviewItem(config.public.apiBase, token, caseId.value, {
        package_plan_code: changePlanCode.value,
        decision: 'adjust',
        sellable_item_id: changeOriginalSellableId.value,
        sellable_item_after: payload.sellableItemId,
        daily_dose: payload.dailyDose,
        reason: payload.reason
      })
    }
    changeOpen.value = false
  } catch (error) {
    feedback.notify({
      title: error instanceof AdminApiError && error.message
        ? error.message
        : t('expertCaseReviews.failed'),
      color: 'error'
    })
  } finally {
    busy.value = false
  }
}

async function resetAll() {
  const token = readOperatorToken()
  if (!token || !awaiting.value) {
    return
  }
  busy.value = true
  try {
    detail.value = await adminResetExpertCaseReviewItems(config.public.apiBase, token, caseId.value)
    reasonByLine.value = {}
    doseByLine.value = {}
    inlineErrorByLine.value = {}
  } catch (error) {
    feedback.notify({
      title: error instanceof AdminApiError && error.message
        ? error.message
        : t('expertCaseReviews.failed'),
      color: 'error'
    })
  } finally {
    busy.value = false
  }
}

async function submit() {
  const token = readOperatorToken()
  if (!token || !awaiting.value) {
    return
  }
  busy.value = true
  try {
    detail.value = await adminSubmitExpertCaseReview(config.public.apiBase, token, caseId.value)
    feedback.notify({
      title: t('expertCaseReviews.submitOk'),
      color: 'success'
    })
  } catch (error) {
    feedback.notify({
      title: error instanceof AdminApiError && error.message
        ? error.message
        : t('expertCaseReviews.failed'),
      color: 'error'
    })
  } finally {
    busy.value = false
  }
}

async function confirmKnowledge(knowledgeId: string, classification: 'reusable' | 'personal_risk') {
  const token = readOperatorToken()
  if (!token) {
    return
  }
  busy.value = true
  try {
    detail.value = await adminConfirmExpertCaseReviewKnowledge(
      config.public.apiBase,
      token,
      caseId.value,
      knowledgeId,
      classification
    )
    feedback.notify({
      title: t('expertCaseReviews.classifyOk'),
      color: 'success'
    })
  } catch (error) {
    feedback.notify({
      title: error instanceof AdminApiError && error.message
        ? error.message
        : t('expertCaseReviews.failed'),
      color: 'error'
    })
  } finally {
    busy.value = false
  }
}

async function exportExcel() {
  const token = readOperatorToken()
  if (!token) {
    return
  }
  busy.value = true
  try {
    const { blob, filename } = await adminExportExpertCaseReview(
      config.public.apiBase,
      token,
      caseId.value
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    feedback.notify({
      title: error instanceof AdminApiError && error.message
        ? error.message
        : t('expertCaseReviews.failed'),
      color: 'error'
    })
  } finally {
    busy.value = false
  }
}

function decisionLabel(key: string) {
  const row = workingByKey.value.get(key)
  return typeof row?.decision === 'string' ? row.decision : ''
}

function seedDoseIfEmpty(pkg: Record<string, unknown>, item: Record<string, unknown>) {
  const key = lineKey(planCode(pkg), itemId(item))
  if (doseByLine.value[key] !== undefined) {
    return
  }
  const catalogItem = catalogById.value.get(itemId(item))
  if (item.daily_dose != null && item.daily_dose !== '') {
    doseByLine.value[key] = String(item.daily_dose)
    return
  }
  doseByLine.value[key] = defaultDoseForItem(catalogItem ?? null)
}

function adjustDose(pkg: Record<string, unknown>, item: Record<string, unknown>) {
  seedDoseIfEmpty(pkg, item)
  void decide(pkg, item, 'adjust')
}

function tierText(tier: unknown) {
  const key = tierLabelKey(tier)
  if (key === 'primary') {
    return t('expertCaseReviews.tierPrimary')
  }
  if (key === 'secondary') {
    return t('expertCaseReviews.tierSecondary')
  }
  return typeof tier === 'string' && tier ? tier : '—'
}

function excludedReasonText(reasonCode: string) {
  const parts = excludedReasonParts(reasonCode)
  if (parts.kind === 'dose_above_ul') {
    return t('expertCaseReviews.excludedReason.dose_above_ul')
  }
  if (parts.kind === 'interaction_exclude') {
    return t('expertCaseReviews.excludedReason.interaction_exclude')
  }
  if (parts.kind === 'diet_incompatible') {
    return t('expertCaseReviews.excludedReason.diet_incompatible')
  }
  if (parts.kind === 'contraindication') {
    if (parts.conditionCode) {
      return t('expertCaseReviews.excludedReason.contraindicationWithCondition', {
        condition: parts.conditionCode
      })
    }
    return t('expertCaseReviews.excludedReason.contraindication')
  }
  return t('expertCaseReviews.excludedReason.other', { code: parts.raw })
}

function profileFieldLabel(field: string) {
  const key = profileFieldLabelKey(field)
  if (key === 'unknown') {
    return t('expertCaseReviews.profileField.unknown', { field })
  }
  return t(`expertCaseReviews.profileField.${key}`)
}

function profileValueText(key: string, value: unknown): string {
  if (value == null || value === '') {
    return '—'
  }
  if (key === 'sex') {
    if (value === 'M') {
      return t('expertCaseReviews.sexMale')
    }
    if (value === 'F') {
      return t('expertCaseReviews.sexFemale')
    }
  }
  if (Array.isArray(value)) {
    return value.map(item => String(item)).join('、') || '—'
  }
  if (isRecord(value)) {
    try {
      return JSON.stringify(value)
    } catch {
      return '—'
    }
  }
  return String(value)
}

function profileEntries(snapshot: Record<string, unknown>) {
  const preferred = [
    'sex',
    'age_years',
    'height_cm',
    'weight_kg',
    'diet',
    'goals',
    'conditions',
    'intake'
  ]
  const entries: Array<{ key: string, label: string, value: string }> = []
  for (const key of preferred) {
    if (!(key in snapshot)) {
      continue
    }
    entries.push({
      key,
      label: profileFieldLabel(key),
      value: profileValueText(key, snapshot[key])
    })
  }
  return entries
}

function adjustmentTypeText(type: unknown) {
  const key = adjustmentTypeKey(type)
  if (key === 'unknown') {
    return t('expertCaseReviews.adjustmentType.unknown', {
      type: typeof type === 'string' ? type : '—'
    })
  }
  return t(`expertCaseReviews.adjustmentType.${key}`)
}

function formatDateTime(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }
  const time = Date.parse(value)
  if (Number.isNaN(time)) {
    return value
  }
  return new Date(time).toLocaleString()
}

function toChatMessage(row: Record<string, unknown>, index: number) {
  return {
    id: typeof row.id === 'string' ? row.id : `message-${index}`,
    role: isCustomerRole(row.role) ? 'user' : 'assistant',
    parts: [{ type: 'text', text: typeof row.content === 'string' ? row.content : '' }],
    metadata: {
      time: typeof row.seq === 'number' ? `#${row.seq}` : undefined
    }
  }
}

function isCustomerRole(value: unknown) {
  return typeof value === 'string' && CUSTOMER_ROLES.has(value)
}
</script>

<template>
  <PageHeader
    :title="$t('expertCaseReviews.detailTitle')"
    :description="caseId"
  >
    <div class="mb-4 flex flex-wrap gap-2">
      <UButton
        variant="outline"
        :to="localePath('/expert-case-reviews')"
      >
        {{ $t('expertCaseReviews.back') }}
      </UButton>
      <UButton
        variant="soft"
        :disabled="busy || pending"
        data-testid="expert-case-export"
        @click="exportExcel"
      >
        {{ $t('expertCaseReviews.export') }}
      </UButton>
      <UButton
        v-if="awaiting"
        variant="soft"
        color="neutral"
        :disabled="busy"
        data-testid="expert-case-reset"
        @click="resetAll"
      >
        {{ $t('expertCaseReviews.resetAll') }}
      </UButton>
      <UButton
        v-if="awaiting"
        color="primary"
        :disabled="busy"
        data-testid="expert-case-submit"
        @click="submit"
      >
        {{ $t('expertCaseReviews.submit') }}
      </UButton>
    </div>

    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('expertCaseReviews.loading') }}
    </p>
    <p
      v-else-if="errorMessage"
      class="text-sm text-error"
    >
      {{ errorMessage }}
    </p>

    <template v-else-if="detail">
      <div class="mb-4 flex flex-wrap gap-3 text-sm text-muted">
        <span>{{ $t('expertCaseReviews.colStatus') }}：{{ detail.status }}</span>
        <span>{{ $t('expertCaseReviews.colUser') }}：{{ detail.user_id }}</span>
        <span>{{ $t('expertCaseReviews.colConversation') }}：{{ detail.conversation_id }}</span>
      </div>

      <!-- Member data: conversation + profile + goal + report -->
      <section
        class="mb-8 space-y-4 rounded-xl border border-default bg-elevated p-4"
        data-testid="expert-case-member-data"
      >
        <h2 class="text-lg font-semibold text-highlighted">
          {{ $t('expertCaseReviews.memberDataTitle') }}
        </h2>
        <p
          v-if="memberPending"
          class="text-sm text-muted"
          data-testid="expert-case-member-loading"
        >
          {{ $t('expertCaseReviews.memberDataLoading') }}
        </p>
        <p
          v-else-if="memberError"
          class="text-sm text-error"
          data-testid="expert-case-member-error"
        >
          {{ memberError }}
        </p>
        <template v-else-if="memberData">
          <div
            v-if="hasProfileUpdates"
            class="rounded-lg border border-warning/40 bg-warning/10 px-3 py-3 text-sm"
            data-testid="expert-case-profile-updates"
          >
            <p class="font-medium text-highlighted">
              {{ $t('expertCaseReviews.profileUpdateBanner') }}
            </p>
            <p
              v-if="formatDateTime(profileUpdate?.updated_at)"
              class="mt-1 text-muted"
              data-testid="expert-case-profile-updated-at"
            >
              {{ $t('expertCaseReviews.profileUpdateAt', {
                time: formatDateTime(profileUpdate?.updated_at)
              }) }}
            </p>
            <p
              v-if="changedFieldLabels.length"
              class="mt-1 text-muted"
              data-testid="expert-case-profile-changed-fields"
            >
              {{ $t('expertCaseReviews.profileChangedFields', {
                fields: changedFieldLabels.join('、')
              }) }}
            </p>
          </div>

          <div data-testid="expert-case-profile">
            <h3 class="font-medium text-highlighted">
              {{ $t('expertCaseReviews.profileTitle') }}
            </h3>
            <p
              v-if="profileMissingReason === 'legacy_case_without_snapshot'"
              class="mt-2 text-sm text-muted"
            >
              {{ $t('expertCaseReviews.memberDataLegacySnapshot') }}
            </p>
            <dl
              v-else-if="profileSnapshot"
              class="mt-2 grid gap-2 sm:grid-cols-2"
            >
              <div
                v-for="entry in profileEntries(profileSnapshot)"
                :key="entry.key"
                class="rounded-lg bg-default/40 px-3 py-2 text-sm"
              >
                <dt class="text-xs text-muted">
                  {{ entry.label }}
                </dt>
                <dd class="mt-0.5 whitespace-pre-wrap break-words text-highlighted">
                  {{ entry.value }}
                </dd>
              </div>
            </dl>
          </div>

          <div data-testid="expert-case-goals">
            <h3 class="font-medium text-highlighted">
              {{ $t('expertCaseReviews.goalsTitle') }}
            </h3>
            <p class="mt-1 text-xs text-muted">
              {{ memberData.goals_source === 'conversation_fallback'
                ? $t('expertCaseReviews.goalsSourceConversation')
                : $t('expertCaseReviews.goalsSourceSnapshot') }}
            </p>
            <p
              v-if="!memberGoals.length"
              class="mt-2 text-sm text-muted"
            >
              {{ $t('expertCaseReviews.goalsEmpty') }}
            </p>
            <ul
              v-else
              class="mt-2 list-disc space-y-1 ps-5 text-sm"
            >
              <li
                v-for="goal in memberGoals"
                :key="goal"
              >
                {{ goal }}
              </li>
            </ul>
          </div>

          <div data-testid="expert-case-messages">
            <h3 class="font-medium text-highlighted">
              {{ $t('expertCaseReviews.messagesTitle') }}
            </h3>
            <p
              v-if="!chatMessages.length"
              class="mt-2 text-sm text-muted"
            >
              {{ $t('expertCaseReviews.messagesEmpty') }}
            </p>
            <div
              v-else
              class="mt-2 max-h-80 overflow-y-auto rounded-lg border border-default px-2"
            >
              <UChatMessages
                :messages="chatMessages"
                :assistant="assistantMessage"
                :user="userMessage"
                :auto-scroll="false"
                :should-scroll-to-bottom="false"
                class="py-4"
              />
            </div>
            <p
              v-if="messagesHasMore"
              class="mt-2 text-xs text-muted"
            >
              {{ $t('expertCaseReviews.messagesHasMore') }}
            </p>
          </div>

          <div data-testid="expert-case-report">
            <h3 class="font-medium text-highlighted">
              {{ $t('expertCaseReviews.reportTitle') }}
            </h3>
            <p
              v-if="!healthReport"
              class="mt-2 text-sm text-muted"
            >
              {{ $t('expertCaseReviews.reportEmpty') }}
            </p>
            <template v-else>
              <p class="mt-1 text-xs text-muted">
                {{ $t('expertCaseReviews.reportStatus', { status: healthReport.status }) }}
              </p>
              <div
                v-if="healthReportResults.length"
                class="mt-2 max-h-80 overflow-y-auto rounded-lg border border-default"
              >
                <ReportResultTable
                  :results="healthReportResults"
                  hide-scrollbar
                />
              </div>
            </template>
          </div>
        </template>
      </section>

      <!-- Dev-only engine background: numbers only visible when expanded -->
      <details
        class="mb-8 rounded-xl border border-default bg-elevated p-4"
        data-testid="expert-case-weight-background"
      >
        <summary
          class="cursor-pointer font-semibold text-highlighted"
          data-testid="expert-case-weight-background-summary"
        >
          {{ $t('expertCaseReviews.weightBackgroundTitle') }}
        </summary>
        <div
          class="mt-4 space-y-6 text-sm"
          data-testid="expert-case-weight-background-body"
        >
          <p class="text-xs text-muted">
            {{ $t('expertCaseReviews.weightBackgroundHint') }}
          </p>

          <div data-testid="expert-case-weight-rationale">
            <h3 class="font-medium text-highlighted">
              {{ $t('expertCaseReviews.weightRationaleTitle') }}
            </h3>
            <p
              v-if="!weightRationales.length"
              class="mt-2 text-muted"
            >
              {{ $t('expertCaseReviews.weightRationaleEmpty') }}
            </p>
            <div
              v-for="block in weightRationales"
              :key="block.package_plan_code"
              class="mt-3 rounded-lg border border-default p-3"
            >
              <p class="font-medium text-highlighted">
                {{ block.package_plan_name || block.package_plan_code }}
              </p>
              <p
                v-if="block.headline"
                class="mt-1 text-highlighted"
              >
                {{ block.headline }}
              </p>
              <template v-if="block.groups.length">
                <div
                  v-for="group in block.groups"
                  :key="group.key"
                  class="mt-2"
                >
                  <p class="text-sm font-medium text-highlighted">
                    {{ group.title }}
                  </p>
                  <ul class="mt-1 list-disc space-y-0.5 ps-5 text-muted">
                    <li
                      v-for="(line, lineIndex) in group.lines"
                      :key="`${group.key}-${lineIndex}`"
                    >
                      {{ line }}
                    </li>
                  </ul>
                </div>
              </template>
              <p
                v-else-if="block.body"
                class="mt-2 whitespace-pre-wrap text-muted"
              >
                {{ block.body }}
              </p>
            </div>
          </div>

          <div data-testid="expert-case-weight-top-domains">
            <h3 class="font-medium text-highlighted">
              {{ $t('expertCaseReviews.weightTopDomainsTitle') }}
            </h3>
            <p
              v-if="!weightTopDomains.length"
              class="mt-2 text-muted"
            >
              {{ $t('expertCaseReviews.weightTopDomainsEmpty') }}
            </p>
            <ul
              v-else
              class="mt-2 divide-y divide-default rounded-lg border border-default"
            >
              <li
                v-for="row in weightTopDomains"
                :key="row.domain_id"
                class="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2"
              >
                <span>{{ row.name || row.domain_id }}</span>
                <span
                  v-if="row.severity != null"
                  class="font-mono text-xs"
                  data-testid="expert-case-weight-severity"
                >
                  {{ $t('expertCaseReviews.weightTopDomainsSeverity') }}
                  {{ row.severity }}
                </span>
              </li>
            </ul>
          </div>

          <div data-testid="expert-case-weight-contributions">
            <h3 class="font-medium text-highlighted">
              {{ $t('expertCaseReviews.weightContributionsTitle') }}
            </h3>
            <p
              v-if="!weightContributionBlocks.length"
              class="mt-2 text-muted"
            >
              {{ $t('expertCaseReviews.weightContributionsEmpty') }}
            </p>
            <div
              v-for="block in weightContributionBlocks"
              :key="block.sellable_item_id || block.name || 'item'"
              class="mt-3 rounded-lg border border-default p-3"
            >
              <p class="font-medium text-highlighted">
                {{ block.name || block.sellable_item_id }}
              </p>
              <div
                v-for="(rows, contribIndex) in block.contributions"
                :key="`${block.sellable_item_id}-${contribIndex}`"
                class="mt-2 overflow-x-auto"
              >
                <table class="w-full min-w-[16rem] border-collapse text-xs">
                  <thead>
                    <tr class="border-b border-default text-left text-muted">
                      <th class="py-1 pe-3 font-medium">
                        {{ $t('expertCaseReviews.weightContributionKey') }}
                      </th>
                      <th class="py-1 font-medium">
                        {{ $t('expertCaseReviews.weightContributionValue') }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in rows"
                      :key="row.key"
                      class="border-b border-default/60"
                      data-testid="expert-case-weight-contribution-row"
                    >
                      <td class="py-1 pe-3 align-top font-mono text-muted">
                        {{ row.key }}
                      </td>
                      <td class="py-1 align-top whitespace-pre-wrap break-all font-mono">
                        {{ row.value }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </details>

      <!-- Left: original_snapshot · Right: revised_snapshot or working_decisions preview -->
      <section
        class="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2"
        data-testid="expert-case-scheme-compare"
      >
        <div class="min-w-0 rounded-xl border border-default bg-elevated p-4">
          <h2 class="text-lg font-semibold text-highlighted">
            {{ $t('expertCaseReviews.original') }}
          </h2>
          <p class="mt-1 text-xs text-muted">
            {{ $t('expertCaseReviews.originalHint') }}
          </p>
          <div
            v-if="!packages.length"
            class="mt-4 text-sm text-muted"
          >
            {{ $t('expertCaseReviews.noPackages') }}
          </div>
          <div
            v-for="pkg in packages"
            :key="planCode(pkg)"
            class="mt-4 border-t border-default pt-4 first:mt-4 first:border-t-0 first:pt-0"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="font-medium text-highlighted">
                {{ pkg.package_plan_name || planCode(pkg) }}
              </h3>
              <UButton
                v-if="awaiting"
                size="xs"
                variant="soft"
                color="primary"
                :disabled="busy"
                data-testid="expert-case-add-item"
                @click="openAdd(pkg)"
              >
                {{ $t('expertCaseReviews.addItem') }}
              </UButton>
            </div>
            <p
              v-if="!packageItems(pkg).length"
              class="mt-2 text-sm text-muted"
            >
              {{ $t('expertCaseReviews.noItems') }}
            </p>
            <ul
              v-else
              class="mt-3 divide-y divide-default"
            >
              <li
                v-for="item in packageItems(pkg)"
                :key="itemId(item)"
                class="py-3"
                :data-testid="`expert-case-item-${itemId(item)}`"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <p class="font-medium text-highlighted">
                      {{ item.name || item.code }}
                    </p>
                    <p
                      v-if="formatScoreNorm(item.score_norm) || item.tier"
                      class="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted"
                      data-testid="expert-case-item-score-line"
                    >
                      <span
                        v-if="formatScoreNorm(item.score_norm)"
                        class="cursor-help underline decoration-dotted underline-offset-2"
                        :title="$t('expertCaseReviews.scoreTooltip')"
                        data-testid="expert-case-item-score"
                      >
                        {{ formatScoreNorm(item.score_norm) }}
                      </span>
                      <span
                        v-if="formatScoreNorm(item.score_norm) && item.tier"
                        aria-hidden="true"
                      >｜</span>
                      <span
                        v-if="item.tier"
                        data-testid="expert-case-item-tier"
                      >
                        {{ tierText(item.tier) }}
                      </span>
                    </p>
                    <p
                      v-if="itemRationaleText(item.item_rationale)"
                      class="mt-1 text-sm text-muted"
                      data-testid="expert-case-item-rationale"
                    >
                      {{ itemRationaleText(item.item_rationale) }}
                    </p>
                    <p class="mt-1 text-xs text-muted">
                      <span>
                        {{ $t('expertCaseReviews.dose') }}：{{ item.daily_dose }}
                      </span>
                      <span
                        v-if="decisionLabel(lineKey(planCode(pkg), itemId(item)))"
                        class="ms-2"
                      >
                        · {{ decisionLabel(lineKey(planCode(pkg), itemId(item))) }}
                      </span>
                    </p>
                  </div>
                  <div
                    v-if="awaiting"
                    class="flex flex-wrap gap-2"
                  >
                    <UButton
                      size="xs"
                      variant="soft"
                      :disabled="busy"
                      data-testid="expert-case-approve"
                      @click="decide(pkg, item, 'approve')"
                    >
                      {{ $t('expertCaseReviews.approve') }}
                    </UButton>
                    <UButton
                      size="xs"
                      color="error"
                      variant="soft"
                      :disabled="busy"
                      data-testid="expert-case-reject"
                      @click="decide(pkg, item, 'reject')"
                    >
                      {{ $t('expertCaseReviews.reject') }}
                    </UButton>
                    <UButton
                      size="xs"
                      color="warning"
                      variant="soft"
                      :disabled="busy"
                      data-testid="expert-case-adjust-dose"
                      @click="adjustDose(pkg, item)"
                    >
                      {{ $t('expertCaseReviews.adjust') }}
                    </UButton>
                    <UButton
                      size="xs"
                      color="primary"
                      variant="soft"
                      :disabled="busy"
                      data-testid="expert-case-swap"
                      @click="openSwap(pkg, item)"
                    >
                      {{ $t('expertCaseReviews.swapItem') }}
                    </UButton>
                  </div>
                </div>
                <div
                  v-if="awaiting"
                  class="mt-2 grid gap-2 sm:grid-cols-2"
                >
                  <div>
                    <UInput
                      v-model="reasonByLine[lineKey(planCode(pkg), itemId(item))]"
                      :placeholder="$t('expertCaseReviews.reason')"
                      size="sm"
                      data-testid="expert-case-inline-reason"
                    />
                    <p
                      class="mt-1 text-xs text-muted"
                      data-testid="expert-case-inline-reason-hint"
                    >
                      {{ $t('expertCaseReviews.reasonAdminOnlyHint') }}
                    </p>
                  </div>
                  <UInput
                    v-model="doseByLine[lineKey(planCode(pkg), itemId(item))]"
                    :placeholder="String(item.daily_dose ?? '')"
                    size="sm"
                    type="number"
                    step="0.1"
                    data-testid="expert-case-inline-dose"
                  />
                </div>
                <p
                  v-if="inlineErrorByLine[lineKey(planCode(pkg), itemId(item))]"
                  class="mt-2 text-sm text-error"
                  data-testid="expert-case-inline-error"
                >
                  {{ inlineErrorByLine[lineKey(planCode(pkg), itemId(item))] }}
                </p>
              </li>
            </ul>
          </div>
        </div>

        <div class="min-w-0 rounded-xl border border-default bg-elevated p-4">
          <h2 class="text-lg font-semibold text-highlighted">
            {{ comparisonTitle }}
          </h2>
          <p class="mt-1 text-xs text-muted">
            {{ revisedPackages.length
              ? $t('expertCaseReviews.revisedHint')
              : $t('expertCaseReviews.workingPreviewHint') }}
          </p>
          <div
            v-if="!comparisonPackages.length"
            class="mt-4 text-sm text-muted"
          >
            {{ $t('expertCaseReviews.noPackages') }}
          </div>
          <div
            v-for="pkg in comparisonPackages"
            :key="`cmp-${planCode(pkg)}`"
            class="mt-4 border-t border-default pt-4 first:mt-4 first:border-t-0 first:pt-0"
          >
            <h3 class="font-medium text-highlighted">
              {{ pkg.package_plan_name || planCode(pkg) }}
            </h3>
            <p
              v-if="pkg.composition_hash"
              class="mt-1 text-xs text-muted"
            >
              hash：{{ pkg.composition_hash }}
            </p>
            <p
              v-if="!packageItems(pkg).length"
              class="mt-2 text-sm text-muted"
            >
              {{ $t('expertCaseReviews.noItems') }}
            </p>
            <ul
              v-else
              class="mt-3 space-y-2 text-sm"
            >
              <li
                v-for="item in packageItems(pkg)"
                :key="`cmp-item-${itemId(item)}-${item.is_new ? 'new' : 'orig'}`"
              >
                <span :class="{ 'line-through text-muted': item.removed === true }">
                  {{ item.name || item.code }} · {{ item.daily_dose }}
                </span>
                <span
                  v-if="item.is_new"
                  class="ms-2 text-xs text-primary"
                >
                  · {{ $t('expertCaseReviews.addedBadge') }}
                </span>
                <span
                  v-if="item.decision && !revisedPackages.length"
                  class="ms-2 text-xs text-muted"
                >
                  · {{ item.decision }}
                </span>
                <span
                  v-if="item.display_reason"
                  class="ms-2 text-muted"
                >
                  — {{ item.display_reason }}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section
        class="mb-8 rounded-xl border border-default bg-elevated p-4"
        data-testid="expert-case-excluded"
      >
        <h2 class="text-lg font-semibold text-highlighted">
          {{ $t('expertCaseReviews.excludedTitle') }}
        </h2>
        <p
          v-if="!excludedRows.length"
          class="mt-3 text-sm text-muted"
        >
          {{ $t('expertCaseReviews.excludedEmpty') }}
        </p>
        <ul
          v-else
          class="mt-3 divide-y divide-default"
        >
          <li
            v-for="row in excludedRows"
            :key="row.sellable_item_id"
            class="py-3 text-sm"
            :data-testid="`expert-case-excluded-${row.sellable_item_id}`"
          >
            <p class="font-medium text-highlighted">
              {{ row.name || catalogById.get(row.sellable_item_id)?.name || row.sellable_item_id }}
            </p>
            <p
              class="mt-1 text-muted"
              data-testid="expert-case-excluded-reason"
            >
              {{ excludedReasonText(row.reason_code) }}
            </p>
          </li>
        </ul>
      </section>

      <section
        class="mb-8 rounded-xl border border-default bg-elevated p-4"
        data-testid="expert-case-adjustments"
      >
        <h2 class="text-lg font-semibold text-highlighted">
          {{ $t('expertCaseReviews.adjustmentsTitle') }}
        </h2>
        <p class="mt-1 text-xs text-muted">
          {{ $t('expertCaseReviews.adjustmentsMemberFacingHint') }}
        </p>
        <p class="mt-1 text-xs text-muted">
          {{ $t('expertCaseReviews.adjustmentsAdminOnlyHint') }}
        </p>
        <p
          v-if="!adjustments.length"
          class="mt-3 text-sm text-muted"
        >
          {{ $t('expertCaseReviews.adjustmentsEmpty') }}
        </p>
        <ul
          v-else
          class="mt-3 space-y-3"
        >
          <li
            v-for="(row, index) in adjustments"
            :key="`${row.type}-${row.package_plan_code}-${index}`"
            class="rounded-lg border border-default p-3 text-sm"
            :data-testid="`expert-case-adjustment-${row.type}-${index}`"
          >
            <p class="font-medium text-highlighted">
              {{ adjustmentTypeText(row.type) }}
              · {{ row.package_plan_code }}
            </p>
            <p class="mt-1 text-muted">
              {{ $t('expertCaseReviews.adjustmentOriginal') }}：
              {{ row.original_item
                ? `${row.original_item.name}${row.original_item.daily_dose != null ? ` · ${row.original_item.daily_dose}` : ''}`
                : $t('expertCaseReviews.adjustmentNone') }}
            </p>
            <p class="mt-1 text-muted">
              {{ $t('expertCaseReviews.adjustmentNew') }}：
              {{ row.new_item
                ? `${row.new_item.name}${row.new_item.daily_dose != null ? ` · ${row.new_item.daily_dose}` : ''}`
                : $t('expertCaseReviews.adjustmentNone') }}
            </p>
            <p
              v-if="row.reason"
              class="mt-2"
              data-testid="expert-case-adjustment-reason"
            >
              <span class="text-xs text-muted">
                {{ adjustmentReasonIsMemberFacing(row.type)
                  ? $t('expertCaseReviews.adjustmentReasonMember')
                  : $t('expertCaseReviews.adjustmentReasonAdmin') }}：
              </span>
              {{ row.reason }}
            </p>
            <p class="mt-2 text-xs text-muted">
              {{ $t('expertCaseReviews.adjustmentOperator') }}：
              {{ row.operator_display_name || row.operator_role || $t('expertCaseReviews.adjustmentNone') }}
              <span v-if="row.operator_role && row.operator_display_name">
                （{{ row.operator_role }}）
              </span>
              <span
                v-if="formatDateTime(row.adjusted_at)"
                class="ms-2"
              >
                · {{ $t('expertCaseReviews.adjustmentAt') }}：{{ formatDateTime(row.adjusted_at) }}
              </span>
            </p>
          </li>
        </ul>
      </section>

      <section
        v-if="knowledge.length"
        class="space-y-4"
      >
        <h2 class="text-lg font-semibold text-highlighted">
          {{ $t('expertCaseReviews.knowledge') }}
        </h2>
        <div
          v-for="row in knowledge"
          :key="String(row.id)"
          class="rounded-xl border border-default p-4 text-sm"
        >
          <p class="font-medium">
            {{ row.decision }} · {{ row.package_plan_code }}
          </p>
          <p class="mt-1 text-muted">
            {{ row.reason || '—' }}
          </p>
          <p class="mt-1 text-xs text-muted">
            {{ row.classification_confirmed
              ? row.classification
              : $t('expertCaseReviews.pendingClassification') }}
          </p>
          <div
            v-if="!row.classification_confirmed"
            class="mt-3 flex flex-wrap gap-2"
          >
            <UButton
              size="xs"
              variant="soft"
              :disabled="busy"
              @click="confirmKnowledge(String(row.id), 'reusable')"
            >
              {{ $t('expertCaseReviews.classifyReusable') }}
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              :disabled="busy"
              @click="confirmKnowledge(String(row.id), 'personal_risk')"
            >
              {{ $t('expertCaseReviews.classifyPersonal') }}
            </UButton>
          </div>
        </div>
      </section>
    </template>

    <ExpertCaseItemChangeModal
      v-model:open="changeOpen"
      :mode="changeMode"
      :items="catalog"
      :catalog-pending="catalogPending"
      :catalog-error="catalogError"
      :busy="busy"
      :initial-sellable-id="changeOriginalSellableId"
      @confirm="onChangeConfirm"
    />
  </PageHeader>
</template>
