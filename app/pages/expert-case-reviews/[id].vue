<script setup lang="ts">
import {
  AdminApiError,
  adminConfirmExpertCaseReviewKnowledge,
  adminExportExpertCaseReview,
  adminGetExpertCaseReview,
  adminListSellableItems,
  adminPatchExpertCaseReviewItem,
  adminResetExpertCaseReviewItems,
  adminSubmitExpertCaseReview
} from '~/utils/admin-api'
import {
  defaultDoseForItem,
  parseSellablePickRow,
  reasonIsFilled,
  validateDailyDose,
  type ExpertCaseItemChangeMode,
  type SellablePickRow
} from '~/utils/expert-case-sellable'
import { readOperatorToken } from '~/utils/operator-session'

const config = useRuntimeConfig()
const localePath = useLocalePath()
const route = useRoute()
const { t } = useI18n()
const feedback = useOpsFeedback()

const detail = ref<Record<string, unknown> | null>(null)
const pending = ref(true)
const busy = ref(false)
const errorMessage = ref('')
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

onMounted(() => {
  void load()
  void loadCatalog()
})

async function load() {
  const token = readOperatorToken()
  if (!token || !caseId.value) {
    detail.value = null
    errorMessage.value = t('expertCaseReviews.failed')
    pending.value = false
    return
  }
  pending.value = true
  errorMessage.value = ''
  try {
    detail.value = await adminGetExpertCaseReview(config.public.apiBase, token, caseId.value)
  } catch (error) {
    detail.value = null
    errorMessage.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('expertCaseReviews.failed')
  } finally {
    pending.value = false
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
  return Array.isArray(pkg.items) ? pkg.items.filter(isRecord) : []
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
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
                  <div>
                    <p class="font-medium text-highlighted">
                      {{ item.name || item.code }}
                    </p>
                    <p class="text-xs text-muted">
                      {{ $t('expertCaseReviews.dose') }}：{{ item.daily_dose }}
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
