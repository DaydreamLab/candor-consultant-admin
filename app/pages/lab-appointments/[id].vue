<script setup lang="ts">
import { money } from '~/utils/format'
import { normalizeAdminPath } from '~/utils/nav'
import type { LabAppointmentMock } from '~/utils/lab-service-mock'

const route = useRoute()
const { t, locale } = useI18n()
const store = useLabServiceMockStore()
const crumbLabel = useLabAppointmentCrumbLabel()
const { set } = bindNavbarActions()

const appointmentId = computed(() => String(route.params.id ?? ''))
const title = computed(() => crumbLabel.value || appointmentId.value)

const appointment = ref<LabAppointmentMock | null>(null)
const pending = ref(true)
const cancelling = ref(false)
const errorMessage = ref('')

const canCancel = computed(() => appointment.value?.status === 'booked')

watch([cancelling, pending, appointment, locale, canCancel], () => {
  if (pending.value || !appointment.value || !canCancel.value) {
    set(null)
    return
  }
  set({
    showDelete: false,
    deleteDisabled: false,
    deleting: false,
    busy: cancelling.value,
    onDelete: () => {},
    primaryLabel: t('labAppointments.actions.cancel'),
    primaryLoading: cancelling.value,
    primaryForm: null,
    onPrimary: () => {
      onCancel()
    }
  })
}, { immediate: true })

watch(appointmentId, (id) => {
  load(id)
}, { immediate: true })

onUnmounted(() => {
  if (!normalizeAdminPath(route.path).startsWith('/lab-appointments/')) {
    crumbLabel.value = null
  }
})

function load(id: string) {
  crumbLabel.value = null
  appointment.value = null
  errorMessage.value = ''
  pending.value = true
  if (!id) {
    pending.value = false
    errorMessage.value = t('labAppointments.failed')
    return
  }
  const row = store.getAppointment(id)
  if (!row) {
    pending.value = false
    errorMessage.value = t('labAppointments.notFound')
    return
  }
  appointment.value = row
  crumbLabel.value = row.user_display_name || row.id
  pending.value = false
}

function onCancel() {
  const id = appointmentId.value
  if (!id || !canCancel.value) {
    return
  }
  cancelling.value = true
  errorMessage.value = ''
  const row = store.cancelAppointment(id)
  if (!row) {
    errorMessage.value = t('labAppointments.cancelFailed')
    cancelling.value = false
    return
  }
  appointment.value = row
  crumbLabel.value = row.user_display_name || row.id
  cancelling.value = false
}

function serviceName(row: LabAppointmentMock) {
  return String(locale.value).startsWith('en')
    ? (row.lab_service_name_en || row.lab_service_name_zh)
    : (row.lab_service_name_zh || row.lab_service_name_en)
}

function itemName(item: LabAppointmentMock['selected_items'][number]) {
  return String(locale.value).startsWith('en')
    ? (item.name_en || item.name_zh)
    : (item.name_zh || item.name_en)
}
</script>

<template>
  <PageHeader
    :title="title"
    :description="$t('labAppointments.detailDescription')"
    plain
  >
    <p
      v-if="errorMessage && !appointment"
      class="mb-4 text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('labAppointments.loading') }}
    </p>
    <div
      v-else-if="appointment"
      class="flex flex-col gap-4"
    >
      <p
        v-if="errorMessage"
        class="text-sm text-error"
      >
        {{ errorMessage }}
      </p>

      <dl class="grid gap-3 rounded-xl border border-default bg-elevated p-4 text-sm md:grid-cols-2">
        <div>
          <dt class="text-muted">
            {{ $t('labAppointments.fields.member') }}
          </dt>
          <dd class="mt-1 font-medium text-highlighted">
            {{ appointment.user_display_name }}
          </dd>
          <dd class="text-xs text-muted">
            {{ appointment.user_email }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            {{ $t('labAppointments.fields.status') }}
          </dt>
          <dd class="mt-1">
            <UBadge
              :color="appointment.status === 'booked' ? 'success' : 'neutral'"
              variant="subtle"
            >
              {{ $t(`labAppointments.status.${appointment.status}`) }}
            </UBadge>
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            {{ $t('labAppointments.fields.service') }}
          </dt>
          <dd class="mt-1 font-medium text-highlighted">
            {{ serviceName(appointment) }}
          </dd>
          <dd class="text-xs text-muted">
            {{ appointment.lab_service_code }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            {{ $t('labAppointments.fields.partner') }}
          </dt>
          <dd class="mt-1 font-medium text-highlighted">
            {{ appointment.partner_name }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            {{ $t('labAppointments.fields.slot') }}
          </dt>
          <dd class="mt-1 font-medium text-highlighted">
            {{ appointment.appointment_date }}
            {{ appointment.window_start }}–{{ appointment.window_end }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            {{ $t('labAppointments.fields.amount') }}
          </dt>
          <dd class="tabular-money mt-1 font-medium text-highlighted">
            {{ money(appointment.amount_total) }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            {{ $t('labAppointments.fields.booked_at') }}
          </dt>
          <dd class="mt-1 font-medium text-highlighted">
            {{ appointment.booked_at }}
          </dd>
        </div>
        <div v-if="appointment.cancelled_at">
          <dt class="text-muted">
            {{ $t('labAppointments.fields.cancelled_at') }}
          </dt>
          <dd class="mt-1 font-medium text-highlighted">
            {{ appointment.cancelled_at }}
          </dd>
        </div>
      </dl>

      <section class="rounded-xl border border-default bg-elevated p-4">
        <h2 class="text-sm font-semibold text-highlighted">
          {{ $t('labAppointments.fields.selected_items') }}
        </h2>
        <ul class="mt-3 divide-y divide-default">
          <li
            v-for="item in appointment.selected_items"
            :key="item.item_id"
            class="flex items-center justify-between gap-3 py-2 text-sm"
          >
            <div>
              <p class="font-medium text-highlighted">
                {{ itemName(item) }}
              </p>
              <p class="text-xs text-muted">
                {{ item.required ? $t('labAppointments.required') : $t('labAppointments.optional') }}
              </p>
            </div>
            <p class="tabular-money font-medium text-highlighted">
              {{ money(item.unit_price) }}
            </p>
          </li>
        </ul>
      </section>

      <p
        v-if="!canCancel"
        class="text-sm text-muted"
      >
        {{ $t('labAppointments.cancelledHint') }}
      </p>
    </div>
  </PageHeader>
</template>
