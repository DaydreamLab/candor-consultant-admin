<script setup lang="ts">
import { LAB_SERVICE_FORM_ID, bindNavbarActions } from '~/composables/useNavbarActions'
import { normalizeAdminPath } from '~/utils/nav'
import type { LabServiceMock, LabServiceWrite } from '~/utils/lab-service-mock'

const route = useRoute()
const { t, locale } = useI18n()
const session = useSessionStore()
const store = useLabServiceMockStore()
const crumbLabel = useLabServiceCrumbLabel()
const { set } = bindNavbarActions()

const serviceId = computed(() => String(route.params.id ?? ''))
const title = computed(() => crumbLabel.value || serviceId.value)
const canEdit = computed(() => session.operator?.role !== 'expert')

const labService = ref<LabServiceMock | null>(null)
const pending = ref(true)
const saving = ref(false)
const errorMessage = ref('')

watch([saving, pending, labService, locale, canEdit], () => {
  if (pending.value || !labService.value || !canEdit.value) {
    set(null)
    return
  }
  set({
    showDelete: false,
    deleteDisabled: false,
    deleting: false,
    busy: saving.value,
    onDelete: () => {},
    primaryLabel: t('actions.save'),
    primaryLoading: saving.value,
    primaryForm: LAB_SERVICE_FORM_ID,
    onPrimary: null
  })
}, { immediate: true })

watch(serviceId, (id) => {
  load(id)
}, { immediate: true })

onUnmounted(() => {
  if (!normalizeAdminPath(route.path).startsWith('/lab-services/')) {
    crumbLabel.value = null
  }
})

function load(id: string) {
  crumbLabel.value = null
  labService.value = null
  errorMessage.value = ''
  pending.value = true
  if (!id) {
    pending.value = false
    errorMessage.value = t('labServices.failed')
    return
  }
  const row = store.getService(id)
  if (!row) {
    pending.value = false
    errorMessage.value = t('labServices.notFound')
    return
  }
  labService.value = row
  crumbLabel.value = serviceName(row)
  pending.value = false
}

function onSave(payload: LabServiceWrite) {
  const id = serviceId.value
  if (!id || !canEdit.value) {
    errorMessage.value = t('labServices.saveFailed')
    return
  }
  saving.value = true
  errorMessage.value = ''
  const row = store.updateService(id, payload)
  if (!row) {
    errorMessage.value = t('labServices.saveFailed')
    saving.value = false
    return
  }
  labService.value = row
  crumbLabel.value = serviceName(row)
  saving.value = false
}

function serviceName(row: LabServiceMock) {
  return String(locale.value).startsWith('en')
    ? (row.name_en || row.name_zh || null)
    : (row.name_zh || row.name_en || null)
}
</script>

<template>
  <PageHeader
    :title="title"
    plain
  >
    <p
      v-if="errorMessage && !labService"
      class="mb-4 text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('labServices.loading') }}
    </p>
    <LabServiceForm
      v-else-if="labService"
      mode="edit"
      :disabled="!canEdit"
      :lab-service="labService"
      :saving="saving"
      :save-error="errorMessage"
      @save="onSave"
    />
  </PageHeader>
</template>
