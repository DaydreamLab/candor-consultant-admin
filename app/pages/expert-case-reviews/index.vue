<script setup lang="ts">
import { AdminApiError, adminListExpertCaseReviews } from '~/utils/admin-api'
import { readOperatorToken } from '~/utils/operator-session'

const FILTER_ANY = 'all'
const PAGE_SIZE = 20

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t } = useI18n()

const rows = ref<Record<string, unknown>[]>([])
const pending = ref(true)
const errorMessage = ref('')
const filterStatus = ref(FILTER_ANY)
let loadSeq = 0

const statusOptions = computed(() => [
  { label: t('expertCaseReviews.filterAny'), value: FILTER_ANY },
  { label: t('expertCaseReviews.statusAwaiting'), value: 'awaiting_review' },
  { label: t('expertCaseReviews.statusReviewed'), value: 'reviewed' }
])

if (import.meta.client) {
  watch(filterStatus, () => {
    void load()
  }, { immediate: true })
}

async function load() {
  const seq = ++loadSeq
  const token = readOperatorToken()
  if (!token) {
    rows.value = []
    errorMessage.value = t('expertCaseReviews.failed')
    pending.value = false
    return
  }
  pending.value = true
  errorMessage.value = ''
  try {
    const query: { status?: string, limit: number } = { limit: PAGE_SIZE }
    if (filterStatus.value !== FILTER_ANY) {
      query.status = filterStatus.value
    }
    const list = await adminListExpertCaseReviews(config.public.apiBase, token, query)
    if (seq !== loadSeq) {
      return
    }
    rows.value = list
  } catch (error) {
    if (seq !== loadSeq) {
      return
    }
    rows.value = []
    errorMessage.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('expertCaseReviews.failed')
  } finally {
    if (seq === loadSeq) {
      pending.value = false
    }
  }
}

function statusLabel(status: unknown) {
  if (status === 'awaiting_review') {
    return t('expertCaseReviews.statusAwaiting')
  }
  if (status === 'reviewed') {
    return t('expertCaseReviews.statusReviewed')
  }
  return String(status ?? '')
}

function shortId(value: unknown) {
  const id = typeof value === 'string' ? value : ''
  return id ? `${id.slice(0, 8)}…` : '—'
}
</script>

<template>
  <PageHeader
    :title="$t('expertCaseReviews.title')"
    :description="$t('expertCaseReviews.subtitle')"
  >
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <USelect
        v-model="filterStatus"
        :items="statusOptions"
        value-key="value"
        label-key="label"
        class="w-48"
        data-testid="expert-case-status-filter"
      />
    </div>

    <p
      v-if="pending"
      class="text-sm text-muted"
      data-testid="expert-case-loading"
    >
      {{ $t('expertCaseReviews.loading') }}
    </p>
    <p
      v-else-if="errorMessage"
      class="text-sm text-error"
      data-testid="expert-case-error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-else-if="!rows.length"
      class="text-sm text-muted"
      data-testid="expert-case-empty"
    >
      {{ $t('expertCaseReviews.empty') }}
    </p>
    <div
      v-else
      class="overflow-x-auto rounded-xl border border-default"
    >
      <table class="min-w-full text-sm">
        <thead class="bg-elevated text-left text-muted">
          <tr>
            <th class="px-4 py-3 font-medium">
              {{ $t('expertCaseReviews.colId') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('expertCaseReviews.colUser') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('expertCaseReviews.colStatus') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('expertCaseReviews.colCreated') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('expertCaseReviews.colReviewed') }}
            </th>
            <th class="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="String(row.id)"
            class="border-t border-default"
            :data-testid="`expert-case-row-${row.id}`"
          >
            <td class="px-4 py-3 font-mono text-xs">
              {{ shortId(row.id) }}
            </td>
            <td class="px-4 py-3 font-mono text-xs">
              {{ shortId(row.user_id) }}
            </td>
            <td class="px-4 py-3">
              <UBadge
                :color="row.status === 'reviewed' ? 'success' : 'warning'"
                variant="soft"
              >
                {{ statusLabel(row.status) }}
              </UBadge>
            </td>
            <td class="px-4 py-3 text-muted">
              {{ row.created_at || '—' }}
            </td>
            <td class="px-4 py-3 text-muted">
              {{ row.reviewed_at || '—' }}
            </td>
            <td class="px-4 py-3 text-end">
              <UButton
                size="sm"
                variant="soft"
                :to="localePath(`/expert-case-reviews/${row.id}`)"
                data-testid="expert-case-open"
              >
                {{ $t('expertCaseReviews.open') }}
              </UButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </PageHeader>
</template>
