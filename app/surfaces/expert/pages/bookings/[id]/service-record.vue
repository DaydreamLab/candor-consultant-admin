<script setup lang="ts">
import {
  getExpertStationBooking,
  putExpertStationServiceRecord,
  uploadExpertStationAttachment
} from '~/utils/expert-booking-api'
import { formatLocalDateTime } from '~/utils/format-local-datetime'
import { readOperatorToken } from '~/utils/operator-session'
import type { ExpertBookingAttachment } from '~/utils/expert-booking-types'

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const config = useRuntimeConfig()
const session = useSessionStore()

const bookingId = computed(() => String(route.params.id ?? ''))
const expertId = computed(() => session.operator?.id || 'op-expert-wang')
const contactName = ref('')
const pending = ref(true)
const saving = ref(false)
const uploading = ref(false)
const errorMessage = ref('')
const filledBy = ref<string | null>(null)
const filledAt = ref<string | null>(null)

const form = reactive({
  served_at: '2026-04-10T18:00',
  service_method: '電話',
  content: '',
  sales_content: '',
  duration_minutes: '' as string,
  sales_result: '',
  deal_amount: '',
  follow_up: ''
})

const attachments = ref<ExpertBookingAttachment[]>([])

const methodItems = computed(() => ([
  { label: t('expertStation.serviceRecord.methods.phone'), value: '電話' },
  { label: t('expertStation.serviceRecord.methods.online_meeting'), value: '線上會議' },
  { label: t('expertStation.serviceRecord.methods.in_person'), value: '面談' },
  { label: t('expertStation.serviceRecord.methods.other'), value: '其他' }
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
    contactName.value = row.contact_name
    if (row.service_record) {
      form.served_at = row.service_record.served_at.replace('Z', '').slice(0, 16)
      form.service_method = row.service_record.service_method
      form.content = row.service_record.content
      form.sales_content = row.service_record.sales_content === '無'
        ? ''
        : row.service_record.sales_content
      form.duration_minutes = row.service_record.duration_minutes == null
        ? ''
        : String(row.service_record.duration_minutes)
      form.sales_result = row.service_record.sales_result || ''
      form.deal_amount = row.service_record.deal_amount == null
        ? ''
        : String(row.service_record.deal_amount)
      form.follow_up = row.service_record.follow_up || ''
      attachments.value = [...row.service_record.attachments]
      filledBy.value = row.service_record.filled_by_operator_id
      filledAt.value = row.service_record.filled_at
    }
  } catch {
    errorMessage.value = t('expertBookings.notFound')
  } finally {
    pending.value = false
  }
}

function toIso(local: string) {
  const trimmed = local.trim().replace(' ', 'T')
  if (/[+-]\d{2}:?\d{2}$|Z$/i.test(trimmed)) {
    return trimmed
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00+08:00`
  }
  return `${trimmed}:00+08:00`
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || attachments.value.length >= 5) {
    return
  }
  uploading.value = true
  errorMessage.value = ''
  try {
    const token = readOperatorToken()
    if (!token) {
      throw new Error('no_token')
    }
    const uploaded = await uploadExpertStationAttachment(
      config.public.apiBase,
      token,
      bookingId.value,
      file,
      file.name
    )
    attachments.value = [...attachments.value, uploaded]
  } catch {
    errorMessage.value = t('expertStation.serviceRecord.uploadFailed')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function removeAttachment(key: string) {
  attachments.value = attachments.value.filter(a => a.key !== key)
}

async function onSave() {
  if (saving.value) {
    return
  }
  if (!form.served_at.trim() || !form.service_method.trim() || !form.content.trim()) {
    errorMessage.value = t('expertStation.serviceRecord.required')
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
    const saved = await putExpertStationServiceRecord(
      config.public.apiBase,
      token,
      expertId.value,
      bookingId.value,
      {
        served_at: toIso(form.served_at),
        service_method: form.service_method.trim(),
        content: form.content.trim(),
        sales_content: form.sales_content.trim() || '無',
        duration_minutes: Number.isFinite(duration) && duration !== null && duration >= 1
          ? duration
          : null,
        sales_result: form.sales_result.trim() || null,
        deal_amount: Number.isFinite(deal) && deal !== null && deal >= 0 ? deal : null,
        follow_up: form.follow_up.trim() || null,
        attachments: attachments.value
      }
    )
    filledBy.value = saved.filled_by_operator_id
    filledAt.value = saved.filled_at
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
      {{ contactName || bookingId }} / {{ $t('expertStation.detail.serviceRecord') }}
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
        :label="$t('expertStation.serviceRecord.servedAt')"
        required
      >
        <UInput
          v-model="form.served_at"
          type="datetime-local"
          class="w-full"
          data-testid="service-record-served-at"
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
      <UFormField :label="$t('expertStation.serviceRecord.salesContent')">
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
          min="1"
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
          min="0"
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
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          :disabled="uploading || attachments.length >= 5"
          data-testid="service-record-attachment-input"
          @change="onFileChange"
        >
        <ul
          v-if="attachments.length"
          class="mt-2 space-y-1 text-sm"
        >
          <li
            v-for="file in attachments"
            :key="file.key"
            class="flex items-center justify-between gap-2"
          >
            <span>{{ file.filename }} ({{ file.size_bytes }} B)</span>
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              @click="removeAttachment(file.key)"
            >
              {{ $t('expertStation.serviceRecord.removeAttachment') }}
            </UButton>
          </li>
        </ul>
      </UFormField>
      <p
        v-if="filledBy || filledAt"
        class="text-xs text-muted"
        data-testid="service-record-filled-meta"
      >
        filled_by_operator_id={{ filledBy || '—' }}
        · filled_at={{ filledAt ? formatLocalDateTime(filledAt, { style: 'list' }) : '—' }}
      </p>
      <p
        v-if="errorMessage"
        class="text-sm text-error"
      >
        {{ errorMessage }}
      </p>
      <UButton
        color="primary"
        :loading="saving"
        data-testid="service-record-save"
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
