<script setup lang="ts">
import { money } from '~/utils/format'
import { basePriceOf, type LabServiceMock } from '~/utils/lab-service-mock'

const localePath = useLocalePath()
const { t, locale } = useI18n()
const store = useLabServiceMockStore()

const services = computed(() => store.listServices())

function openService(row: LabServiceMock) {
  void navigateTo(localePath(`/lab-services/${encodeURIComponent(row.id)}`))
}

function nameOf(row: LabServiceMock) {
  return String(locale.value).startsWith('en')
    ? (row.name_en || row.name_zh)
    : (row.name_zh || row.name_en)
}

function statusOf(row: LabServiceMock) {
  return row.active ? t('labServices.status.active') : t('labServices.status.inactive')
}
</script>

<template>
  <PageHeader
    :title="$t('nav.labServices')"
    :description="$t('labServices.description')"
    plain
  >
    <div class="mb-4 flex justify-end">
      <UButton
        icon="i-lucide-plus"
        :to="localePath('/lab-services/new')"
      >
        {{ $t('actions.add') }}
      </UButton>
    </div>

    <p
      v-if="!services.length"
      class="rounded-xl border border-default bg-elevated p-10 text-center text-base text-muted"
    >
      {{ $t('labServices.empty') }}
    </p>
    <div
      v-else
      class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      <button
        v-for="row in services"
        :key="row.id"
        type="button"
        class="text-left"
        @click="openService(row)"
      >
        <UCard
          :title="nameOf(row)"
          :description="row.partner_name"
          class="h-full transition hover:border-primary"
        >
          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-muted">
                {{ $t('labServices.fields.code') }}
              </dt>
              <dd class="mt-1 font-medium text-highlighted">
                {{ row.code }}
              </dd>
            </div>
            <div class="text-right">
              <dt class="text-muted">
                {{ $t('labServices.fields.base_price') }}
              </dt>
              <dd class="tabular-money mt-1 font-medium text-highlighted">
                {{ money(basePriceOf(row)) }}
              </dd>
            </div>
            <div>
              <dt class="text-muted">
                {{ $t('labServices.fields.items') }}
              </dt>
              <dd class="mt-1 font-medium text-highlighted">
                {{ row.items.length }}
              </dd>
            </div>
            <div class="text-right">
              <dt class="text-muted">
                {{ $t('labServices.fields.active') }}
              </dt>
              <dd class="mt-1 font-medium text-highlighted">
                {{ statusOf(row) }}
              </dd>
            </div>
          </dl>
        </UCard>
      </button>
    </div>
  </PageHeader>
</template>
