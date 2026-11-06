<script setup lang="ts">
import { hasOpsAdminRole, operatorRoles } from '~/utils/operator-roles'
import {
  AdminApiError,
  adminCreatePackagePlan,
  type PackagePlanCreate
} from '~/utils/admin-api'
import { PACKAGE_PLAN_FORM_ID, bindNavbarActions } from '~/composables/useNavbarActions'
import { readOperatorToken } from '~/utils/operator-session'

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t, locale } = useI18n()
const session = useSessionStore()
const { set } = bindNavbarActions()

const canCreate = computed(() => {
  const roles = operatorRoles(session.operator)
  return hasOpsAdminRole(roles)
})

const saving = ref(false)
const errorMessage = ref('')

watch([saving, locale, canCreate], () => {
  if (!canCreate.value) {
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
    primaryForm: PACKAGE_PLAN_FORM_ID,
    onPrimary: null
  })
}, { immediate: true })

if (import.meta.client) {
  watch(canCreate, (ok) => {
    if (!ok) {
      void navigateTo(localePath('/package-plans'))
    }
  }, { immediate: true })
}

async function onSave(payload: PackagePlanCreate | Record<string, unknown>) {
  const token = readOperatorToken()
  if (!token || !canCreate.value) {
    errorMessage.value = t('plans.saveFailed')
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    const created = await adminCreatePackagePlan(
      config.public.apiBase,
      token,
      payload as PackagePlanCreate
    )
    const id = idOf(created)
    if (id) {
      await navigateTo(localePath(`/package-plans/${encodeURIComponent(id)}`))
      return
    }
    await navigateTo(localePath('/package-plans'))
  } catch (error) {
    errorMessage.value = failText(error)
  } finally {
    saving.value = false
  }
}

function onCancel() {
  void navigateTo(localePath('/package-plans'))
}

function idOf(row: Record<string, unknown>) {
  const id = row.id
  if (typeof id === 'string' && id.trim()) {
    return id.trim()
  }
  if (typeof id === 'number' && Number.isFinite(id)) {
    return String(id)
  }
  return ''
}

function failText(error: unknown) {
  const message = error instanceof AdminApiError ? error.message.trim() : ''
  return message || t('plans.saveFailed')
}
</script>

<template>
  <PageHeader
    :title="$t('plans.createTitle')"
    plain
  >
    <p
      v-if="errorMessage"
      class="mb-4 text-sm text-error"
      data-testid="package-plan-page-error"
    >
      {{ errorMessage }}
    </p>
    <PackagePlanForm
      v-if="canCreate"
      mode="create"
      :package-plan="null"
      :saving="saving"
      :save-error="errorMessage"
      @save="onSave"
      @cancel="onCancel"
    />
  </PageHeader>
</template>
