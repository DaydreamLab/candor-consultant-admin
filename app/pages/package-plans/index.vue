<script setup lang="ts">
import { AdminApiError, adminListPackagePlans } from '~/utils/admin-api'
import { money } from '~/utils/format'
import { packagePlanBudget } from '~/utils/package-plan-budget'
import { readOperatorToken } from '~/utils/operator-session'

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t, locale } = useI18n()

const packagePlans = ref<Record<string, unknown>[]>([])
const pending = ref(true)
const errorMessage = ref('')

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

function openPlan(row: Record<string, unknown>) {
  const id = idOf(row)
  if (!id) {
    return
  }
  void navigateTo(localePath(`/package-plans/${encodeURIComponent(id)}`))
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
  return idOf(row) || `package-plan-${index}`
}

function nameOf(row: Record<string, unknown>) {
  const zh = textValue(row.name_zh)
  const en = textValue(row.name_en)
  const localized = String(locale.value).startsWith('en') ? (en || zh) : (zh || en)
  return localized || textValue(row.name) || textValue(row.title) || t('status.na')
}

function descriptionOf(row: Record<string, unknown>) {
  return textValue(row.description) || t('status.na')
}

function periodDaysOf(row: Record<string, unknown>) {
  return textValue(row.period_days) || t('status.na')
}

function packCapacityOf(row: Record<string, unknown>) {
  return textValue(row.pack_capacity) || t('status.na')
}

function coreCountOf(row: Record<string, unknown>) {
  return textValue(row.core_count) || t('status.na')
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

function budgetTexts(row: Record<string, unknown>) {
  const price = numberOf(row.price) ?? numberOf(row.amount)
  const days = numberOf(row.period_days)
  if (price == null || days == null) {
    return null
  }
  const budget = packagePlanBudget(price, days)
  if (!budget) {
    return null
  }
  return {
    dailyBudget: money(budget.dailyBudget),
    remainder: money(budget.remainder)
  }
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

function numberOf(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return null
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
    <div
      v-else
      class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      <button
        v-for="(row, index) in packagePlans"
        :key="rowKey(row, index)"
        type="button"
        class="text-left"
        @click="openPlan(row)"
      >
        <UCard
          :title="nameOf(row)"
          :description="descriptionOf(row)"
          class="h-full transition hover:border-primary"
        >
          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-muted">
                {{ $t('packagePlans.fields.period_days') }}
              </dt>
              <dd class="mt-1 font-medium text-highlighted">
                {{ periodDaysOf(row) }}
              </dd>
            </div>
            <div class="text-right">
              <dt class="text-muted">
                {{ $t('packagePlans.fields.price') }}
              </dt>
              <dd class="tabular-money mt-1 font-medium text-highlighted">
                {{ priceOf(row) }}
              </dd>
            </div>
            <div>
              <dt class="text-muted">
                {{ $t('packagePlans.fields.pack_capacity') }}
              </dt>
              <dd class="mt-1 font-medium text-highlighted">
                {{ packCapacityOf(row) }}
              </dd>
            </div>
            <div class="text-right">
              <dt class="text-muted">
                {{ $t('packagePlans.fields.core_count') }}
              </dt>
              <dd class="mt-1 font-medium text-highlighted">
                {{ coreCountOf(row) }}
              </dd>
            </div>
            <template v-if="budgetTexts(row)">
              <div>
                <dt class="text-muted">
                  {{ $t('packagePlans.dailyBudget') }}
                </dt>
                <dd class="tabular-money mt-1 font-medium text-highlighted">
                  {{ budgetTexts(row)?.dailyBudget }}
                </dd>
              </div>
              <div class="text-right">
                <dt class="text-muted">
                  {{ $t('packagePlans.remainder') }}
                </dt>
                <dd class="tabular-money mt-1 font-medium text-highlighted">
                  {{ budgetTexts(row)?.remainder }}
                </dd>
              </div>
            </template>
          </dl>
        </UCard>
      </button>
    </div>
  </PageHeader>
</template>
