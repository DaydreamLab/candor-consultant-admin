<script setup lang="ts">
import {
  AdminApiError,
  adminListExpertPlans,
  adminUpdateExpertPlan,
  isExpertPlanFieldForbiddenError
} from '~/utils/admin-api'
import { money } from '~/utils/format'
import { readOperatorToken } from '~/utils/operator-session'

type PlanColumn = 'sort_order' | 'name' | 'price' | 'active' | 'actions'

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t } = useI18n()
const session = useSessionStore()
const feedback = useOpsFeedback()

const expertPlans = ref<Record<string, unknown>[]>([])
const pending = ref(true)
const errorMessage = ref('')
const actionId = ref<string | null>(null)
const deactivateOpen = ref(false)
const deactivateTarget = ref<Record<string, unknown> | null>(null)

/** ops／admin can edit; expert can only activate／deactivate (B-03／C22). */
const canEdit = computed(() => {
  const role = session.operator?.role
  return role === 'ops' || role === 'admin'
})

const sortedPlans = computed(() => {
  return [...expertPlans.value].sort((a, b) => {
    const sa = numberOf(a.sort_order) ?? 0
    const sb = numberOf(b.sort_order) ?? 0
    if (sa !== sb) {
      return sa - sb
    }
    return nameOf(a).localeCompare(nameOf(b), 'zh-Hant')
  })
})

const columns: { key: PlanColumn, align: 'left' | 'right', width?: string }[] = [
  { key: 'sort_order', align: 'left', width: 'w-[5rem]' },
  { key: 'name', align: 'left' },
  { key: 'price', align: 'right', width: 'w-[8rem]' },
  { key: 'active', align: 'left', width: 'w-[7rem]' },
  { key: 'actions', align: 'right', width: 'w-[14rem]' }
]

if (import.meta.client) {
  void load()
}

async function load() {
  const token = readOperatorToken()
  if (!token) {
    expertPlans.value = []
    errorMessage.value = t('expertPlans.failed')
    pending.value = false
    return
  }

  pending.value = true
  errorMessage.value = ''
  try {
    expertPlans.value = await adminListExpertPlans(config.public.apiBase, token)
  } catch (error) {
    expertPlans.value = []
    const message = error instanceof AdminApiError ? error.message.trim() : ''
    errorMessage.value = message || t('expertPlans.failed')
  } finally {
    pending.value = false
  }
}

function columnLabel(key: PlanColumn) {
  return t(`expertPlans.columns.${key}`)
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

function rowKey(row: Record<string, unknown>, index: number) {
  return idOf(row) || `expert-plan-${index}`
}

function nameOf(row: Record<string, unknown>) {
  return textValue(row.name_zh) || textValue(row.name) || t('status.na')
}

function priceOf(row: Record<string, unknown>) {
  const n = numberOf(row.price)
  return n == null ? t('status.na') : money(n)
}

function sortOf(row: Record<string, unknown>) {
  const n = numberOf(row.sort_order)
  return n == null ? t('status.na') : String(n)
}

function isActive(row: Record<string, unknown>) {
  return row.active !== false
}

function openEdit(row: Record<string, unknown>) {
  const id = idOf(row)
  if (!id || !canEdit.value) {
    return
  }
  void navigateTo(localePath(`/expert-plans/${encodeURIComponent(id)}`))
}

async function activate(row: Record<string, unknown>) {
  const id = idOf(row)
  const token = readOperatorToken()
  if (!id || !token || actionId.value || isActive(row)) {
    return
  }
  actionId.value = id
  try {
    const updated = await adminUpdateExpertPlan(config.public.apiBase, token, id, { active: true })
    replaceRow(id, updated)
  } catch (error) {
    feedback.notify({
      title: fieldForbiddenText(error) || (error instanceof AdminApiError && error.message
        ? error.message
        : t('expertPlans.activateFailed')),
      color: 'error'
    })
  } finally {
    actionId.value = null
  }
}

function askDeactivate(row: Record<string, unknown>) {
  if (!isActive(row) || actionId.value) {
    return
  }
  deactivateTarget.value = row
  deactivateOpen.value = true
}

async function confirmDeactivate() {
  const row = deactivateTarget.value
  const id = row ? idOf(row) : ''
  const token = readOperatorToken()
  deactivateOpen.value = false
  deactivateTarget.value = null
  if (!id || !token || actionId.value) {
    return
  }
  actionId.value = id
  try {
    const updated = await adminUpdateExpertPlan(config.public.apiBase, token, id, { active: false })
    replaceRow(id, updated)
  } catch (error) {
    feedback.notify({
      title: fieldForbiddenText(error) || (error instanceof AdminApiError && error.message
        ? error.message
        : t('expertPlans.deactivateFailed')),
      color: 'error'
    })
  } finally {
    actionId.value = null
  }
}

function fieldForbiddenText(error: unknown) {
  if (!isExpertPlanFieldForbiddenError(error)) {
    return ''
  }
  const message = error instanceof AdminApiError ? error.message.trim() : ''
  return message || t('expertPlans.fieldForbidden')
}

function replaceRow(id: string, updated: Record<string, unknown>) {
  expertPlans.value = expertPlans.value.map((row) => {
    return idOf(row) === id ? { ...row, ...updated } : row
  })
}

function textValue(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
}

function numberOf(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return null
}
</script>

<template>
  <PageHeader
    :title="$t('nav.expertPlans')"
    :description="$t('expertPlans.description')"
    plain
  >
    <p
      v-if="errorMessage"
      class="text-sm text-error"
      data-testid="expert-plans-error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-else-if="pending"
      class="text-sm text-muted"
      data-testid="expert-plans-loading"
    >
      {{ $t('expertPlans.loading') }}
    </p>
    <p
      v-else-if="!sortedPlans.length"
      class="rounded-xl border border-default bg-elevated p-10 text-center text-base text-muted"
      data-testid="expert-plans-empty"
    >
      {{ $t('expertPlans.empty') }}
    </p>
    <AdminTable
      v-else
      compact
      fixed
      data-testid="expert-plans-table"
    >
      <template #colgroup>
        <colgroup>
          <col
            v-for="column in columns"
            :key="column.key"
            :class="column.width"
          >
        </colgroup>
      </template>
      <template #head>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            :class="[column.width, column.align === 'right' ? 'text-right' : '']"
          >
            {{ columnLabel(column.key) }}
          </th>
        </tr>
      </template>
      <tr
        v-for="(row, index) in sortedPlans"
        :key="rowKey(row, index)"
        class="border-b border-default last:border-0"
        :data-testid="`expert-plan-row-${idOf(row) || index}`"
      >
        <td class="py-3 tabular-nums text-highlighted">
          {{ sortOf(row) }}
        </td>
        <td class="py-3 font-semibold text-highlighted">
          {{ nameOf(row) }}
        </td>
        <td
          class="tabular-money py-3 text-right font-medium text-highlighted"
          data-testid="expert-plan-row-price"
        >
          {{ priceOf(row) }}
        </td>
        <td class="py-3">
          <UBadge
            :color="isActive(row) ? 'success' : 'neutral'"
            variant="subtle"
          >
            {{ isActive(row) ? $t('expertPlans.status.active') : $t('expertPlans.status.inactive') }}
          </UBadge>
        </td>
        <td class="py-3 text-end">
          <div class="inline-flex flex-wrap items-center justify-end gap-2">
            <UButton
              v-if="canEdit"
              size="sm"
              color="neutral"
              variant="outline"
              data-testid="expert-plan-edit"
              @click="openEdit(row)"
            >
              {{ $t('actions.edit') }}
            </UButton>
            <UButton
              v-if="isActive(row)"
              size="sm"
              color="error"
              variant="soft"
              :loading="actionId === idOf(row)"
              :disabled="Boolean(actionId) && actionId !== idOf(row)"
              data-testid="expert-plan-deactivate"
              @click="askDeactivate(row)"
            >
              {{ $t('expertPlans.deactivate') }}
            </UButton>
            <UButton
              v-else
              size="sm"
              color="primary"
              variant="soft"
              :loading="actionId === idOf(row)"
              :disabled="Boolean(actionId) && actionId !== idOf(row)"
              data-testid="expert-plan-activate"
              @click="activate(row)"
            >
              {{ $t('expertPlans.activate') }}
            </UButton>
          </div>
        </td>
      </tr>
    </AdminTable>

    <UModal
      v-model:open="deactivateOpen"
      :title="$t('expertPlans.deactivateTitle')"
      :description="$t('expertPlans.deactivateBody')"
      :ui="{ footer: 'justify-end gap-2' }"
      data-testid="expert-plan-deactivate-modal"
    >
      <template #footer="{ close }">
        <UButton
          color="neutral"
          variant="outline"
          data-testid="expert-plan-deactivate-cancel"
          @click="close()"
        >
          {{ $t('actions.cancel') }}
        </UButton>
        <UButton
          color="error"
          data-testid="expert-plan-deactivate-confirm"
          @click="confirmDeactivate"
        >
          {{ $t('expertPlans.deactivate') }}
        </UButton>
      </template>
    </UModal>
  </PageHeader>
</template>
