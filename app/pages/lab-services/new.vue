<script setup lang="ts">
import { LAB_SERVICE_FORM_ID, bindNavbarActions } from '~/composables/useNavbarActions'
import type { LabServiceWrite } from '~/utils/lab-service-mock'

const localePath = useLocalePath()
const { t, locale } = useI18n()
const store = useLabServiceMockStore()
const { set } = bindNavbarActions()

const saving = ref(false)
const errorMessage = ref('')

watch([saving, locale], () => {
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

async function onSave(payload: LabServiceWrite) {
  saving.value = true
  errorMessage.value = ''
  try {
    const created = store.createService(payload)
    await navigateTo(localePath(`/lab-services/${encodeURIComponent(created.id)}`))
  } catch {
    errorMessage.value = t('labServices.saveFailed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageHeader plain>
    <p
      v-if="errorMessage"
      class="mb-4 text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <LabServiceForm
      mode="create"
      :lab-service="null"
      :saving="saving"
      :save-error="errorMessage"
      @save="onSave"
    />
  </PageHeader>
</template>
