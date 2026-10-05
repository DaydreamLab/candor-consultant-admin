<script setup lang="ts">
import { AdminApiError, adminGetPackagePlan, adminUpdatePackagePlan, type PackagePlanWrite } from '~/utils/admin-api'
import { PACKAGE_PLAN_FORM_ID, bindNavbarActions } from '~/composables/useNavbarActions'
import { normalizeAdminPath } from '~/utils/nav'
import { readOperatorToken } from '~/utils/operator-session'

const config = useRuntimeConfig()
const route = useRoute()
const { t, locale } = useI18n()
const session = useSessionStore()
const crumbLabel = usePackagePlanCrumbLabel()
const { set } = bindNavbarActions()

const packagePlanId = computed(() => String(route.params.id ?? ''))
const title = computed(() => crumbLabel.value || packagePlanId.value)
const canEdit = computed(() => session.operator?.role !== 'expert')

const packagePlan = ref<Record<string, unknown> | null>(null)
const pending = ref(true)
const saving = ref(false)
const errorMessage = ref('')

watch([saving, pending, packagePlan, locale, canEdit], () => {
  if (pending.value || !packagePlan.value || !canEdit.value) {
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
  watch(packagePlanId, (id) => {
    void load(id)
  }, { immediate: true })
}

onUnmounted(() => {
  if (!normalizeAdminPath(route.path).startsWith('/package-plans/')) {
    crumbLabel.value = null
  }
})

async function load(id: string) {
  crumbLabel.value = null
  packagePlan.value = null
  errorMessage.value = ''

  const token = readOperatorToken()
  if (!token || !id) {
    pending.value = false
    errorMessage.value = t('packagePlans.failed')
    return
  }

  pending.value = true
  try {
    const row = await adminGetPackagePlan(config.public.apiBase, token, id)
    if (packagePlanId.value !== id) {
      return
    }
    packagePlan.value = row
    crumbLabel.value = planName(row)
    errorMessage.value = ''
  } catch (error) {
    if (packagePlanId.value !== id) {
      return
    }
    packagePlan.value = null
    errorMessage.value = failText(error, t('packagePlans.failed'))
  } finally {
    if (packagePlanId.value === id) {
      pending.value = false
    }
  }
}

async function onSave(payload: PackagePlanWrite) {
  const token = readOperatorToken()
  const id = packagePlanId.value
  if (!token || !id || !canEdit.value) {
    errorMessage.value = t('packagePlans.saveFailed')
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    const row = await adminUpdatePackagePlan(config.public.apiBase, token, id, payload)
    if (packagePlanId.value !== id) {
      return
    }
    packagePlan.value = row
    crumbLabel.value = planName(row)
  } catch (error) {
    if (packagePlanId.value !== id) {
      return
    }
    errorMessage.value = failText(error, t('packagePlans.saveFailed'))
  } finally {
    if (packagePlanId.value === id) {
      saving.value = false
    }
  }
}

function planName(row: Record<string, unknown>) {
  return scalarText(row.name_zh).trim() || scalarText(row.name).trim() || null
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

function failText(error: unknown, fallback: string) {
  const message = error instanceof AdminApiError ? error.message.trim() : ''
  return message || fallback
}
</script>

<template>
  <PageHeader
    :title="title"
    plain
  >
    <p
      v-if="errorMessage && !packagePlan"
      class="mb-4 text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('packagePlans.loading') }}
    </p>
    <PackagePlanForm
      v-else-if="packagePlan"
      :disabled="!canEdit"
      :package-plan="packagePlan"
      :saving="saving"
      :save-error="errorMessage"
      @save="onSave"
    />
  </PageHeader>
</template>
