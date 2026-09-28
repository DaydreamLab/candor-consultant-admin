<script setup lang="ts">
import { AdminApiError, adminListPackagePlans } from '~/utils/admin-api'
import { readOperatorToken } from '~/utils/operator-session'

type PackagePlanColumn = 'name' | 'status' | 'price' | 'summary'

const config = useRuntimeConfig()
const { t } = useI18n()

const packagePlans = ref<Record<string, unknown>[]>([])
const pending = ref(true)
const errorMessage = ref('')

const columns = computed(() => {
  const keys = new Set(packagePlans.value.flatMap(row => Object.keys(row)))
  const visible: { key: PackagePlanColumn, alignEnd: boolean }[] = []
  if (keys.has('name') || keys.has('title')) {
    visible.push({ key: 'name', alignEnd: false })
  }
  if (keys.has('status')) {
    visible.push({ key: 'status', alignEnd: false })
  }
  if (keys.has('price') || keys.has('amount')) {
    visible.push({ key: 'price', alignEnd: true })
  }
  if (keys.has('summary') || keys.has('description') || keys.has('items')) {
    visible.push({ key: 'summary', alignEnd: false })
  }
  return visible
})

if (import.meta.client) {
  void load()
}

async function load() {
  const token = readOperatorToken()
  if (!token) {
    packagePlans.value = []
    errorMessage.value = t('packagePlans.failed')
    pending.value = false
    return
  }

  pending.value = true
  errorMessage.value = ''
  try {
    packagePlans.value = await adminListPackagePlans(config.public.apiBase, token)
  } catch (error) {
    packagePlans.value = []
    const message = error instanceof AdminApiError ? error.message.trim() : ''
    errorMessage.value = message || t('packagePlans.failed')
  } finally {
    pending.value = false
  }
}

function rowKey(row: Record<string, unknown>, index: number) {
  const id = row.id
  if (typeof id === 'string' && id.trim()) {
    return id
  }
  if (typeof id === 'number' && Number.isFinite(id)) {
    return String(id)
  }
  return `package-plan-${index}`
}

function columnLabel(key: PackagePlanColumn) {
  return t(`packagePlans.columns.${key}`)
}

function cellClass(key: PackagePlanColumn) {
  if (key === 'price') {
    return 'tabular-money text-right font-medium text-highlighted'
  }
  if (key === 'name') {
    return 'font-medium text-highlighted'
  }
  return ''
}

function cellText(row: Record<string, unknown>, key: PackagePlanColumn) {
  switch (key) {
    case 'name':
      return nameOf(row)
    case 'status':
      return textOf(row.status)
    case 'price':
      return priceOf(row)
    case 'summary':
      return summaryOf(row)
  }
}

function nameOf(row: Record<string, unknown>) {
  return textValue(row.name) || textValue(row.title) || t('status.na')
}

function priceOf(row: Record<string, unknown>) {
  if (hasDisplayValue(row.price)) {
    return amountOf(row.price)
  }
  if (hasDisplayValue(row.amount)) {
    return amountOf(row.amount)
  }
  return t('status.na')
}

function summaryOf(row: Record<string, unknown>) {
  const summary = textValue(row.summary)
  if (summary) {
    return summary
  }
  const description = textValue(row.description)
  if (description) {
    return description
  }
  const names = itemNames(row.items)
  return names.length ? names.join(' · ') : t('status.na')
}

function itemNames(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }
  const names: string[] = []
  for (const item of value) {
    if (typeof item === 'string' && item.trim()) {
      names.push(item.trim())
      continue
    }
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue
    }
    const record = item as Record<string, unknown>
    const name = textValue(record.name) || textValue(record.title)
    if (name) {
      names.push(name)
    }
  }
  return names
}

function textOf(value: unknown) {
  return textValue(value) || t('status.na')
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

function hasDisplayValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return true
  }
  return typeof value === 'string' && Boolean(value.trim())
}

function amountOf(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return money(value)
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return money(Number(value))
  }
  return textOf(value)
}
</script>

<template>
  <PageHeader
    :title="$t('nav.packagePlans')"
    :description="$t('packagePlans.description')"
    plain
  >
    <p
      v-if="errorMessage"
      class="text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-else-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('packagePlans.loading') }}
    </p>
    <p
      v-else-if="!packagePlans.length"
      class="rounded-xl border border-default bg-elevated p-10 text-center text-base text-muted"
    >
      {{ $t('packagePlans.empty') }}
    </p>
    <AdminTable
      v-else
      compact
    >
      <template #head>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            :class="column.alignEnd ? 'text-right' : ''"
          >
            {{ columnLabel(column.key) }}
          </th>
        </tr>
      </template>
      <tr
        v-for="(row, index) in packagePlans"
        :key="rowKey(row, index)"
        class="border-b border-default last:border-0"
      >
        <td
          v-for="column in columns"
          :key="column.key"
          :class="cellClass(column.key)"
        >
          {{ cellText(row, column.key) }}
        </td>
      </tr>
    </AdminTable>
  </PageHeader>
</template>
