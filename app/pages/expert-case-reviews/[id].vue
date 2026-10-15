<script setup lang="ts">
import {
  AdminApiError,
  adminConfirmExpertCaseReviewKnowledge,
  adminExportExpertCaseReview,
  adminGetExpertCaseReview,
  adminPatchExpertCaseReviewItem,
  adminResetExpertCaseReviewItems,
  adminSubmitExpertCaseReview
} from '~/utils/admin-api'
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

onMounted(() => {
  void load()
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

function lineKey(planCode: string, itemId: string) {
  return `${planCode}:orig:${itemId}`
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
  const reason = (reasonByLine.value[key] || '').trim()
  if ((decision === 'reject' || decision === 'adjust') && reason === '') {
    feedback.notify({
      title: t('expertCaseReviews.reasonRequired'),
      color: 'error'
    })
    return
  }
  const doseRaw = doseByLine.value[key]
  const dose = doseRaw !== undefined && doseRaw !== '' ? Number(doseRaw) : Number(item.daily_dose ?? 0)
  busy.value = true
  try {
    detail.value = await adminPatchExpertCaseReviewItem(config.public.apiBase, token, caseId.value, {
      package_plan_code: plan,
      sellable_item_id: sellableId,
      decision,
      reason: reason || null,
      daily_dose: decision === 'adjust' ? dose : null,
      sellable_item_after: decision === 'adjust' ? sellableId : null
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

      <section class="mb-8 space-y-4">
        <h2 class="text-lg font-semibold text-highlighted">
          {{ $t('expertCaseReviews.original') }}
        </h2>
        <div
          v-for="pkg in packages"
          :key="planCode(pkg)"
          class="rounded-xl border border-default p-4"
        >
          <h3 class="font-medium text-highlighted">
            {{ pkg.package_plan_name || planCode(pkg) }}
          </h3>
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
                    @click="decide(pkg, item, 'approve')"
                  >
                    {{ $t('expertCaseReviews.approve') }}
                  </UButton>
                  <UButton
                    size="xs"
                    color="error"
                    variant="soft"
                    :disabled="busy"
                    @click="decide(pkg, item, 'reject')"
                  >
                    {{ $t('expertCaseReviews.reject') }}
                  </UButton>
                  <UButton
                    size="xs"
                    color="warning"
                    variant="soft"
                    :disabled="busy"
                    @click="decide(pkg, item, 'adjust')"
                  >
                    {{ $t('expertCaseReviews.adjust') }}
                  </UButton>
                </div>
              </div>
              <div
                v-if="awaiting"
                class="mt-2 grid gap-2 sm:grid-cols-2"
              >
                <UInput
                  v-model="reasonByLine[lineKey(planCode(pkg), itemId(item))]"
                  :placeholder="$t('expertCaseReviews.reason')"
                  size="sm"
                />
                <UInput
                  v-model="doseByLine[lineKey(planCode(pkg), itemId(item))]"
                  :placeholder="String(item.daily_dose ?? '')"
                  size="sm"
                  type="number"
                  step="0.1"
                />
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section
        v-if="revisedPackages.length"
        class="mb-8 space-y-4"
      >
        <h2 class="text-lg font-semibold text-highlighted">
          {{ $t('expertCaseReviews.revised') }}
        </h2>
        <div
          v-for="pkg in revisedPackages"
          :key="`rev-${planCode(pkg)}`"
          class="rounded-xl border border-default p-4"
        >
          <h3 class="font-medium">
            {{ pkg.package_plan_name || planCode(pkg) }}
          </h3>
          <p class="mt-1 text-xs text-muted">
            hash：{{ pkg.composition_hash }}
          </p>
          <ul class="mt-3 space-y-2 text-sm">
            <li
              v-for="item in packageItems(pkg)"
              :key="`rev-item-${itemId(item)}`"
            >
              <span :class="{ 'line-through text-muted': item.removed === true }">
                {{ item.name || item.code }} · {{ item.daily_dose }}
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
  </PageHeader>
</template>
