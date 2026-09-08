<script setup lang="ts">
import type { ReviewRow, ReviewStatus } from '~/types/admin'

const { t } = useI18n()
const ops = useOpsStore()
const feedback = useOpsFeedback()
const { scoped, orgLabel, showOrg, writable, platform } = useOrgScope()

const selectedId = ref<string | null>(null)

const rows = computed(() => {
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
    <div class="mb-6 grid gap-3 md:grid-cols-2">
      <div class="rounded-xl border border-default bg-elevated p-4">
        <p class="font-medium text-highlighted">
          {{ $t('reviews.manual') }}
        </p>
        <p class="mt-1 text-sm text-muted">
          {{ $t('reviews.manualHint') }}
        </p>
      </div>
      <div class="rounded-xl border border-default bg-elevated p-4">
        <p class="font-medium text-highlighted">
          {{ $t('reviews.clinical') }}
        </p>
        <p class="mt-1 text-sm text-muted">
          {{ $t('reviews.clinicalHint') }}
        </p>
      </div>
    </div>

    <p class="mb-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted">
      {{ platform ? $t('reviews.notePlatform') : $t('reviews.noteFirm') }}
    </p>

    <SplitDetail>
      <AdminTable
        compact
        :empty="!rows.length"
      >
        <template #head>
          <tr>
            <th class="px-4 py-3 font-medium">
              {{ $t('reviews.colCase') }}
            </th>
            <th
              v-if="showOrg"
              class="px-4 py-3 font-medium"
            >
              {{ $t('reviews.colOrg') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('reviews.colType') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('reviews.colStatus') }}
            </th>
          </tr>
        </template>
        <tr
          v-for="row in rows"
          :key="row.id"
          class="cursor-pointer border-b border-default last:border-0 hover:bg-muted/40"
          :class="row.id === selectedId ? 'bg-primary/5' : ''"
          @click="selectedId = row.id"
        >
          <td class="px-4 py-3 font-medium text-highlighted">
            {{ row.caseId }}
          </td>
          <td
            v-if="showOrg"
            class="px-4 py-3 text-muted"
          >
            {{ orgLabel(row.orgId) }}
          </td>
          <td class="px-4 py-3">
            {{ kindLabel(row.kind) }}
          </td>
          <td class="px-4 py-3">
            <StatusBadge
              :label="statusLabel(row.status)"
              :color="colorForStatus[row.status]"
            />
          </td>
        </tr>
      </AdminTable>

      <template #detail>
        <div
          v-if="!selected"
          class="flex min-h-72 flex-col items-center justify-center p-6 text-center text-sm text-muted"
        >
          <UIcon
            name="i-lucide-badge-check"
            class="mb-2 size-8 text-dimmed"
          />
          {{ $t('reviews.emptyDetail') }}
        </div>
        <div
          v-else
          class="flex flex-col p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-medium text-highlighted">
                {{ selected.caseId }}
              </p>
              <p class="mt-1 text-sm text-muted">
                {{ kindLabel(selected.kind) }}
                <span v-if="showOrg"> · {{ orgLabel(selected.orgId) }}</span>
              </p>
            </div>
            <StatusBadge
              :label="statusLabel(selected.status)"
              :color="colorForStatus[selected.status]"
            />
          </div>
          <p class="mt-4 text-sm text-muted">
            {{ kindHint(selected.kind) }}
          </p>
          <p class="mt-2 text-xs text-dimmed">
            {{ $t('reviews.colUpdated') }} · {{ selected.updatedAt }}
          </p>
          <div class="mt-6 flex justify-end gap-2">
            <UButton
              color="error"
              variant="ghost"
              :disabled="!writable || selected.status === 'rejected'"
              @click="setStatus(selected, 'rejected')"
            >
              {{ $t('reviews.reject') }}
            </UButton>
            <UButton
              color="success"
              :disabled="!writable || selected.status === 'approved'"
              @click="setStatus(selected, 'approved')"
            >
              {{ $t('reviews.approve') }}
            </UButton>
          </div>
        </div>
      </template>
    </SplitDetail>
  </PageHeader>
</template>
