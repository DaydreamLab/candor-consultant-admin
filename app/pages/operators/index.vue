<script setup lang="ts">
import type { AdminOperator } from '~/types/operator'
import { AdminApiError } from '~/utils/admin-api'
import { formatLocalDateTime } from '~/utils/format-local-datetime'
import {
  describeOperatorApiError,
  redirectToLoginOnAuthFailure
} from '~/utils/operator-auth-failure'
import { hasAdminRole, operatorRoles } from '~/utils/operator-roles'
import { readOperatorToken } from '~/utils/operator-session'
import { adminListOperators } from '~/utils/operators-api'

type OperatorColumn = 'email' | 'name' | 'roles' | 'status' | 'lastLogin' | 'actions'

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t } = useI18n()
const session = useSessionStore()

const operators = ref<AdminOperator[]>([])
const pending = ref(true)
const errorMessage = ref('')

const canManage = computed(() => hasAdminRole(operatorRoles(session.operator)))

const columns: { key: OperatorColumn, width?: string }[] = [
  { key: 'email', width: 'w-[16rem]' },
  { key: 'name', width: 'w-[10rem]' },
  { key: 'roles', width: 'w-[12rem]' },
  { key: 'status', width: 'w-[7rem]' },
  { key: 'lastLogin', width: 'w-[10rem]' },
  { key: 'actions', width: 'w-[6rem]' }
]

if (import.meta.client) {
  void load()
}

async function load() {
  const token = readOperatorToken()
  if (!token || !canManage.value) {
    operators.value = []
    errorMessage.value = canManage.value ? t('operators.failed') : t('operators.errors.forbidden')
    pending.value = false
    return
  }

  pending.value = true
  errorMessage.value = ''
  try {
    operators.value = await adminListOperators(config.public.apiBase, token)
  } catch (error) {
    if (await redirectToLoginOnAuthFailure(error)) {
      return
    }
    operators.value = []
    errorMessage.value = describeOperatorApiError(error, t)
      || (error instanceof AdminApiError && error.message.trim())
      || t('operators.failed')
  } finally {
    pending.value = false
  }
}

function columnLabel(key: OperatorColumn) {
  return t(`operators.columns.${key}`)
}

function rolesLabel(row: AdminOperator) {
  return row.roles.map(role => t(`roles.${role}`)).join('、')
}

function statusLabel(row: AdminOperator) {
  return t(`operators.status.${row.status}`)
}

function lastLoginLabel(row: AdminOperator) {
  if (!row.last_login_at) {
    return t('status.na')
  }
  return formatLocalDateTime(row.last_login_at) || row.last_login_at
}

function openCreate() {
  void navigateTo(localePath('/operators/new'))
}

function openEdit(row: AdminOperator) {
  void navigateTo(localePath(`/operators/${encodeURIComponent(row.id)}`))
}
</script>

<template>
  <PageHeader
    :title="$t('nav.operators')"
    :description="$t('operators.description')"
  >
    <template #actions>
      <UButton
        v-if="canManage"
        color="primary"
        icon="i-lucide-plus"
        data-testid="operators-create"
        @click="openCreate"
      >
        {{ $t('operators.create') }}
      </UButton>
    </template>

    <p
      v-if="errorMessage"
      class="mb-4 text-sm text-error"
      data-testid="operators-error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-else-if="pending"
      class="text-sm text-muted"
      data-testid="operators-loading"
    >
      {{ $t('operators.loading') }}
    </p>
    <p
      v-else-if="!operators.length"
      class="text-sm text-muted"
      data-testid="operators-empty"
    >
      {{ $t('operators.empty') }}
    </p>
    <div
      v-else
      class="overflow-x-auto"
      data-testid="operators-table"
    >
      <table class="w-full min-w-[48rem] border-collapse text-sm">
        <thead>
          <tr class="border-b border-default text-left text-muted">
            <th
              v-for="column in columns"
              :key="column.key"
              class="px-3 py-2 font-medium"
              :class="column.width"
            >
              {{ columnLabel(column.key) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in operators"
            :key="row.id"
            class="border-b border-default"
            :data-testid="`operators-row-${row.id}`"
          >
            <td class="px-3 py-2">
              {{ row.email }}
            </td>
            <td class="px-3 py-2">
              {{ row.name }}
            </td>
            <td
              class="px-3 py-2"
              data-testid="operators-row-roles"
            >
              {{ rolesLabel(row) }}
            </td>
            <td class="px-3 py-2">
              {{ statusLabel(row) }}
            </td>
            <td class="px-3 py-2">
              {{ lastLoginLabel(row) }}
            </td>
            <td class="px-3 py-2">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                data-testid="operators-edit"
                @click="openEdit(row)"
              >
                {{ $t('actions.edit') }}
              </UButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </PageHeader>
</template>
