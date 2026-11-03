<script setup lang="ts">
import {
  AdminApiError,
  adminExportExpertCaseReview,
  adminListExpertCaseReviews
} from '~/utils/admin-api'
import {
  expertCaseMemberDisplayName,
  expertCaseMemberName,
  formatExpertCaseListTime,
  isExpertCaseDemoRow
} from '~/utils/expert-case-list-display'
import { caseStatusLabel } from '~/utils/expert-case-labels'
import { readOperatorToken } from '~/utils/operator-session'

type CaseColumn = 'member' | 'status' | 'order' | 'expertPlan' | 'paidAt' | 'reviewedAt' | 'actions'
type ColumnAlign = 'left' | 'center' | 'right'
type ChipKey = 'pending' | 'all' | 'reviewed' | 'legacy'

const FILTER_ANY = 'all'
const PAGE_SIZE = 10
const FETCH_SIZE = 50

const config = useRuntimeConfig()
const localePath = useLocalePath()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const feedback = useOpsFeedback()

const cases = ref<Record<string, unknown>[]>([])
const pending = ref(true)
const errorMessage = ref('')
const page = ref(1)
const hasMore = ref(false)
const exportingId = ref<string | null>(null)
let loadSeq = 0
let nextOffset = 0

function queryString(name: string) {
  const raw = route.query[name]
  const value = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
  return typeof value === 'string' ? value : ''
}

/** B-08：無 query 時預設「待處理案件」＝已付款＋待定稿（awaiting_review + expert_plan）。 */
function initialChip(): ChipKey {
  const status = queryString('status')
  const source = queryString('source')
  if (!status && !source && !('status' in route.query) && !('source' in route.query)) {
    return 'pending'
  }
  if (status === 'awaiting_review' && source === 'expert_plan') {
    return 'pending'
  }
  if (status === 'reviewed' && !source) {
    return 'reviewed'
  }
  if (source === 'legacy' && !status) {
    return 'legacy'
  }
  if ((!status || status === FILTER_ANY) && (!source || source === FILTER_ANY)) {
    return 'all'
  }
  if (status === 'awaiting_review' && (!source || source === FILTER_ANY)) {
    return 'pending'
  }
  return 'all'
}

const activeChip = ref<ChipKey>(initialChip())

const columns: { key: CaseColumn, align: ColumnAlign, width?: string }[] = [
  { key: 'member', align: 'left', width: 'w-[22%]' },
  { key: 'status', align: 'left', width: 'w-[7rem]' },
  { key: 'order', align: 'left', width: 'w-[10rem]' },
  { key: 'expertPlan', align: 'left', width: 'w-[12rem]' },
  { key: 'paidAt', align: 'left', width: 'w-[9rem]' },
  { key: 'reviewedAt', align: 'left', width: 'w-[9rem]' },
  { key: 'actions', align: 'right', width: 'w-[12rem]' }
]

const chipOptions = computed(() => [
  { key: 'pending' as const, label: t('expertCaseReviews.filterPending') },
  { key: 'all' as const, label: t('expertCaseReviews.filterAll') },
  { key: 'reviewed' as const, label: t('expertCaseReviews.filterReviewed') },
  { key: 'legacy' as const, label: t('expertCaseReviews.filterSourceLegacy') }
])

/** Query 僅 status／source（core #143 OpenAPI）；paid_at 排序由後端預設。 */
const listQuery = computed(() => {
  switch (activeChip.value) {
    case 'pending':
      return {
        status: 'awaiting_review' as const,
        source: 'expert_plan' as const
      }
    case 'reviewed':
      return {
        status: 'reviewed' as const,
        source: undefined
      }
    case 'legacy':
      return {
        status: undefined,
        source: 'legacy' as const
      }
    default:
      return {
        status: undefined,
        source: undefined
      }
  }
})

const rows = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return cases.value.slice(start, start + PAGE_SIZE)
})
const paginationTotal = computed(() => cases.value.length + (hasMore.value ? 1 : 0))

if (import.meta.client) {
  watch(activeChip, () => {
    void load(true)
  }, { immediate: true })
}

async function load(reset: boolean) {
  const seq = ++loadSeq
  const token = readOperatorToken()
  if (!token) {
    cases.value = []
    hasMore.value = false
    errorMessage.value = t('expertCaseReviews.failed')
    pending.value = false
    return
  }

  if (reset) {
    cases.value = []
    page.value = 1
    nextOffset = 0
    hasMore.value = false
  }

  pending.value = true
  errorMessage.value = ''
  try {
    const fetched = await adminListExpertCaseReviews(config.public.apiBase, token, {
      status: listQuery.value.status,
      source: listQuery.value.source,
      limit: FETCH_SIZE,
      offset: nextOffset
    })
    if (seq !== loadSeq) {
      return
    }
    if (!reset && fetched.length === 0) {
      hasMore.value = false
      page.value = Math.max(1, Math.ceil(cases.value.length / PAGE_SIZE))
      return
    }
    const merged = reset ? fetched : [...cases.value, ...fetched]
    cases.value = sortByPaidAtAsc(merged)
    nextOffset += fetched.length
    hasMore.value = fetched.length >= FETCH_SIZE
  } catch (error) {
    if (seq !== loadSeq) {
      return
    }
    cases.value = []
    hasMore.value = false
    errorMessage.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('expertCaseReviews.failed')
  } finally {
    if (seq === loadSeq) {
      pending.value = false
    }
  }
}

/** C18 client fallback：依付款時間由舊到新（缺 paid_at 時用 created_at）。 */
function sortByPaidAtAsc(rowsIn: Record<string, unknown>[]) {
  return [...rowsIn].sort((a, b) => {
    const ta = paidAtMs(a)
    const tb = paidAtMs(b)
    return ta - tb
  })
}

function paidAtMs(row: Record<string, unknown>) {
  const raw = row.paid_at ?? row.created_at
  if (typeof raw === 'string' || typeof raw === 'number') {
    const ms = Date.parse(String(raw))
    return Number.isFinite(ms) ? ms : 0
  }
  return 0
}

function goToPage(next: number) {
  if (pending.value || next < 1 || next === page.value) {
    return
  }
  page.value = next
  const start = (next - 1) * PAGE_SIZE
  if (start >= cases.value.length && hasMore.value) {
    void load(false)
  }
}

function statusDisplay(status: unknown) {
  return caseStatusLabel(status, t)
}

function statusColor(status: unknown): 'success' | 'warning' | 'neutral' {
  if (status === 'reviewed') {
    return 'success'
  }
  if (status === 'awaiting_review') {
    return 'warning'
  }
  return 'neutral'
}

function columnLabel(key: CaseColumn) {
  switch (key) {
    case 'member':
      return t('expertCaseReviews.colUser')
    case 'status':
      return t('expertCaseReviews.colStatus')
    case 'order':
      return t('expertCaseReviews.colOrder')
    case 'expertPlan':
      return t('expertCaseReviews.colExpertPlan')
    case 'paidAt':
      return t('expertCaseReviews.colPaidAt')
    case 'reviewedAt':
      return t('expertCaseReviews.colReviewed')
    case 'actions':
      return t('col.actions')
  }
}

function orderLabel(row: Record<string, unknown>) {
  const orderNo = textOf(row.order_no) || textOf(row.order_number)
  const orderId = textOf(row.order_id)
  return orderNo || orderId || '—'
}

function expertPlanLabel(row: Record<string, unknown>) {
  return textOf(row.expert_plan_name)
    || textOf(row.expert_plan_name_zh)
    || textOf(row.expert_plan_code)
    || textOf(row.expert_plan_id)
    || '—'
}

function paidAtLabel(row: Record<string, unknown>) {
  return formatExpertCaseListTime(row.paid_at ?? row.created_at)
}

function textOf(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
}

function alignClass(align: ColumnAlign) {
  if (align === 'center') {
    return 'text-center'
  }
  if (align === 'right') {
    return 'text-right'
  }
  return ''
}

function detailPath(row: Record<string, unknown>) {
  return localePath(`/expert-case-reviews/${row.id}`)
}

function openRow(row: Record<string, unknown>) {
  void router.push(detailPath(row))
}

function rowKey(row: Record<string, unknown>, index: number) {
  const id = row.id
  return typeof id === 'string' && id.trim() ? id : `case-${index}`
}

function caseId(row: Record<string, unknown>) {
  return typeof row.id === 'string' ? row.id : ''
}

async function exportRow(row: Record<string, unknown>) {
  const id = caseId(row)
  const token = readOperatorToken()
  if (!id || !token || exportingId.value) {
    return
  }
  exportingId.value = id
  try {
    const { blob, filename } = await adminExportExpertCaseReview(
      config.public.apiBase,
      token,
      id
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
    exportingId.value = null
  }
}
</script>

<template>
  <PageHeader
    :title="$t('expertCaseReviews.title')"
    :description="$t('expertCaseReviews.subtitle')"
    plain
  >
    <div class="flex flex-col gap-4">
      <div
        class="flex flex-wrap items-center gap-2"
        data-testid="expert-case-chip-filters"
      >
        <UButton
          v-for="chip in chipOptions"
          :key="chip.key"
          size="sm"
          :color="activeChip === chip.key ? 'primary' : 'neutral'"
          :variant="activeChip === chip.key ? 'solid' : 'outline'"
          :data-testid="`expert-case-chip-${chip.key}`"
          @click="activeChip = chip.key"
        >
          {{ chip.label }}
        </UButton>
        <span class="ml-auto text-xs text-muted">
          {{ $t('expertCaseReviews.sortPaidAtAsc') }}
        </span>
      </div>

      <p
        v-if="errorMessage"
        class="text-sm text-error"
        data-testid="expert-case-error"
      >
        {{ errorMessage }}
      </p>
      <p
        v-else-if="pending && !cases.length"
        class="text-sm text-muted"
        data-testid="expert-case-loading"
      >
        {{ $t('expertCaseReviews.loading') }}
      </p>
      <template v-else>
        <p
          v-if="!cases.length"
          class="rounded-xl border border-default bg-elevated p-10 text-center text-base text-muted"
          data-testid="expert-case-empty"
        >
          {{ $t('expertCaseReviews.empty') }}
        </p>
        <AdminTable
          v-else
          compact
          fixed
          data-testid="expert-case-table"
        >
          <template #colgroup>
            <colgroup>
              <col
                v-for="column in columns"
                :key="column.key"
                :class="column.width"
              >
            </colgroup>
          </template>
          <template #head>
            <tr>
              <th
                v-for="column in columns"
                :key="column.key"
                :class="[column.width, alignClass(column.align)]"
              >
                {{ columnLabel(column.key) }}
              </th>
            </tr>
          </template>
          <tr
            v-for="(row, index) in rows"
            :key="rowKey(row, index)"
            class="cursor-pointer border-b border-default last:border-0 hover:bg-muted/40"
            :data-testid="`expert-case-row-${row.id}`"
            @click="openRow(row)"
          >
            <td class="py-3">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-semibold text-highlighted">
                  {{ expertCaseMemberName(row) }}
                </p>
                <UBadge
                  v-if="isExpertCaseDemoRow(row)"
                  color="neutral"
                  variant="subtle"
                  class="text-xs font-medium"
                  data-testid="expert-case-demo-chip"
                >
                  {{ $t('expertCaseReviews.demoChip') }}
                </UBadge>
              </div>
              <p class="mt-0.5 text-xs text-muted">
                {{ expertCaseMemberDisplayName(row) }}
              </p>
            </td>
            <td>
              <span :title="statusDisplay(row.status).title || undefined">
                <StatusBadge
                  :label="statusDisplay(row.status).text"
                  :color="statusColor(row.status)"
                />
              </span>
            </td>
            <td class="text-sm text-highlighted">
              {{ orderLabel(row) }}
            </td>
            <td class="text-sm text-highlighted">
              {{ expertPlanLabel(row) }}
            </td>
            <td class="whitespace-nowrap text-sm text-muted">
              {{ paidAtLabel(row) }}
            </td>
            <td class="whitespace-nowrap text-sm text-muted">
              {{ formatExpertCaseListTime(row.reviewed_at) }}
            </td>
            <td
              class="text-end"
              @click.stop
            >
              <div class="inline-flex flex-wrap items-center justify-end gap-2">
                <UButton
                  size="sm"
                  variant="outline"
                  color="neutral"
                  :loading="exportingId === caseId(row)"
                  :disabled="Boolean(exportingId) && exportingId !== caseId(row)"
                  data-testid="expert-case-export"
                  @click="exportRow(row)"
                >
                  {{ $t('expertCaseReviews.export') }}
                </UButton>
                <UButton
                  size="sm"
                  variant="soft"
                  :to="detailPath(row)"
                  data-testid="expert-case-open"
                >
                  {{ $t('expertCaseReviews.open') }}
                </UButton>
              </div>
            </td>
          </tr>
          <template #footer>
            <div class="flex justify-end border-t border-default px-4 py-3">
              <UPagination
                :page="page"
                :items-per-page="PAGE_SIZE"
                :total="paginationTotal"
                :disabled="pending"
                @update:page="goToPage"
              />
            </div>
          </template>
        </AdminTable>
      </template>
    </div>
  </PageHeader>
</template>
