<script setup lang="ts">
import { AdminApiError, adminListExpertPlans } from '~/utils/admin-api'
import { money } from '~/utils/format'
import { readOperatorToken } from '~/utils/operator-session'

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t, locale } = useI18n()

const expertPlans = ref<Record<string, unknown>[]>([])
const pending = ref(true)
const errorMessage = ref('')

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

function openPlan(row: Record<string, unknown>) {
  const id = idOf(row)
  if (!id) {
    return
  }
  void navigateTo(localePath(`/expert-plans/${encodeURIComponent(id)}`))
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
  const zh = textValue(row.name_zh)
  const en = textValue(row.name_en)
  const localized = String(locale.value).startsWith('en') ? (en || zh) : (zh || en)
  return localized || textValue(row.name) || t('status.na')
}

function packagePlanOf(row: Record<string, unknown>) {
  return textValue(row.package_plan_name_zh)
    || textValue(row.package_plan_name)
    || textValue(row.package_plan_code)
    || textValue(row.package_plan_id)
    || t('status.na')
}

function priceOf(row: Record<string, unknown>) {
  const n = numberOf(row.price)
  return n == null ? t('status.na') : money(n)
}

function activeOf(row: Record<string, unknown>) {
  return row.active === false
    ? t('expertPlans.status.inactive')
    : t('expertPlans.status.active')
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
      v-else-if="!expertPlans.length"
      class="rounded-xl border border-default bg-elevated p-10 text-center text-base text-muted"
      data-testid="expert-plans-empty"
    >
      {{ $t('expertPlans.empty') }}
    </p>
    <div
      v-else
      class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      data-testid="expert-plans-grid"
    >
      <button
        v-for="(row, index) in expertPlans"
        :key="rowKey(row, index)"
        type="button"
        class="text-left"
        :data-testid="`expert-plan-card-${idOf(row) || index}`"
        @click="openPlan(row)"
      >
        <UCard class="h-full transition hover:border-primary">
          <template #header>
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold text-highlighted">{{ nameOf(row) }}</span>
              <UBadge
                :color="row.active === false ? 'neutral' : 'success'"
                variant="subtle"
              >
                {{ activeOf(row) }}
              </UBadge>
            </div>
          </template>
          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-muted">
                {{ $t('expertPlans.fields.code') }}
              </dt>
              <dd class="mt-1 font-mono text-highlighted">
                {{ textValue(row.code) || $t('status.na') }}
              </dd>
            </div>
            <div class="text-right">
              <dt class="text-muted">
                {{ $t('expertPlans.fields.price') }}
              </dt>
              <dd
                class="tabular-money mt-1 font-medium text-highlighted"
                data-testid="expert-plan-card-price"
              >
                {{ priceOf(row) }}
              </dd>
            </div>
            <div class="col-span-2">
              <dt class="text-muted">
                {{ $t('expertPlans.fields.package_plan') }}
              </dt>
              <dd class="mt-1 font-medium text-highlighted">
                {{ packagePlanOf(row) }}
              </dd>
            </div>
          </dl>
        </UCard>
      </button>
    </div>
  </PageHeader>
</template>
