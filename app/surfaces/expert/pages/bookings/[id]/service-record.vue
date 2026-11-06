<script setup lang="ts">
import {
  getExpertStationBooking,
  parseServiceMethod,
  putExpertStationServiceRecord
} from '~/utils/expert-booking-api'
import { shortOrderCode } from '~/utils/expert-booking-calendar'
import { readOperatorToken } from '~/utils/operator-session'
import type { ExpertServiceMethod } from '~/utils/expert-booking-types'

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const config = useRuntimeConfig()
const session = useSessionStore()

const bookingId = computed(() => String(route.params.id ?? ''))
const expertId = computed(() => session.operator?.id || 'op-expert-wang')
const orderCode = ref('')
const pending = ref(true)
const saving = ref(false)
const errorMessage = ref('')

const form = reactive({
  actual_service_time: '2026-11-12 15:00-15:45',
  service_method: 'phone' as ExpertServiceMethod,
  content: '',
  sales_content: '',
  duration_minutes: '' as string,
  sales_result: '',
  deal_amount: '',
  follow_up: '',
  attachment_note: ''
})

const methodItems = computed(() => ([
  { label: t('expertStation.serviceRecord.methods.phone'), value: 'phone' },
  { label: t('expertStation.serviceRecord.methods.online_meeting'), value: 'online_meeting' },
  { label: t('expertStation.serviceRecord.methods.in_person'), value: 'in_person' },
  { label: t('expertStation.serviceRecord.methods.other'), value: 'other' }
]))

watch(bookingId, (id) => {
  void load(id)
}, { immediate: true })

async function load(id: string) {
  pending.value = true
  try {
    const token = readOperatorToken()
    if (!token) {
      throw new Error('no_token')
    }
    const row = await getExpertStationBooking(
      config.public.apiBase,
      token,
      expertId.value,
      id
    )
    orderCode.value = shortOrderCode(row.order_code)
    if (row.service_record) {
      form.actual_service_time = row.service_record.actual_service_time
      form.service_method = row.service_record.service_method
      form.content = row.service_record.content
      form.sales_content = row.service_record.sales_content
      form.duration_minutes = row.service_record.duration_minutes == null
        ? ''
        : String(row.service_record.duration_minutes)
      form.sales_result = row.service_record.sales_result || ''
      form.deal_amount = row.service_record.deal_amount == null
        ? ''
        : String(row.service_record.deal_amount)
      form.follow_up = row.service_record.follow_up || ''
      form.attachment_note = row.service_record.attachment_note || ''
    }
  } catch {
    errorMessage.value = t('expertBookings.notFound')
  } finally {
    pending.value = false
  }
}

async function onSave() {
  if (saving.value) {
    return
  }
  saving.value = true
  errorMessage.value = ''
  try {
    const token = readOperatorToken()
    if (!token) {
      throw new Error('no_token')
    }
    const durationRaw = form.duration_minutes.trim()
    const duration = durationRaw === '' ? null : Number(durationRaw)
    const dealRaw = form.deal_amount.trim()
    const deal = dealRaw === '' ? null : Number(dealRaw)
    await putExpertStationServiceRecord(
      config.public.apiBase,
      token,
      expertId.value,
      bookingId.value,
      {
        actual_service_time: form.actual_service_time,
        service_method: parseServiceMethod(form.service_method),
        content: form.content,
        sales_content: form.sales_content || '無',
        duration_minutes: Number.isFinite(duration) ? duration : null,
        sales_result: form.sales_result.trim() || null,
        deal_amount: Number.isFinite(deal) ? deal : null,
        follow_up: form.follow_up.trim() || null,
        attachment_note: form.attachment_note.trim() || null
      }
    )
    await navigateTo(localePath(`/bookings/${encodeURIComponent(bookingId.value)}`))
  } catch {
    errorMessage.value = t('expertBookings.failed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <p class="text-sm text-muted">
      {{ orderCode || bookingId }} / {{ $t('expertStation.detail.serviceRecord') }}
    </p>
    <h1 class="mt-2 text-2xl font-semibold text-highlighted">
      {{ $t('expertStation.serviceRecord.title') }}
    </h1>
    <p
      v-if="pending"
      class="mt-4 text-sm text-muted"
    >
      {{ $t('expertBookings.loading') }}
    </p>
    <div
      v-else
      class="mt-4 max-w-2xl space-y-4 rounded-xl border border-default bg-default p-4"
    >
      <UFormField
        :label="$t('expertStation.serviceRecord.actualTime')"
        required
      >
        <UInput
          v-model="form.actual_service_time"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="$t('expertStation.serviceRecord.method')"
        required
      >
        <USelect
          v-model="form.service_method"
          :items="methodItems"
          class="w-full"
        />
        <p class="mt-1 text-xs text-muted">
          {{ $t('expertStation.serviceRecord.methodHint') }}
        </p>
      </UFormField>
      <UFormField
        :label="$t('expertStation.serviceRecord.content')"
        required
      >
        <UTextarea
          v-model="form.content"
          :rows="3"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="$t('expertStation.serviceRecord.salesContent')"
        required
      >
        <UTextarea
          v-model="form.sales_content"
          :rows="2"
          :placeholder="$t('expertStation.serviceRecord.salesContentPlaceholder')"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="`${$t('expertStation.serviceRecord.duration')}（${$t('expertStation.serviceRecord.optional')}）`">
        <UInput
          v-model="form.duration_minutes"
          type="number"
          min="0"
          class="w-32"
        />
        <p class="mt-1 text-xs text-muted">
          {{ $t('expertStation.serviceRecord.durationHint') }}
        </p>
      </UFormField>
      <UFormField :label="`${$t('expertStation.serviceRecord.salesResult')}（${$t('expertStation.serviceRecord.optional')}）`">
        <UInput
          v-model="form.sales_result"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="`${$t('expertStation.serviceRecord.dealAmount')}（${$t('expertStation.serviceRecord.optional')}）`">
        <UInput
          v-model="form.deal_amount"
          type="number"
          class="w-40"
        />
        <p class="mt-1 text-xs text-muted">
          {{ $t('expertStation.serviceRecord.dealHint') }}
        </p>
      </UFormField>
      <UFormField :label="`${$t('expertStation.serviceRecord.followUp')}（${$t('expertStation.serviceRecord.optional')}）`">
        <UInput
          v-model="form.follow_up"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="`${$t('expertStation.serviceRecord.attachment')}（${$t('expertStation.serviceRecord.optional')}）`">
        <UInput
          v-model="form.attachment_note"
          class="w-full"
        />
      </UFormField>
      <p
        v-if="errorMessage"
        class="text-sm text-error"
      >
        {{ errorMessage }}
      </p>
      <UButton
        color="primary"
        :loading="saving"
        @click="onSave"
      >
        {{ $t('expertStation.serviceRecord.save') }}
      </UButton>
      <p class="text-xs text-muted">
        {{ $t('expertStation.serviceRecord.meta') }}
      </p>
    </div>
  </div>
</template>
