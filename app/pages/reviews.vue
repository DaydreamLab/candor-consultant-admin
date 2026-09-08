<script setup lang="ts">
import type { ReviewRow, ReviewKind, ReviewStatus } from '~/types/admin'

const { t } = useI18n()
const ops = useOpsStore()
const feedback = useOpsFeedback()
const { scoped, orgLabel, showOrg, writable, platform } = useOrgScope()

const selectedId = ref<string | null>(null)
const kindFilter = ref<'all' | ReviewKind>('all')

const scopedRows = computed(() => {
  const list = [...scoped(ops.reviews)]
  return list.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') {
      return -1
    }
    if (a.status !== 'pending' && b.status === 'pending') {
      return 1
    }
    return b.updatedAt.localeCompare(a.updatedAt)
  })
})

const counts = computed(() => ({
  all: scopedRows.value.length,
  manual: scopedRows.value.filter(row => row.kind === 'manual').length,
  clinical: scopedRows.value.filter(row => row.kind === 'clinical').length,
  pendingManual: scopedRows.value.filter(row => row.kind === 'manual' && row.status === 'pending').length,
  pendingClinical: scopedRows.value.filter(row => row.kind === 'clinical' && row.status === 'pending').length
}))

const rows = computed(() =>
  kindFilter.value === 'all'
    ? scopedRows.value
    : scopedRows.value.filter(row => row.kind === kindFilter.value)
)

const selected = computed(() => rows.value.find(row => row.id === selectedId.value) ?? null)

const colorForStatus: Record<ReviewStatus, 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error'
}

function kindLabel(kind: ReviewRow['kind']) {
  return kind === 'manual' ? t('reviews.manual') : t('reviews.clinical')
}

function statusLabel(status: ReviewStatus) {
  if (status === 'pending') {
    return t('reviews.statusPending')
  }
  if (status === 'approved') {
    return t('reviews.statusApproved')
  }
  return t('reviews.statusRejected')
}

function kindHint(kind: ReviewRow['kind']) {
  return kind === 'manual' ? t('reviews.manualHint') : t('reviews.clinicalHint')
}

function setFilter(next: 'all' | ReviewKind) {
  kindFilter.value = next
  if (selectedId.value && !rows.value.some(row => row.id === selectedId.value)) {
    selectedId.value = null
  }
}

function setStatus(row: ReviewRow, status: ReviewStatus) {
  if (!writable.value) {
    return
  }
  ops.setReviewStatus(row.id, status)
  feedback.notify({
    title: statusLabel(status),
    description: row.caseId,
    color: colorForStatus[status]
  })
}

watch(rows, (list) => {
  if (selectedId.value && !list.some(row => row.id === selectedId.value)) {
    selectedId.value = null
  }
})
</script>

<template>
  <PageHeader
    :title="$t('reviews.title')"
    :description="platform ? $t('reviews.subtitlePlatform') : $t('reviews.subtitleFirm')"
  >
    <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div class="min-w-0 max-w-2xl">
        <p class="text-base text-muted">
          {{ platform ? $t('reviews.notePlatform') : $t('reviews.noteFirm') }}
        </p>
        <p
          v-if="kindFilter !== 'all'"
          class="mt-2 text-sm text-dimmed"
        >
          {{ kindHint(kindFilter) }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          size="sm"
          :color="kindFilter === 'all' ? 'primary' : 'neutral'"
          :variant="kindFilter === 'all' ? 'soft' : 'ghost'"
          @click="setFilter('all')"
        >
          {{ $t('reviews.filterAll') }}
          <span class="ms-1 tabular-money text-dimmed">{{ counts.all }}</span>
        </UButton>
        <UButton
          size="md"
          :color="kindFilter === 'manual' ? 'primary' : 'neutral'"
          :variant="kindFilter === 'manual' ? 'subtle' : 'outline'"
          @click="setFilter('manual')"
        >
          {{ $t('reviews.manual') }}
          <span class="ms-2 text-sm text-warning">{{ $t('reviews.pendingCount', { n: counts.pendingManual }) }}</span>
        </UButton>
        <UButton
          size="md"
          :color="kindFilter === 'clinical' ? 'primary' : 'neutral'"
          :variant="kindFilter === 'clinical' ? 'subtle' : 'outline'"
          @click="setFilter('clinical')"
        >
          {{ $t('reviews.clinical') }}
          <span class="ms-2 text-sm text-warning">{{ $t('reviews.pendingCount', { n: counts.pendingClinical }) }}</span>
        </UButton>
      </div>
    </div>

    <SplitDetail>
      <AdminTable
        compact
        :empty="!rows.length"
      >
        <template #head>
          <tr>
            <th>{{ $t('reviews.colCase') }}</th>
            <th
              v-if="showOrg"
            >
              {{ $t('reviews.colOrg') }}
            </th>
            <th>{{ $t('reviews.colType') }}</th>
            <th>{{ $t('reviews.colStatus') }}</th>
          </tr>
        </template>
        <tr
          v-for="row in rows"
          :key="row.id"
          class="cursor-pointer border-b border-default last:border-0 hover:bg-muted/40"
          :class="row.id === selectedId ? 'bg-primary/5' : ''"
          @click="selectedId = row.id"
        >
          <td class="font-medium text-highlighted">
            {{ row.caseId }}
          </td>
          <td
            v-if="showOrg"
            class="text-muted"
          >
            {{ orgLabel(row.orgId) }}
          </td>
          <td>
            {{ kindLabel(row.kind) }}
          </td>
          <td>
            <StatusBadge
              :label="statusLabel(row.status)"
              :color="colorForStatus[row.status]"
            />
          </td>
        </tr>
      </AdminTable>

      <template #detail>
        <DetailPanel
          :open="Boolean(selected)"
          :title="selected?.caseId"
          :subtitle="selected ? kindLabel(selected.kind) : ''"
          :empty="$t('reviews.emptyDetail')"
          icon="i-lucide-badge-check"
          @close="selectedId = null"
        >
          <template v-if="selected">
            <div class="flex items-start justify-between gap-3">
              <p class="text-base text-muted">
                {{ kindHint(selected.kind) }}
                <span v-if="showOrg"> · {{ orgLabel(selected.orgId) }}</span>
              </p>
              <StatusBadge
                :label="statusLabel(selected.status)"
                :color="colorForStatus[selected.status]"
              />
            </div>
            <p class="mt-3 text-sm text-dimmed">
              {{ $t('reviews.colUpdated') }} · {{ selected.updatedAt }}
            </p>
          </template>
          <template #footer>
            <UButton
              color="error"
              variant="ghost"
              size="md"
              :disabled="!writable || selected?.status === 'rejected'"
              @click="selected && setStatus(selected, 'rejected')"
            >
              {{ $t('reviews.reject') }}
            </UButton>
            <UButton
              color="success"
              size="md"
              :disabled="!writable || selected?.status === 'approved'"
              @click="selected && setStatus(selected, 'approved')"
            >
              {{ $t('reviews.approve') }}
            </UButton>
          </template>
        </DetailPanel>
      </template>
    </SplitDetail>
  </PageHeader>
</template>
