<script setup lang="ts">
import {
  AdminApiError,
  adminExportExpertCaseReview,
  adminGetExpertCaseMemberData,
  adminGetExpertCaseReview,
  adminGetOrder,
  adminListSellableItems,
  adminPatchExpertCaseReviewItem,
  adminResetExpertCaseReviewItems,
  adminSubmitExpertCaseReview,
  isExpertCaseAlreadyFinalizedError
} from '~/utils/admin-api'
import { money } from '~/utils/format'
import { readFinalizeCopyFromDetail } from '~/utils/expert-finalize-copy'
import { formatLocalDateTime } from '~/utils/format-local-datetime'
import {
  adjustmentReasonIsMemberFacing,
  excludedReasonParts,
  formatScoreNorm,
  isRecord,
  parseAdjustments,
  parseExcludedRows,
  parseItemContributionBlocks,
  parsePackageRationales,
  parseTopDomains,
  sortItemsByScoreNorm,
  tierLabelKey,
  type ExpertCaseAdjustment,
  type ExpertCaseExcludedRow
} from '~/utils/expert-case-display'
import {
  adjustmentTypeDisplayLabel,
  caseStatusLabel,
  classificationLabel,
  conditionLabel,
  decisionLabel as mapDecisionLabel,
  displayNameOrUntitled,
  itemDisplayName,
  operatorRoleLabel,
  packagePlanCodeLabel,
  profileFieldDisplayLabel,
  reportResultStatusLabel,
  resolveExpertProfileSections,
  tierDisplayLabel,
  type ExpertProfileSectionView,
  type LabeledText
} from '~/utils/expert-case-labels'
import {
  ceilCapsuleDose,
  defaultCapsuleDoseForItem,
  formatCapsuleDoseDisplay,
  hasFinalizeCopyContent,
  isCapsuleDoseHidden,
  itemSpecText,
  productNameWithoutGluedDose,
  resolveLineDecision,
  validateCapsuleDose,
  type ExpertLineDecision
} from '~/utils/expert-case-dose'
import {
  parseSellablePickRow,
  reasonIsFilled,
  type ExpertCaseItemChangeMode,
  type SellablePickRow
} from '~/utils/expert-case-sellable'
import { expertCaseMemberName, shortExpertCaseId } from '~/utils/expert-case-list-display'
import { expertCaseMissingSignals } from '~/utils/expert-case-missing-signals'
import { normalizeAdminPath } from '~/utils/nav'
import { readOperatorToken } from '~/utils/operator-session'
import {
  mapHealthReportResultRow,
  type HealthReportResult
} from '~/utils/report-result-status'

const CUSTOMER_ROLES = new Set(['user', 'customer', 'client', 'member'])

const config = useRuntimeConfig()
const route = useRoute()
const { t } = useI18n()
const feedback = useOpsFeedback()
const crumbLabel = useExpertCaseCrumbLabel()

const detail = ref<Record<string, unknown> | null>(null)
const memberData = ref<Record<string, unknown> | null>(null)
const linkedOrder = ref<Record<string, unknown> | null>(null)
const pending = ref(true)
const memberPending = ref(false)
const busy = ref(false)
const errorMessage = ref('')
const memberError = ref('')
const reasonByLine = ref<Record<string, string>>({})
const doseByLine = ref<Record<string, string>>({})
/** Optimistic UI decision — set on click so「調劑量」expands stepper before PATCH. */
const decisionByLine = ref<Record<string, ExpertLineDecision>>({})
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

const editOpen = ref(false)
const editPkg = ref<Record<string, unknown> | null>(null)
const editItem = ref<Record<string, unknown> | null>(null)

const weightBackgroundOpen = ref(false)
const weightBackgroundPlanCode = ref('')
const profileUpdateOpen = ref(false)

const finalizeReportHighlights = ref('')
const finalizeExpertOpinion = ref('')
const finalizeGenerating = ref(false)
const submitConfirmOpen = ref(false)
const alreadyReviewedAlert = ref(false)

const caseId = computed(() => String(route.params.id || ''))

const awaiting = computed(() => detail.value?.status === 'awaiting_review')
const reviewed = computed(() => detail.value?.status === 'reviewed')

const linkedOrderId = computed(() => {
  const value = detail.value?.order_id
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
})

const isExpertPlanCase = computed(() => Boolean(linkedOrderId.value))

/** 開案金額：專家方案案總價固定等於此金額，不隨品項變動。 */
const openingAmount = computed(() => {
  const fromOrder = numberOf(linkedOrder.value?.amount_total)
  if (fromOrder != null) {
    return fromOrder
  }
  return numberOf(detail.value?.opening_amount)
    ?? numberOf(detail.value?.expert_plan_price)
    ?? numberOf(detail.value?.amount_total)
})

const openingAmountText = computed(() => {
  return openingAmount.value == null ? '' : money(openingAmount.value)
})

function syncFinalizeCopyFromDetail(row: Record<string, unknown> | null) {
  const copy = readFinalizeCopyFromDetail(row)
  if (!copy) {
    if (row?.status === 'awaiting_review') {
      finalizeReportHighlights.value = ''
      finalizeExpertOpinion.value = ''
    }
    return
  }
  finalizeReportHighlights.value = copy.report_highlights
  finalizeExpertOpinion.value = copy.expert_opinion
}

const memberLabel = computed(() => {
  if (detail.value) {
    const fromDetail = expertCaseMemberName(detail.value)
    if (fromDetail && fromDetail !== '—') {
      return fromDetail
    }
  }
  const profile = memberData.value?.profile
  if (isRecord(profile)) {
    const fromProfile = expertCaseMemberName(profile)
    if (fromProfile && fromProfile !== '—') {
      return fromProfile
    }
    if (isRecord(profile.snapshot)) {
      const fromSnap = expertCaseMemberName(profile.snapshot)
      if (fromSnap && fromSnap !== '—') {
        return fromSnap
      }
    }
  }
  const userId = typeof detail.value?.user_id === 'string' ? detail.value.user_id : ''
  return userId ? shortExpertCaseId(userId) : caseId.value
})

const statusChip = computed(() => caseStatusLabel(detail.value?.status, t))

const statusChipLabel = computed(() => {
  const chip = statusChip.value
  return chip.text === '—' ? '' : chip.text
})

const statusChipTitle = computed(() => statusChip.value.title)

const statusChipColor = computed((): 'success' | 'warning' | 'neutral' => {
  if (reviewed.value) {
    return 'success'
  }
  if (awaiting.value) {
    return 'warning'
  }
  return 'neutral'
})

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

const weightBackgroundPlanLabel = computed((): LabeledText => {
  const code = weightBackgroundPlanCode.value
  const pkg = packages.value.find(row => planCode(row) === code)
  if (pkg) {
    return planDisplay(pkg)
  }
  return planCodeDisplay(code)
})

const weightBackgroundRationales = computed(() => {
  const code = weightBackgroundPlanCode.value
  return weightRationales.value.filter(block => block.package_plan_code === code)
})

const weightBackgroundContributions = computed(() => {
  const code = weightBackgroundPlanCode.value
  return weightContributionBlocks.value.filter(block => block.package_plan_code === code)
})

function openWeightBackground(pkg: Record<string, unknown>) {
  weightBackgroundPlanCode.value = planCode(pkg)
  weightBackgroundOpen.value = true
}

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

watch(workingByKey, (map) => {
  for (const [key, row] of map) {
    const decision = resolveLineDecision(decisionByLine.value[key], row.decision as string)
    if (decision !== 'adjust') {
      continue
    }
    if (doseByLine.value[key] !== undefined && doseByLine.value[key] !== '') {
      continue
    }
    if (typeof row.dose_after === 'number') {
      doseByLine.value[key] = String(ceilCapsuleDose(row.dose_after) ?? 1)
    }
  }
}, { immediate: true })

const hasFinalizeCopy = computed(() => {
  return hasFinalizeCopyContent(
    finalizeReportHighlights.value,
    finalizeExpertOpinion.value
  )
})

function collectAdjustLineKeys(): string[] {
  const keys = new Set<string>()
  for (const [key, row] of workingByKey.value) {
    if (resolveLineDecision(decisionByLine.value[key], row.decision as string) === 'adjust') {
      keys.add(key)
    }
  }
  for (const [key, decision] of Object.entries(decisionByLine.value)) {
    if (decision === 'adjust') {
      keys.add(key)
    }
  }
  return [...keys]
}

/** Any「調劑量」列的顆數未通過整數驗證 → 擋送出（無 top banner）。 */
const doseBlocksSubmit = computed(() => {
  if (!awaiting.value) {
    return false
  }
  for (const key of collectAdjustLineKeys()) {
    const row = workingByKey.value.get(key)
    const raw = doseByLine.value[key]
    const fallback
      = raw !== undefined && raw !== ''
        ? raw
        : (typeof row?.dose_after === 'number'
            ? String(ceilCapsuleDose(row.dose_after) ?? '')
            : '')
    if (!validateCapsuleDose(fallback).ok) {
      return true
    }
  }
  return Object.values(inlineErrorByLine.value).some((msg) => {
    return Boolean(msg) && msg === t('expertCaseReviews.doseInvalid')
  })
})

const canSubmitFinalize = computed(() => {
  return awaiting.value
    && !busy.value
    && !finalizeGenerating.value
    && hasFinalizeCopy.value
    && !doseBlocksSubmit.value
})

const submitBlockHint = computed(() => {
  if (!awaiting.value) {
    return ''
  }
  if (doseBlocksSubmit.value) {
    return t('expertCaseReviews.submitDoseBlocked')
  }
  if (!hasFinalizeCopy.value) {
    return t('expertCaseReviews.submitNeedsCopy')
  }
  return ''
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
      const localDecision = decisionByLine.value[key]
      if (!row && !localDecision) {
        return { ...item }
      }
      const serverDecision = typeof row?.decision === 'string' ? row.decision : ''
      const decision = resolveLineDecision(localDecision, serverDecision)
      const afterId = typeof row?.sellable_item_after === 'string' ? row.sellable_item_after : ''
      const catalogHit = afterId ? catalogById.value.get(afterId) : undefined
      const localDose = doseByLine.value[key]
      const doseAfter
        = localDose !== undefined && localDose !== '' && validateCapsuleDose(localDose).ok
          ? Number(localDose)
          : (typeof row?.dose_after === 'number'
              ? row.dose_after
              : item.daily_dose)
      const name
        = catalogHit?.name
          || (typeof item.name === 'string' ? item.name : undefined)
          || item.code
      return {
        ...item,
        name: afterId && afterId !== itemId(item) ? name : item.name,
        sellable_item_id: afterId || item.sellable_item_id,
        daily_dose: decision === 'adjust' ? doseAfter : item.daily_dose,
        removed: decision === 'reject' || row?.removed === true,
        decision: decision || serverDecision,
        display_reason: typeof row?.reason === 'string' ? row.reason : undefined
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

const memberProfile = computed(() => {
  const profile = memberData.value?.profile
  return isRecord(profile) ? profile : null
})

const profileSnapshot = computed(() => {
  const profile = memberProfile.value
  if (!profile) {
    return null
  }
  return isRecord(profile.snapshot) ? profile.snapshot : null
})

const profileSections = computed((): ExpertProfileSectionView[] => {
  const profile = memberProfile.value
  if (!profile) {
    return []
  }
  return resolveExpertProfileSections(profile, t)
})

const profileMissingReason = computed(() => {
  const profile = memberProfile.value
  if (!profile) {
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

/** Soft chips only — never gate generate / submit. */
const missingSignals = computed(() => {
  if (memberPending.value || memberError.value) {
    return null
  }
  return expertCaseMissingSignals(memberData.value)
})

const missingGoals = computed(() => missingSignals.value?.missingGoals === true)
const missingReport = computed(() => missingSignals.value?.missingReport === true)

const healthReportStatus = computed(() => {
  return reportResultStatusLabel(healthReport.value?.status, t)
})

const healthReportResults = computed((): HealthReportResult[] => {
  const report = healthReport.value
  if (!report || !Array.isArray(report.results)) {
    return []
  }
  const out: HealthReportResult[] = []
  for (const row of report.results) {
    if (!isRecord(row)) {
      continue
    }
    const mapped = mapHealthReportResultRow(row)
    if (mapped) {
      out.push(mapped)
    }
  }
  return out
})

const assistantMessage = {
  side: 'left' as const,
  color: 'neutral' as const,
  variant: 'subtle' as const
}
const userMessage = {
  side: 'right' as const,
  color: 'neutral' as const,
  variant: 'solid' as const
}

watch(memberLabel, (label) => {
  if (label) {
    crumbLabel.value = label
  }
}, { immediate: true })

onMounted(() => {
  void load()
  void loadCatalog()
})

onUnmounted(() => {
  if (!normalizeAdminPath(route.path).startsWith('/expert-case-reviews/')) {
    crumbLabel.value = null
  }
})

async function load() {
  const token = readOperatorToken()
  crumbLabel.value = null
  reasonByLine.value = {}
  doseByLine.value = {}
  decisionByLine.value = {}
  inlineErrorByLine.value = {}
  if (!token || !caseId.value) {
    detail.value = null
    memberData.value = null
    linkedOrder.value = null
    errorMessage.value = t('expertCaseReviews.failed')
    pending.value = false
    return
  }
  pending.value = true
  errorMessage.value = ''
  linkedOrder.value = null
  try {
    detail.value = await adminGetExpertCaseReview(config.public.apiBase, token, caseId.value)
    syncFinalizeCopyFromDetail(detail.value)
    crumbLabel.value = memberLabel.value
    void loadMemberData(token)
    void loadLinkedOrder(token, detail.value)
  } catch (error) {
    detail.value = null
    memberData.value = null
    linkedOrder.value = null
    finalizeReportHighlights.value = ''
    finalizeExpertOpinion.value = ''
    errorMessage.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('expertCaseReviews.failed')
  } finally {
    pending.value = false
  }
}

async function loadLinkedOrder(token: string, row: Record<string, unknown> | null) {
  const orderId = typeof row?.order_id === 'string' ? row.order_id.trim() : ''
  if (!orderId) {
    linkedOrder.value = null
    return
  }
  try {
    linkedOrder.value = await adminGetOrder(config.public.apiBase, token, orderId)
  } catch {
    linkedOrder.value = null
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

  // Flip UI immediately (stepper／readonly／removed) before reason／PATCH gates.
  decisionByLine.value[key] = decision

  if (decision === 'adjust') {
    seedDoseIfEmpty(pkg, item)
  } else if (inlineErrorByLine.value[key] === t('expertCaseReviews.doseInvalid')) {
    // Keep／remove: clear dose field errors (dose row is readonly or hidden).
    inlineErrorByLine.value[key] = ''
  }

  if (decision === 'reject' || decision === 'adjust') {
    if (!ensureInlineReason(key)) {
      return
    }
  }

  let dose: number | null = null
  if (decision === 'adjust') {
    const catalogItem = catalogById.value.get(sellableId)
    const doseRaw = doseByLine.value[key]
    const fallback = doseRaw !== undefined && doseRaw !== ''
      ? doseRaw
      : defaultCapsuleDoseForItem(
          catalogItem ?? {
            daily_dose: typeof item.daily_dose === 'number' ? item.daily_dose : null
          }
        )
    const doseCheck = validateCapsuleDose(fallback)
    if (!doseCheck.ok) {
      // Inline only — no top banner / toast for dose validation.
      inlineErrorByLine.value[key] = t('expertCaseReviews.doseInvalid')
      doseByLine.value[key] = String(fallback)
      return
    }
    doseByLine.value[key] = String(doseCheck.dose)
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
    if (inlineErrorByLine.value[key] !== t('expertCaseReviews.doseInvalid')) {
      inlineErrorByLine.value[key] = ''
    }
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
  // Seed capsule dose (ceil); never from member profile.
  if (doseByLine.value[key] === undefined) {
    const catalogItem = catalogById.value.get(itemId(item))
    doseByLine.value[key] = defaultCapsuleDoseForItem(
      catalogItem ?? {
        daily_dose: typeof item.daily_dose === 'number' ? item.daily_dose : null
      }
    )
  }
  changeOpen.value = true
}

function openEdit(pkg: Record<string, unknown>, item: Record<string, unknown>) {
  seedDoseIfEmpty(pkg, item)
  editPkg.value = pkg
  editItem.value = item
  editOpen.value = true
}

function editLineKey() {
  if (!editPkg.value || !editItem.value) {
    return ''
  }
  return lineKey(planCode(editPkg.value), itemId(editItem.value))
}

async function onEditApply(payload: {
  decision: ExpertLineDecision
  reason: string
  dailyDose: number | null
}) {
  if (!editPkg.value || !editItem.value) {
    return
  }
  const key = editLineKey()
  reasonByLine.value[key] = payload.reason
  if (payload.decision === 'adjust' && payload.dailyDose != null) {
    doseByLine.value[key] = String(payload.dailyDose)
  }
  await decide(editPkg.value, editItem.value, payload.decision)
  if (!inlineErrorByLine.value[key]) {
    editOpen.value = false
  }
}

function onEditRequestSwap() {
  if (!editPkg.value || !editItem.value) {
    return
  }
  const pkg = editPkg.value
  const item = editItem.value
  editOpen.value = false
  openSwap(pkg, item)
}

const comparisonByPlan = computed(() => {
  const map = new Map<string, Record<string, unknown>>()
  for (const pkg of comparisonPackages.value) {
    map.set(planCode(pkg), pkg)
  }
  return map
})

function comparisonPackageFor(plan: string): Record<string, unknown> | null {
  return comparisonByPlan.value.get(plan) ?? null
}

const editItemTitle = computed(() => editItem.value ? itemTitle(editItem.value) : '')
const editSuggestionText = computed(() => editItem.value ? suggestionLineText(editItem.value) : '')
const editScoreText = computed(() => {
  if (!editItem.value) {
    return ''
  }
  return formatScoreNorm(editItem.value.score_norm) || ''
})
const editInitialDecision = computed((): ExpertLineDecision | '' => {
  if (!editPkg.value || !editItem.value) {
    return ''
  }
  return lineDecision(planCode(editPkg.value), itemId(editItem.value))
})
const editInitialReason = computed(() => reasonByLine.value[editLineKey()] || '')
const editInitialDose = computed(() => {
  const key = editLineKey()
  if (doseByLine.value[key]) {
    return doseByLine.value[key]!
  }
  return editItem.value ? suggestedCapsuleCount(editItem.value) : '1'
})
const editSuggestedCount = computed(() => {
  return editItem.value ? suggestedCapsuleCount(editItem.value) : '1'
})

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
    decisionByLine.value = {}
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

function askSubmit() {
  if (!canSubmitFinalize.value) {
    return
  }
  alreadyReviewedAlert.value = false
  submitConfirmOpen.value = true
}

async function submit() {
  const token = readOperatorToken()
  if (!token || !canSubmitFinalize.value) {
    return
  }
  submitConfirmOpen.value = false
  busy.value = true
  alreadyReviewedAlert.value = false
  try {
    const submitPayload: {
      report_highlights?: string
      expert_opinion?: string
    } = {}
    if (hasFinalizeCopy.value) {
      submitPayload.report_highlights = finalizeReportHighlights.value
      submitPayload.expert_opinion = finalizeExpertOpinion.value
    }
    detail.value = await adminSubmitExpertCaseReview(
      config.public.apiBase,
      token,
      caseId.value,
      submitPayload
    )
    syncFinalizeCopyFromDetail(detail.value)
    feedback.notify({
      title: t('expertCaseReviews.submitOk'),
      color: 'success'
    })
  } catch (error) {
    // 定稿送出不自動理貨（core #143）；僅更新案件狀態。
    if (isExpertCaseAlreadyFinalizedError(error)) {
      alreadyReviewedAlert.value = true
      return
    }
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

function decisionDisplay(key: string): LabeledText | null {
  const row = workingByKey.value.get(key)
  const server = typeof row?.decision === 'string' ? row.decision : ''
  const decision = resolveLineDecision(decisionByLine.value[key], server)
  return decision ? mapDecisionLabel(decision, t) : null
}

function planDisplay(pkg: Record<string, unknown>): LabeledText {
  return packagePlanCodeLabel(pkg.package_plan_code, pkg.package_plan_name, t)
}

function planCodeDisplay(code: string, name?: string | null): LabeledText {
  return packagePlanCodeLabel(code, name ?? null, t)
}

function operatorDisplay(row: ExpertCaseAdjustment): { primary: string, role: LabeledText | null } {
  const role = row.operator_role ? operatorRoleLabel(row.operator_role, t) : null
  if (row.operator_display_name) {
    return { primary: row.operator_display_name, role }
  }
  if (role) {
    return { primary: role.text, role }
  }
  return { primary: t('expertCaseReviews.adjustmentNone'), role: null }
}

function knowledgeDecision(row: Record<string, unknown>): LabeledText | null {
  return mapDecisionLabel(row.decision, t)
}

function knowledgeClassification(row: Record<string, unknown>): LabeledText {
  if (row.classification_confirmed) {
    return classificationLabel(row.classification, t)
  }
  return {
    text: t('expertCaseReviews.pendingClassification'),
    title: null,
    known: true
  }
}

function knowledgePlan(row: Record<string, unknown>): LabeledText {
  return packagePlanCodeLabel(row.package_plan_code, row.package_plan_name, t)
}

function seedDoseIfEmpty(pkg: Record<string, unknown>, item: Record<string, unknown>) {
  const key = lineKey(planCode(pkg), itemId(item))
  if (doseByLine.value[key] !== undefined && doseByLine.value[key] !== '') {
    const ceiled = ceilCapsuleDose(doseByLine.value[key])
    if (ceiled != null && !validateCapsuleDose(doseByLine.value[key]).ok) {
      // Legacy decimal in local state → ceil for display／edit seed.
      doseByLine.value[key] = String(ceiled)
    }
    return
  }
  const catalogItem = catalogById.value.get(itemId(item))
  const working = workingByKey.value.get(key)
  if (typeof working?.dose_after === 'number') {
    doseByLine.value[key] = String(ceilCapsuleDose(working.dose_after) ?? 1)
    return
  }
  doseByLine.value[key] = defaultCapsuleDoseForItem(
    catalogItem ?? {
      daily_dose: typeof item.daily_dose === 'number' ? item.daily_dose : null
    }
  )
}

function lineDecision(plan: string, sellableId: string): ExpertLineDecision | '' {
  const key = lineKey(plan, sellableId)
  const row = workingByKey.value.get(key)
  const server = typeof row?.decision === 'string' ? row.decision : ''
  return resolveLineDecision(decisionByLine.value[key], server)
}

function itemTitle(item: Record<string, unknown>): string {
  const labeled = itemDisplayName(item, t).text
  return productNameWithoutGluedDose(labeled) || labeled
}

function suggestedCapsuleCount(item: Record<string, unknown>): string {
  return formatCapsuleDoseDisplay(item.daily_dose as number | string | null | undefined) || '1'
}

function suggestionLineText(item: Record<string, unknown>): string {
  const n = suggestedCapsuleCount(item)
  const catalogItem = catalogById.value.get(itemId(item))
  const spec = itemSpecText(item, catalogItem ?? null)
  if (spec) {
    return t('expertCaseReviews.doseSuggestionLineWithSpec', { n, spec })
  }
  return t('expertCaseReviews.doseSuggestionLine', { n })
}

function doseDisplayText(item: Record<string, unknown>): string {
  const n = formatCapsuleDoseDisplay(
    item.daily_dose as number | string | null | undefined
  )
  if (!n) {
    return ''
  }
  const catalogItem = catalogById.value.get(itemId(item))
  const spec = itemSpecText(item, catalogItem ?? null)
  if (spec) {
    return t('expertCaseReviews.doseDisplayWithSpec', { n, spec })
  }
  return t('expertCaseReviews.doseDisplay', { n })
}

function adjustmentItemLabel(item: {
  name?: string | null
  daily_dose?: number | null
} | null | undefined): string {
  if (!item) {
    return t('expertCaseReviews.adjustmentNone')
  }
  const name = productNameWithoutGluedDose(item.name || '') || (item.name || '')
  const n = formatCapsuleDoseDisplay(item.daily_dose)
  if (!n) {
    return name
  }
  return `${name}（${t('expertCaseReviews.doseDisplay', { n })}）`
}

function tierText(tier: unknown): LabeledText {
  return tierDisplayLabel(tier, t)
}

function excludedReasonDisplay(reasonCode: string): LabeledText {
  const parts = excludedReasonParts(reasonCode)
  if (parts.kind === 'dose_above_ul') {
    return {
      text: t('expertCaseReviews.excludedReason.dose_above_ul'),
      title: null,
      known: true
    }
  }
  if (parts.kind === 'interaction_exclude') {
    return {
      text: t('expertCaseReviews.excludedReason.interaction_exclude'),
      title: null,
      known: true
    }
  }
  if (parts.kind === 'diet_incompatible') {
    return {
      text: t('expertCaseReviews.excludedReason.diet_incompatible'),
      title: null,
      known: true
    }
  }
  if (parts.kind === 'contraindication') {
    if (parts.conditionCode) {
      const condition = conditionLabel(parts.conditionCode, t)
      return {
        text: t('expertCaseReviews.excludedReason.contraindicationWithCondition', {
          condition: condition.text
        }),
        title: condition.known ? null : condition.title,
        known: condition.known
      }
    }
    return {
      text: t('expertCaseReviews.excludedReason.contraindication'),
      title: null,
      known: true
    }
  }
  return {
    text: t('expertCaseReviews.excludedReason.other'),
    title: parts.raw || null,
    known: false
  }
}

function profileFieldLabel(field: string) {
  return profileFieldDisplayLabel(field, t).text
}

function profileSectionShowsLabeledRows(section: ExpertProfileSectionView): boolean {
  if (section.rows.length === 0) {
    return false
  }
  if (section.rows.length === 1 && section.rows[0]!.label === section.title) {
    return false
  }
  return true
}

function adjustmentTypeText(type: unknown): LabeledText {
  return adjustmentTypeDisplayLabel(type, t)
}

function excludedItemName(row: ExpertCaseExcludedRow): LabeledText {
  const catalogName = catalogById.value.get(row.sellable_item_id)?.name
  return displayNameOrUntitled(row.name || catalogName, row.sellable_item_id, t)
}

function domainDisplay(row: { name: string | null, domain_id: string }): LabeledText {
  return displayNameOrUntitled(row.name, row.domain_id, t)
}

function contributionBlockName(block: { name: string | null, sellable_item_id: string }): LabeledText {
  return displayNameOrUntitled(block.name, block.sellable_item_id, t)
}

function formatDateTime(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }
  const formatted = formatLocalDateTime(value, { style: 'intl-numeric', empty: '' })
  return formatted || null
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

function chatMessageMarkdown(payload: {
  content?: string
  parts?: Array<{ type?: string, text?: string }>
}) {
  if (typeof payload.content === 'string' && payload.content.trim()) {
    return payload.content
  }
  const parts = Array.isArray(payload.parts) ? payload.parts : []
  return parts
    .filter((part): part is { type: string, text: string } =>
      part.type === 'text' && typeof part.text === 'string' && part.text.length > 0
    )
    .map(part => part.text)
    .join('\n\n')
}

function isCustomerRole(value: unknown) {
  return typeof value === 'string' && CUSTOMER_ROLES.has(value)
}

function numberOf(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return null
}

/** 品項單價（僅參考）：優先 snapshot／catalog 的 unit_price。 */
function itemUnitPrice(item: Record<string, unknown>) {
  const fromItem = numberOf(item.unit_price)
  if (fromItem != null) {
    return fromItem
  }
  const sellableId = itemId(item)
  if (!sellableId) {
    return null
  }
  return catalogById.value.get(sellableId)?.unit_price ?? null
}

function itemUnitPriceText(item: Record<string, unknown>) {
  const price = itemUnitPrice(item)
  return price == null ? '' : money(price)
}
</script>

<template>
  <PageHeader plain>
    <p
      v-if="pending"
      class="px-5 py-5 text-sm text-muted sm:px-7 sm:py-7"
      data-testid="expert-case-detail-loading"
    >
      {{ $t('expertCaseReviews.loading') }}
    </p>
    <div
      v-else-if="errorMessage"
      class="m-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error sm:m-7"
      data-testid="expert-case-detail-error"
    >
      <div class="flex min-w-0 items-center gap-2">
        <UIcon
          name="i-lucide-triangle-alert"
          class="size-4 shrink-0"
        />
        <span>{{ errorMessage }}</span>
      </div>
      <UButton
        color="neutral"
        variant="soft"
        size="sm"
        data-testid="expert-case-detail-retry"
        @click="load"
      >
        {{ $t('expertCaseReviews.retry') }}
      </UButton>
    </div>

    <template v-else-if="detail">
      <!-- Flush sticky toolbar: full width under navbar, no floating gap -->
      <div
        class="sticky top-0 z-20 border-b border-default bg-default px-5 py-3 sm:px-7"
        data-testid="expert-case-sticky-actions"
      >
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <p class="truncate text-sm font-semibold text-highlighted">
              {{ memberLabel }}
            </p>
            <span
              v-if="statusChipLabel"
              :title="statusChipTitle || undefined"
            >
              <StatusBadge
                :label="statusChipLabel"
                :color="statusChipColor"
                data-testid="expert-case-status-chip"
              />
            </span>
            <UBadge
              v-if="isExpertPlanCase"
              color="info"
              variant="subtle"
              data-testid="expert-case-expert-plan-chip"
            >
              {{ $t('nav.expertPlans') }}
            </UBadge>
            <UBadge
              v-if="missingGoals"
              color="warning"
              variant="subtle"
              :title="$t('expertCaseReviews.missingSignalsHint')"
              data-testid="expert-case-missing-goals-chip"
            >
              {{ $t('expertCaseReviews.missingGoalsChip') }}
            </UBadge>
            <UBadge
              v-if="missingReport"
              color="warning"
              variant="subtle"
              :title="$t('expertCaseReviews.missingSignalsHint')"
              data-testid="expert-case-missing-report-chip"
            >
              {{ $t('expertCaseReviews.missingReportChip') }}
            </UBadge>
          </div>
          <div class="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            <UButton
              size="sm"
              variant="outline"
              color="neutral"
              :disabled="busy || pending"
              data-testid="expert-case-export"
              @click="exportExcel"
            >
              {{ $t('expertCaseReviews.export') }}
            </UButton>
            <UButton
              v-if="awaiting"
              size="sm"
              variant="soft"
              color="neutral"
              :disabled="busy"
              data-testid="expert-case-reset"
              @click="resetAll"
            >
              {{ $t('expertCaseReviews.resetAll') }}
            </UButton>
            <UTooltip
              v-if="awaiting"
              :text="submitBlockHint || undefined"
              :disabled="!submitBlockHint"
              :content="{ side: 'bottom', align: 'end' }"
            >
              <span
                class="inline-flex"
                data-testid="expert-case-submit-block-hint"
                :aria-label="submitBlockHint || undefined"
              >
                <UButton
                  size="sm"
                  color="primary"
                  :disabled="!canSubmitFinalize"
                  data-testid="expert-case-submit"
                  @click="askSubmit"
                >
                  {{ finalizeGenerating
                    ? $t('expertCaseReviews.finalizeCopyGenerating')
                    : $t('expertCaseReviews.submit') }}
                </UButton>
              </span>
            </UTooltip>
          </div>
        </div>
      </div>

      <UAlert
        v-if="alreadyReviewedAlert"
        color="warning"
        variant="subtle"
        class="mx-5 mt-4 sm:mx-7"
        :title="$t('expertCaseReviews.alreadyReviewed')"
        data-testid="expert-case-already-reviewed"
      />

      <div
        v-if="isExpertPlanCase && openingAmountText"
        class="border-b border-default bg-elevated px-5 py-3 sm:px-7"
        data-testid="expert-case-opening-amount"
      >
        <p class="text-sm text-muted">
          {{ $t('expertCaseReviews.openingAmountLabel') }}
        </p>
        <p class="tabular-money mt-1 text-lg font-semibold text-highlighted">
          {{ openingAmountText }}
        </p>
        <p class="mt-1 text-xs text-muted">
          {{ $t('expertCaseReviews.openingAmountHint') }}
        </p>
      </div>

      <div class="space-y-8 px-5 py-5 sm:px-7 sm:py-7">
        <!-- Member data: left profile/goals · right chat · bottom report -->
        <section
          class="space-y-4 rounded-xl border border-default bg-elevated p-4"
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
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div class="min-w-0 space-y-4">
                <div data-testid="expert-case-profile">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="font-medium text-highlighted">
                      {{ $t('expertCaseReviews.profileTitle') }}
                    </h3>
                    <UButton
                      v-if="hasProfileUpdates"
                      size="xs"
                      color="warning"
                      variant="ghost"
                      icon="i-lucide-info"
                      :title="$t('expertCaseReviews.profileUpdateOpen')"
                      :aria-label="$t('expertCaseReviews.profileUpdateOpen')"
                      data-testid="expert-case-profile-updates-open"
                      @click="profileUpdateOpen = true"
                    />
                  </div>
                  <p
                    v-if="profileMissingReason === 'legacy_case_without_snapshot'"
                    class="mt-2 text-sm text-muted"
                  >
                    {{ $t('expertCaseReviews.memberDataLegacySnapshot') }}
                  </p>
                  <dl
                    v-else-if="profileSections.length"
                    class="mt-2 grid gap-2 sm:grid-cols-2"
                    data-testid="expert-case-profile-sections"
                  >
                    <div
                      v-for="section in profileSections"
                      :key="section.id"
                      class="rounded-lg bg-default/40 px-3 py-2 text-sm"
                      :data-testid="`expert-case-profile-section-${section.id}`"
                    >
                      <dt class="text-xs text-muted">
                        {{ section.title }}
                      </dt>
                      <dd
                        v-if="profileSectionShowsLabeledRows(section)"
                        class="mt-1 space-y-1 text-highlighted"
                        :data-testid="section.id === 'intake' ? 'expert-case-intake-rows' : undefined"
                      >
                        <div
                          v-for="row in section.rows"
                          :key="row.key"
                          class="flex flex-wrap gap-x-2 gap-y-0.5"
                        >
                          <span
                            class="text-muted"
                            :title="row.title || undefined"
                          >{{ row.label }}：</span>
                          <span class="whitespace-pre-wrap break-words">{{ row.value }}</span>
                        </div>
                      </dd>
                      <dd
                        v-else
                        class="mt-0.5 whitespace-pre-wrap break-words text-highlighted"
                        :title="section.rows[0]?.title || undefined"
                        :data-testid="section.id === 'conditions' ? 'expert-case-conditions' : undefined"
                      >
                        {{ section.rows[0]?.value || '—' }}
                      </dd>
                    </div>
                  </dl>
                  <p
                    v-else-if="profileSnapshot"
                    class="mt-2 text-sm text-muted"
                  >
                    —
                  </p>
                </div>
              </div>

              <!--
              lg: absolute fill so row height = left column only (chat scrolls inside).
              max-lg: fixed max height; in-flow so the cell is not collapsed.
            -->
              <div
                class="relative min-w-0 max-lg:min-h-[20rem]"
                data-testid="expert-case-messages"
              >
                <div class="flex max-h-[28rem] flex-col lg:absolute lg:inset-0 lg:max-h-none">
                  <h3 class="shrink-0 font-medium text-highlighted">
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
                    class="mt-2 min-h-0 flex-1 overflow-y-auto rounded-lg border border-default bg-default px-2"
                  >
                    <UChatMessages
                      :messages="chatMessages"
                      :assistant="assistantMessage"
                      :user="userMessage"
                      :auto-scroll="false"
                      :should-scroll-to-bottom="false"
                      class="py-4"
                    >
                      <template #content="slotProps">
                        <MarkdownPreview
                          class="expert-case-chat-md"
                          :source="chatMessageMarkdown(slotProps)"
                        />
                      </template>
                    </UChatMessages>
                  </div>
                  <p
                    v-if="messagesHasMore"
                    class="mt-2 shrink-0 text-xs text-muted"
                  >
                    {{ $t('expertCaseReviews.messagesHasMore') }}
                  </p>
                </div>
              </div>
            </div>

            <div
              class="border-t border-default pt-4"
              data-testid="expert-case-report"
            >
              <h3 class="flex flex-wrap items-center gap-2 font-medium text-highlighted">
                <span>{{ $t('expertCaseReviews.reportTitle') }}</span>
                <UBadge
                  v-if="missingReport"
                  color="warning"
                  variant="subtle"
                  data-testid="expert-case-report-missing-chip"
                >
                  {{ $t('expertCaseReviews.missingReportChip') }}
                </UBadge>
              </h3>
              <p
                v-if="!healthReport"
                class="mt-2 text-sm text-muted"
              >
                {{ $t('expertCaseReviews.reportEmpty') }}
              </p>
              <template v-else>
                <p
                  class="mt-1 text-xs text-muted"
                  :title="healthReportStatus.title || undefined"
                  data-testid="expert-case-report-status"
                >
                  {{ $t('expertCaseReviews.reportStatusLabel') }}：{{ healthReportStatus.text }}
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

        <!-- Per-plan card: left original (slim) · right working preview / revised -->
        <section
          class="space-y-4"
          data-testid="expert-case-scheme-compare"
        >
          <p
            v-if="!packages.length"
            class="rounded-xl border border-default bg-elevated p-4 text-sm text-muted"
          >
            {{ $t('expertCaseReviews.noPackages') }}
          </p>

          <div
            v-for="(pkg, pkgIndex) in packages"
            :key="planCode(pkg)"
            class="overflow-hidden rounded-xl border border-default bg-elevated"
            :data-testid="`expert-case-plan-card-${planCode(pkg)}`"
          >
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-default px-4 py-3">
              <div class="flex min-w-0 flex-wrap items-center gap-2">
                <h3
                  class="text-base font-semibold text-highlighted"
                  :title="planDisplay(pkg).title || undefined"
                >
                  {{ planDisplay(pkg).text }}
                </h3>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-info"
                  :title="$t('expertCaseReviews.weightBackgroundOpen')"
                  :aria-label="$t('expertCaseReviews.weightBackgroundOpen')"
                  data-testid="expert-case-weight-background-open"
                  @click="openWeightBackground(pkg)"
                />
              </div>
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

            <div class="grid grid-cols-1 gap-0 lg:grid-cols-2">
              <div class="min-w-0 border-b border-default p-4 lg:border-b-0 lg:border-r">
                <p class="text-xs font-medium text-muted">
                  {{ $t('expertCaseReviews.original') }}
                </p>
                <p
                  class="mt-0.5 text-xs text-muted"
                  :data-testid="pkgIndex === 0 ? 'expert-case-dose-capsule-hint' : undefined"
                >
                  {{ $t('expertCaseReviews.doseCapsuleHint') }}
                </p>
                <p
                  v-if="!packageItems(pkg).length"
                  class="mt-3 text-sm text-muted"
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
                    class="flex flex-wrap items-start justify-between gap-3 py-3"
                    :class="{
                      'opacity-60': isCapsuleDoseHidden(lineDecision(planCode(pkg), itemId(item)))
                    }"
                    :data-testid="`expert-case-item-${itemId(item)}`"
                  >
                    <div class="min-w-0 flex-1">
                      <p
                        class="font-medium text-highlighted"
                        :class="{
                          'line-through text-muted': isCapsuleDoseHidden(lineDecision(planCode(pkg), itemId(item)))
                        }"
                        :title="itemDisplayName(item, t).title || undefined"
                        data-testid="expert-case-item-name"
                      >
                        {{ itemTitle(item) }}
                      </p>
                      <p class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <UBadge
                          v-if="item.tier"
                          :color="tierLabelKey(item.tier) === 'primary'
                            ? 'primary'
                            : tierLabelKey(item.tier) === 'secondary' ? 'info' : 'neutral'"
                          variant="subtle"
                          data-testid="expert-case-item-tier"
                          :title="tierText(item.tier).title || undefined"
                        >
                          {{ tierText(item.tier).text }}
                        </UBadge>
                        <span data-testid="expert-case-item-suggestion">
                          {{ suggestionLineText(item) }}
                        </span>
                        <span
                          v-if="decisionDisplay(lineKey(planCode(pkg), itemId(item)))"
                          :title="decisionDisplay(lineKey(planCode(pkg), itemId(item)))?.title || undefined"
                          data-testid="expert-case-item-decision"
                        >
                          · {{ decisionDisplay(lineKey(planCode(pkg), itemId(item)))?.text }}
                        </span>
                      </p>
                      <p
                        v-if="formatScoreNorm(item.score_norm)"
                        class="mt-1 text-sm font-semibold tabular-nums text-primary"
                        data-testid="expert-case-item-score"
                      >
                        {{ formatScoreNorm(item.score_norm) }}
                      </p>
                      <p
                        v-if="itemUnitPriceText(item)"
                        class="mt-1 text-xs text-muted"
                        data-testid="expert-case-item-unit-price"
                      >
                        {{ $t('expertCaseReviews.unitPriceReference') }}：
                        <span class="tabular-money font-medium text-highlighted">
                          {{ itemUnitPriceText(item) }}
                        </span>
                      </p>
                    </div>
                    <UButton
                      v-if="awaiting"
                      size="xs"
                      variant="soft"
                      :disabled="busy"
                      data-testid="expert-case-edit-item"
                      @click="openEdit(pkg, item)"
                    >
                      {{ $t('expertCaseReviews.editItem') }}
                    </UButton>
                  </li>
                </ul>
              </div>

              <div class="min-w-0 p-4">
                <p class="text-xs font-medium text-muted">
                  {{ comparisonTitle }}
                </p>
                <template v-if="comparisonPackageFor(planCode(pkg))">
                  <details
                    v-if="comparisonPackageFor(planCode(pkg))!.composition_hash"
                    class="mt-2 text-xs text-muted"
                    data-testid="expert-case-composition-hash"
                  >
                    <summary class="cursor-pointer">
                      {{ $t('expertCaseReviews.techDetails') }}
                    </summary>
                    <p class="mt-1 font-mono break-all">
                      composition_hash：{{ comparisonPackageFor(planCode(pkg))!.composition_hash }}
                    </p>
                  </details>
                  <p
                    v-if="!packageItems(comparisonPackageFor(planCode(pkg))!).length"
                    class="mt-3 text-sm text-muted"
                  >
                    {{ $t('expertCaseReviews.noItems') }}
                  </p>
                  <ul
                    v-else
                    class="mt-3 space-y-2 text-sm"
                  >
                    <li
                      v-for="item in packageItems(comparisonPackageFor(planCode(pkg))!)"
                      :key="`cmp-item-${itemId(item)}-${item.is_new ? 'new' : 'orig'}`"
                      class="space-y-0.5"
                    >
                      <p
                        :class="{ 'line-through text-muted': item.removed === true }"
                        :title="itemDisplayName(item, t).title || undefined"
                        data-testid="expert-case-cmp-item-name"
                      >
                        {{ itemTitle(item) }}
                      </p>
                      <p
                        v-if="!item.removed && doseDisplayText(item)"
                        class="text-xs text-muted"
                        data-testid="expert-case-cmp-item-dose"
                      >
                        {{ doseDisplayText(item) }}
                      </p>
                      <p
                        v-if="!item.removed && itemUnitPriceText(item)"
                        class="text-xs text-muted"
                        data-testid="expert-case-cmp-item-unit-price"
                      >
                        {{ $t('expertCaseReviews.unitPriceReference') }}：
                        <span class="tabular-money font-medium text-highlighted">
                          {{ itemUnitPriceText(item) }}
                        </span>
                      </p>
                      <p class="text-xs text-muted">
                        <span
                          v-if="item.is_new"
                          class="text-primary"
                        >
                          {{ $t('expertCaseReviews.addedBadge') }}
                        </span>
                        <span
                          v-if="item.decision && !revisedPackages.length"
                          :title="mapDecisionLabel(item.decision, t)?.title || undefined"
                          data-testid="expert-case-cmp-decision"
                        >
                          <template v-if="item.is_new"> · </template>
                          {{ mapDecisionLabel(item.decision, t)?.text }}
                        </span>
                        <span v-if="item.display_reason">
                          — {{ item.display_reason }}
                        </span>
                      </p>
                    </li>
                  </ul>
                </template>
                <p
                  v-else
                  class="mt-3 text-sm text-muted"
                >
                  {{ $t('expertCaseReviews.noItems') }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- 定稿對話文案：方案／權重下方獨立卡 -->
        <ExpertCaseFinalizeCopyCard
          v-model:report-highlights="finalizeReportHighlights"
          v-model:expert-opinion="finalizeExpertOpinion"
          :case-id="caseId"
          :locked="reviewed"
          :missing-goals="missingGoals"
          :missing-report="missingReport"
          @generating-change="finalizeGenerating = $event"
        />

        <details
          class="group rounded-xl border border-default bg-elevated"
          data-testid="expert-case-excluded"
        >
          <summary class="cursor-pointer list-none px-4 py-3 font-semibold text-highlighted marker:content-none [&::-webkit-details-marker]:hidden">
            <span class="inline-flex items-center gap-2">
              <UIcon
                name="i-lucide-chevron-right"
                class="size-4 shrink-0 transition-transform group-open:rotate-90"
              />
              {{ $t('expertCaseReviews.excludedTitle') }}
            </span>
          </summary>
          <div class="border-t border-default px-4 py-3">
            <p
              v-if="!excludedRows.length"
              class="text-sm text-muted"
            >
              {{ $t('expertCaseReviews.excludedEmpty') }}
            </p>
            <ul
              v-else
              class="divide-y divide-default"
            >
              <li
                v-for="row in excludedRows"
                :key="row.sellable_item_id"
                class="py-3 text-sm"
                :data-testid="`expert-case-excluded-${row.sellable_item_id}`"
              >
                <p
                  class="font-medium text-highlighted"
                  :title="excludedItemName(row).title || undefined"
                >
                  {{ excludedItemName(row).text }}
                </p>
                <p
                  class="mt-1 text-muted"
                  data-testid="expert-case-excluded-reason"
                  :title="excludedReasonDisplay(row.reason_code).title || undefined"
                >
                  {{ excludedReasonDisplay(row.reason_code).text }}
                </p>
              </li>
            </ul>
          </div>
        </details>

        <details
          class="group rounded-xl border border-default bg-elevated"
          data-testid="expert-case-adjustments"
        >
          <summary class="cursor-pointer list-none px-4 py-3 font-semibold text-highlighted marker:content-none [&::-webkit-details-marker]:hidden">
            <span class="inline-flex items-center gap-2">
              <UIcon
                name="i-lucide-chevron-right"
                class="size-4 shrink-0 transition-transform group-open:rotate-90"
              />
              {{ $t('expertCaseReviews.adjustmentsTitle') }}
            </span>
          </summary>
          <div class="border-t border-default px-4 py-3">
            <p class="text-xs text-muted">
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
                  <span :title="adjustmentTypeText(row.type).title || undefined">
                    {{ adjustmentTypeText(row.type).text }}
                  </span>
                  ·
                  <span :title="planCodeDisplay(row.package_plan_code).title || undefined">
                    {{ planCodeDisplay(row.package_plan_code).text }}
                  </span>
                </p>
                <p class="mt-1 text-muted">
                  {{ $t('expertCaseReviews.adjustmentOriginal') }}：
                  {{ adjustmentItemLabel(row.original_item) }}
                </p>
                <p class="mt-1 text-muted">
                  {{ $t('expertCaseReviews.adjustmentNew') }}：
                  {{ adjustmentItemLabel(row.new_item) }}
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
                  <span
                    :title="!row.operator_display_name
                      ? (operatorDisplay(row).role?.title || undefined)
                      : undefined"
                  >
                    {{ operatorDisplay(row).primary }}
                  </span>
                  <span
                    v-if="row.operator_display_name && operatorDisplay(row).role"
                    :title="operatorDisplay(row).role?.title || undefined"
                  >
                    （{{ operatorDisplay(row).role?.text }}）
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
          </div>
        </details>

        <details
          v-if="knowledge.length"
          class="group rounded-xl border border-default bg-elevated"
          data-testid="expert-case-knowledge"
        >
          <summary class="cursor-pointer list-none px-4 py-3 font-semibold text-highlighted marker:content-none [&::-webkit-details-marker]:hidden">
            <span class="inline-flex items-center gap-2">
              <UIcon
                name="i-lucide-chevron-right"
                class="size-4 shrink-0 transition-transform group-open:rotate-90"
              />
              {{ $t('expertCaseReviews.knowledge') }}
            </span>
          </summary>
          <div class="space-y-3 border-t border-default px-4 py-3">
            <div
              v-for="row in knowledge"
              :key="String(row.id)"
              class="rounded-lg border border-default p-3 text-sm"
            >
              <p class="font-medium">
                <span :title="knowledgeDecision(row)?.title || undefined">
                  {{ knowledgeDecision(row)?.text || $t('expertCaseReviews.other') }}
                </span>
                ·
                <span :title="knowledgePlan(row).title || undefined">
                  {{ knowledgePlan(row).text }}
                </span>
              </p>
              <p class="mt-1 text-muted">
                {{ row.reason || '—' }}
              </p>
              <p
                class="mt-1 text-xs text-muted"
                :title="knowledgeClassification(row).title || undefined"
                data-testid="expert-case-knowledge-classification"
              >
                {{ knowledgeClassification(row).text }}
              </p>
              <p
                v-if="!row.classification_confirmed"
                class="mt-2 text-xs text-muted"
              >
                {{ $t('expertCaseReviews.classificationViaDailyLearning') }}
              </p>
            </div>
          </div>
        </details>
      </div>
    </template>

    <UModal
      v-model:open="submitConfirmOpen"
      :title="$t('expertCaseReviews.submitConfirmTitle')"
      :description="$t('expertCaseReviews.submitConfirmBody')"
      :ui="{ footer: 'justify-end gap-2' }"
      data-testid="expert-case-submit-confirm"
    >
      <template #footer="{ close }">
        <UButton
          color="neutral"
          variant="outline"
          data-testid="expert-case-submit-cancel"
          @click="close()"
        >
          {{ $t('actions.cancel') }}
        </UButton>
        <UButton
          color="primary"
          :loading="busy"
          data-testid="expert-case-submit-confirm-btn"
          @click="submit"
        >
          {{ $t('expertCaseReviews.submit') }}
        </UButton>
      </template>
    </UModal>

    <UModal
      v-model:open="profileUpdateOpen"
      :title="$t('expertCaseReviews.profileUpdateBanner')"
      data-testid="expert-case-profile-updates"
    >
      <template #body>
        <div class="space-y-2 text-sm">
          <p
            v-if="formatDateTime(profileUpdate?.updated_at)"
            class="text-muted"
            data-testid="expert-case-profile-updated-at"
          >
            {{ $t('expertCaseReviews.profileUpdateAt', {
              time: formatDateTime(profileUpdate?.updated_at)
            }) }}
          </p>
          <p
            v-if="changedFieldLabels.length"
            class="text-muted"
            data-testid="expert-case-profile-changed-fields"
          >
            {{ $t('expertCaseReviews.profileChangedFields', {
              fields: changedFieldLabels.join('、')
            }) }}
          </p>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="weightBackgroundOpen"
      :title="$t('expertCaseReviews.weightBackgroundTitle')"
      :description="weightBackgroundPlanLabel.text"
      :ui="{ content: 'sm:max-w-3xl' }"
      data-testid="expert-case-weight-background"
    >
      <template #body>
        <div
          class="max-h-[70vh] space-y-6 overflow-y-auto text-sm"
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
              v-if="!weightBackgroundRationales.length"
              class="mt-2 text-muted"
            >
              {{ $t('expertCaseReviews.weightRationaleEmpty') }}
            </p>
            <div
              v-for="block in weightBackgroundRationales"
              :key="block.package_plan_code"
              class="mt-3 rounded-lg border border-default p-3"
            >
              <p
                v-if="block.headline"
                class="text-highlighted"
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
                <span :title="domainDisplay(row).title || undefined">
                  {{ domainDisplay(row).text }}
                </span>
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
              v-if="!weightBackgroundContributions.length"
              class="mt-2 text-muted"
            >
              {{ $t('expertCaseReviews.weightContributionsEmpty') }}
            </p>
            <div
              v-for="block in weightBackgroundContributions"
              :key="block.sellable_item_id || block.name || 'item'"
              class="mt-3 rounded-lg border border-default p-3"
            >
              <p
                class="font-medium text-highlighted"
                :title="contributionBlockName(block).title || undefined"
              >
                {{ contributionBlockName(block).text }}
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
      </template>
    </UModal>

    <ExpertCaseItemEditModal
      v-model:open="editOpen"
      :item-title="editItemTitle"
      :suggestion-text="editSuggestionText"
      :score-text="editScoreText"
      :initial-decision="editInitialDecision"
      :initial-reason="editInitialReason"
      :initial-dose="editInitialDose"
      :suggested-count="editSuggestedCount"
      :busy="busy"
      @apply="onEditApply"
      @request-swap="onEditRequestSwap"
    />

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

<style scoped>
/* Inherit bubble text color (e.g. text-inverted on solid user) — beat MarkdownPreview tokens. */
.expert-case-chat-md :deep(.privacy-md) {
  color: inherit !important;
  font-size: 0.875rem;
  line-height: 1.5;
}
.expert-case-chat-md :deep(.privacy-md h1),
.expert-case-chat-md :deep(.privacy-md h2),
.expert-case-chat-md :deep(.privacy-md h3),
.expert-case-chat-md :deep(.privacy-md h4),
.expert-case-chat-md :deep(.privacy-md strong),
.expert-case-chat-md :deep(.privacy-md a) {
  color: inherit !important;
}
.expert-case-chat-md :deep(.privacy-md a) {
  text-decoration: underline;
  text-underline-offset: 2px;
}
.expert-case-chat-md :deep(.privacy-md code) {
  background: color-mix(in oklab, currentColor 14%, transparent);
}
.expert-case-chat-md :deep(.privacy-md h1) {
  font-size: 1.05rem;
}
.expert-case-chat-md :deep(.privacy-md h2) {
  font-size: 1rem;
}
.expert-case-chat-md :deep(.privacy-md h3),
.expert-case-chat-md :deep(.privacy-md h4) {
  font-size: 0.925rem;
}
</style>
