<script setup lang="ts">
import { statusBadgeColor, listAdminExpertBookings } from '~/utils/expert-booking-api'
import { preferredSlotsLabel, shortOrderCode } from '~/utils/expert-booking-calendar'
import { formatLocalDateTime } from '~/utils/format-local-datetime'
import { readOperatorToken } from '~/utils/operator-session'
import type { ExpertBookingListItem } from '~/utils/expert-booking-types'

const localePath = useLocalePath()
const { t } = useI18n()
const config = useRuntimeConfig()

const pending = ref(true)
const errorMessage = ref('')
const rows = ref<ExpertBookingListItem[]>([])

onMounted(() => {
  void load()
})

async function load() {
  pending.value = true
  errorMessage.value = ''
  try {
    const token = readOperatorToken()
    if (!token) {
      throw new Error('no_token')
    }
    const result = await listAdminExpertBookings(config.public.apiBase, token, {
      page: 1,
      page_size: 50
    })
    rows.value = result.items
  } catch {
    errorMessage.value = t('expertBookings.failed')
    rows.value = []
  } finally {
    pending.value = false
  }
}

function confirmedLabel(row: ExpertBookingListItem) {
  if (!row.confirmed_at) {
    return '—'
  }
  return formatLocalDateTime(row.confirmed_at, { style: 'list' })
}
</script>

<template>
  <PageHeader
    :title="$t('nav.expertBookings')"
    :description="$t('expertBookings.description')"
    plain
  >
    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('expertBookings.loading') }}
    </p>
    <p
      v-else-if="errorMessage"
      class="text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <div
      v-else-if="!rows.length"
      class="rounded-xl border border-dashed border-default px-4 py-10 text-center text-sm text-muted"
    >
      {{ $t('expertBookings.empty') }}
    </div>
    <div
      v-else
      class="overflow-x-auto rounded-xl border border-default"
      data-testid="expert-bookings-table"
    >
      <table class="min-w-full text-sm">
        <thead class="bg-elevated text-left text-muted">
          <tr>
            <th class="px-4 py-3 font-medium">
              {{ $t('expertBookings.columns.order') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('expertBookings.columns.member') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('expertBookings.columns.status') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('expertBookings.columns.confirmedAt') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('expertBookings.columns.expert') }}
            </th>
            <th class="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.id"
            class="border-t border-default"
          >
            <td class="px-4 py-3 font-mono text-xs">
              {{ shortOrderCode(row.order_code) }}
            </td>
            <td class="px-4 py-3">
              <div class="font-medium text-highlighted">
                {{ row.member_name }}
              </div>
              <div class="text-xs text-muted">
                {{ preferredSlotsLabel(row.preferred_slots) }}
              </div>
            </td>
            <td class="px-4 py-3">
              <UBadge
                :color="statusBadgeColor(row.status)"
                variant="subtle"
              >
                {{ $t(`expertBookings.status.${row.status}`) }}
              </UBadge>
            </td>
            <td class="px-4 py-3">
              {{ confirmedLabel(row) }}
            </td>
            <td class="px-4 py-3">
              {{ row.annotated_expert_name || '—' }}
            </td>
            <td class="px-4 py-3 text-right">
              <UButton
                size="sm"
                variant="soft"
                :to="localePath(`/expert-bookings/${encodeURIComponent(row.id)}`)"
              >
                {{ $t('expertBookings.details') }}
              </UButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </PageHeader>
</template>
