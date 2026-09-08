<script setup lang="ts">
import type { ReviewRow, ReviewStatus } from '~/types/admin'

const { t } = useI18n()
const toast = useToast()
const ops = useOpsStore()
const { scoped, orgLabel, showOrg, writable, platform } = useOrgScope()

const rows = computed(() => scoped(ops.reviews))

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

function setStatus(row: ReviewRow, status: ReviewStatus) {
  if (!writable.value) {
    return
  }
  ops.setReviewStatus(row.id, status)
  toast.add({
    title: statusLabel(status),
    description: row.caseId,
    color: colorForStatus[status]
  })
}
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

    <AdminTable :empty="!rows.length">
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
          <th class="px-4 py-3 font-medium">
            {{ $t('reviews.colUpdated') }}
          </th>
          <th class="px-4 py-3 font-medium" />
        </tr>
      </template>
      <tr
        v-for="row in rows"
        :key="row.id"
        class="border-b border-default last:border-0"
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
        <td class="px-4 py-3 text-muted">
          {{ row.updatedAt }}
        </td>
        <td class="px-4 py-3">
          <div class="flex justify-end gap-2">
            <UButton
              size="xs"
              color="success"
              variant="outline"
              :disabled="!writable || row.status === 'approved'"
              @click="setStatus(row, 'approved')"
            >
              {{ $t('reviews.approve') }}
            </UButton>
            <UButton
              size="xs"
              color="error"
              variant="ghost"
              :disabled="!writable || row.status === 'rejected'"
              @click="setStatus(row, 'rejected')"
            >
              {{ $t('reviews.reject') }}
            </UButton>
          </div>
        </td>
      </tr>
    </AdminTable>
  </PageHeader>
</template>
