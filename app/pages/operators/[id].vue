<script setup lang="ts">
import type { AdminOperator, OperatorRole, OperatorStatus } from '~/types/operator'
import {
  describeOperatorApiError,
  redirectToLoginOnAuthFailure
} from '~/utils/operator-auth-failure'
import { hasAdminRole, operatorRoles } from '~/utils/operator-roles'
import { readOperatorToken } from '~/utils/operator-session'
import {
  adminGetOperator,
  adminPatchOperator,
  adminResetOperatorPassword
} from '~/utils/operators-api'

const config = useRuntimeConfig()
const localePath = useLocalePath()
const route = useRoute()
const { t } = useI18n()
const session = useSessionStore()
const feedback = useOpsFeedback()

const canManage = computed(() => hasAdminRole(operatorRoles(session.operator)))
const operatorId = computed(() => String(route.params.id ?? ''))
const operator = ref<AdminOperator | null>(null)
const pending = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const loadError = ref('')

if (import.meta.client) {
  watch(canManage, (ok) => {
    if (!ok) {
      void navigateTo(localePath('/'))
    }
  }, { immediate: true })

  watch(operatorId, () => {
    void load()
  }, { immediate: true })
}

async function load() {
  const token = readOperatorToken()
  const id = operatorId.value
  if (!token || !canManage.value || !id) {
    operator.value = null
    loadError.value = canManage.value ? t('operators.failed') : t('operators.errors.forbidden')
    pending.value = false
    return
  }

  pending.value = true
  loadError.value = ''
  errorMessage.value = ''
  try {
    operator.value = await adminGetOperator(config.public.apiBase, token, id)
  } catch (error) {
    if (await redirectToLoginOnAuthFailure(error)) {
      return
    }
    operator.value = null
    loadError.value = describeOperatorApiError(error, t)
  } finally {
    pending.value = false
  }
}

async function onSave(payload: {
  name: string
  roles: OperatorRole[]
  status?: OperatorStatus
}) {
  const token = readOperatorToken()
  const id = operatorId.value
  if (!token || !canManage.value || !id) {
    errorMessage.value = t('operators.saveFailed')
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    operator.value = await adminPatchOperator(config.public.apiBase, token, id, {
      name: payload.name,
      roles: payload.roles,
      status: payload.status
    })
    feedback.notify({
      title: t('operators.saveOk'),
      color: 'success'
    })
  } catch (error) {
    if (await redirectToLoginOnAuthFailure(error)) {
      return
    }
    errorMessage.value = describeOperatorApiError(error, t)
  } finally {
    saving.value = false
  }
}

async function onResetPassword(password: string) {
  const token = readOperatorToken()
  const id = operatorId.value
  if (!token || !canManage.value || !id) {
    errorMessage.value = t('operators.saveFailed')
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    await adminResetOperatorPassword(config.public.apiBase, token, id, password)
    feedback.notify({
      title: t('operators.resetPasswordOk'),
      color: 'success'
    })
  } catch (error) {
    if (await redirectToLoginOnAuthFailure(error)) {
      return
    }
    errorMessage.value = describeOperatorApiError(error, t)
  } finally {
    saving.value = false
  }
}

function onCancel() {
  void navigateTo(localePath('/operators'))
}
</script>

<template>
  <PageHeader
    :title="operator?.name || $t('operators.editTitle')"
    plain
  >
    <p
      v-if="loadError"
      class="text-sm text-error"
      data-testid="operator-edit-load-error"
    >
      {{ loadError }}
    </p>
    <p
      v-else-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('operators.loading') }}
    </p>
    <OperatorForm
      v-else-if="operator && canManage"
      mode="edit"
      :operator="operator"
      :saving="saving"
      :save-error="errorMessage"
      @save="onSave"
      @cancel="onCancel"
      @reset-password="onResetPassword"
    />
  </PageHeader>
</template>
