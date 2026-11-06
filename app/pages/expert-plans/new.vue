<script setup lang="ts">
import { hasOpsAdminRole, operatorRoles } from '~/utils/operator-roles'
import {
  AdminApiError,
  adminCreateExpertPlan,
  adminListPackagePlans,
  type ExpertPlanCreate
} from '~/utils/admin-api'
import { EXPERT_PLAN_FORM_ID, bindNavbarActions } from '~/composables/useNavbarActions'
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
const packagePlanOptions = ref<{ id: string, label: string }[]>([])
const optionsPending = ref(true)

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
    primaryForm: EXPERT_PLAN_FORM_ID,
    onPrimary: null
  })
}, { immediate: true })

if (import.meta.client) {
  watch(canCreate, (ok) => {
    if (!ok) {
      void navigateTo(localePath('/expert-plans'))
    }
  }, { immediate: true })

  void loadPackagePlans()
}

async function loadPackagePlans() {
  const token = readOperatorToken()
  if (!token) {
    packagePlanOptions.value = []
    optionsPending.value = false
    return
  }
  optionsPending.value = true
  try {
    const rows = await adminListPackagePlans(config.public.apiBase, token)
    packagePlanOptions.value = rows.map((row) => {
      const id = idOf(row)
      const zh = scalarText(row.name_zh).trim()
      const en = scalarText(row.name_en).trim()
      const label = zh || en || scalarText(row.code).trim() || id
      return { id, label }
    }).filter(row => row.id)
  } catch {
    packagePlanOptions.value = []
  } finally {
    optionsPending.value = false
  }
}

async function onSave(payload: ExpertPlanCreate | Record<string, unknown>) {
  const token = readOperatorToken()
  if (!token || !canCreate.value) {
    errorMessage.value = t('expertPlans.saveFailed')
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    const created = await adminCreateExpertPlan(
      config.public.apiBase,
      token,
      payload as ExpertPlanCreate
    )
    const id = idOf(created)
    if (id) {
      await navigateTo(localePath(`/expert-plans/${encodeURIComponent(id)}`))
      return
    }
    await navigateTo(localePath('/expert-plans'))
  } catch (error) {
    errorMessage.value = failText(error)
  } finally {
    saving.value = false
  }
}

function onCancel() {
  void navigateTo(localePath('/expert-plans'))
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

function scalarText(value: unknown) {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
}

function failText(error: unknown) {
  const message = error instanceof AdminApiError ? error.message.trim() : ''
  return message || t('expertPlans.saveFailed')
}
</script>

<template>
  <PageHeader
    :title="$t('expertPlans.createTitle')"
    plain
  >
    <p
      v-if="errorMessage"
      class="mb-4 text-sm text-error"
      data-testid="expert-plan-page-error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-if="optionsPending"
      class="text-sm text-muted"
    >
      {{ $t('expertPlans.loading') }}
    </p>
    <ExpertPlanForm
      v-else-if="canCreate"
      mode="create"
      :expert-plan="null"
      :package-plan-options="packagePlanOptions"
      :saving="saving"
      :save-error="errorMessage"
      @save="onSave"
      @cancel="onCancel"
    />
  </PageHeader>
</template>
