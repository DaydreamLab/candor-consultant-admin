<script setup lang="ts">
import type { OperatorRole } from '~/types/operator'
import {
  describeOperatorApiError,
  redirectToLoginOnAuthFailure
} from '~/utils/operator-auth-failure'
import { hasAdminRole, operatorRoles } from '~/utils/operator-roles'
import { readOperatorToken } from '~/utils/operator-session'
import { adminCreateOperator } from '~/utils/operators-api'

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t } = useI18n()
const session = useSessionStore()

const canManage = computed(() => hasAdminRole(operatorRoles(session.operator)))
const saving = ref(false)
const errorMessage = ref('')

if (import.meta.client) {
  watch(canManage, (ok) => {
    if (!ok) {
      void navigateTo(localePath('/'))
    }
  }, { immediate: true })
}

async function onSave(payload: {
  email?: string
  name: string
  roles: OperatorRole[]
  password?: string
}) {
  const token = readOperatorToken()
  if (!token || !canManage.value || !payload.email || !payload.password) {
    errorMessage.value = t('operators.saveFailed')
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    const created = await adminCreateOperator(config.public.apiBase, token, {
      email: payload.email,
      name: payload.name,
      roles: payload.roles,
      password: payload.password
    })
    await navigateTo(localePath(`/operators/${encodeURIComponent(created.id)}`))
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
    :title="$t('operators.createTitle')"
    plain
  >
    <OperatorForm
      v-if="canManage"
      mode="create"
      :operator="null"
      :saving="saving"
      :save-error="errorMessage"
      @save="onSave"
      @cancel="onCancel"
    />
  </PageHeader>
</template>
