<script setup lang="ts">
import { CASE_STATUS_COLOR, nextAction } from '~/utils/labels'
import { caseSchema } from '~/utils/schemas'
import type { CaseForm } from '~/utils/schemas'
import type { CaseRow } from '~/types/admin'
import { nowStamp } from '~/utils/demo'
import type { FormSubmitEvent } from '@nuxt/ui'

const localePath = useLocalePath()
const { t, locale } = useI18n()
const { moduleDesc } = usePageCopy()
const { scoped, orgLabel, showOrg, writable, orgOptions } = useOrgScope()
const ops = useOpsStore()
const feedback = useOpsFeedback()
const { planOptions, caseStatusOptions } = useSelectOptions()

const query = ref('')
const filter = ref<'open' | 'all'>('open')
const selectedId = ref<string | null>(null)
const creating = ref(false)
const deleteId = ref<string | null>(null)
const state = reactive<Partial<CaseForm>>({})

const rows = computed(() => {
  const list = scoped(ops.cases)
  const open = list.filter(row => !['shipped', 'invoiced'].includes(row.status))
  const source = filter.value === 'open' ? open : list
  const q = query.value.trim().toLowerCase()
  if (!q) {
    return source
  }
  return source.filter((row) => {
    const name = locale.value === 'en' ? row.customerEn : row.customer
    return [row.id, name, row.email, orgLabel(row.orgId)].join(' ').toLowerCase().includes(q)
  })
})

const selected = computed(() => rows.value.find(row => row.id === selectedId.value) ?? null)

function customerName(row: CaseRow) {
  return locale.value === 'en' ? row.customerEn : row.customer
}

function nextLabel(status: CaseRow['status']) {
  const action = nextAction(status)
  return action ? t(action.key) : t('status.na')
}

function nextTo(status: CaseRow['status']) {
  const action = nextAction(status)
  return action ? localePath(action.to) : undefined
}

function fillCreate() {
  Object.assign(state, {
    customer: '',
    customerEn: '',
    email: '',
    planId: 'basic',
    hasReport: true,
    orgId: ops.defaultOrgId(),
    paidAt: nowStamp(),
    appointmentAt: nowStamp(),
    status: 'received'
  })
}

function fillEdit(row: CaseRow) {
  Object.assign(state, {
    customer: row.customer,
    customerEn: row.customerEn,
    email: row.email,
    planId: row.planId,
    hasReport: row.hasReport,
    orgId: row.orgId,
    paidAt: row.paidAt,
    appointmentAt: row.appointmentAt,
    status: row.status
  })
}

function openCreate() {
  if (!writable.value) {
    return
  }
  selectedId.value = null
  creating.value = true
  fillCreate()
}

function selectRow(row: CaseRow) {
  creating.value = false
  selectedId.value = row.id
  fillEdit(row)
}

function closeDetail() {
  creating.value = false
  selectedId.value = null
}

function onSubmit(event: FormSubmitEvent<CaseForm>) {
  const data = event.data
  if (selectedId.value) {
    ops.updateCase(selectedId.value, data)
    feedback.saved(selectedId.value)
    const current = ops.cases.find(row => row.id === selectedId.value)
    if (current) {
      fillEdit(current)
    }
  } else {
    const created = ops.addCase(data)
    feedback.saved(data.customer)
    creating.value = false
    if (created) {
      selectedId.value = created.id
      fillEdit(created)
    }
  }
}

function confirmDelete() {
  if (!deleteId.value) {
    return
  }
  ops.removeCase(deleteId.value)
  feedback.deleted(deleteId.value)
  if (selectedId.value === deleteId.value) {
    closeDetail()
  }
  deleteId.value = null
}

watch(rows, (list) => {
  if (selectedId.value && !list.some(row => row.id === selectedId.value)) {
    selectedId.value = null
  }
})
</script>

<template>
  <PageHeader
    :title="$t('nav.cases')"
    :description="moduleDesc('cases')"
  >
    <template #actions>
      <UInput
        v-model="query"
        icon="i-lucide-search"
        :placeholder="$t('table.search')"
        class="w-44"
      />
      <USelect
        v-model="filter"
        :items="[
          { label: $t('actions.filterOpen'), value: 'open' },
          { label: $t('actions.filterAll'), value: 'all' }
        ]"
        value-key="value"
        class="w-32"
      />
      <UButton
        icon="i-lucide-plus"
        :disabled="!writable"
        @click="openCreate"
      >
        {{ $t('actions.add') }}
      </UButton>
    </template>

    <SplitDetail>
      <AdminTable
        compact
        :empty="!rows.length"
      >
        <template #head>
          <tr>
            <th class="px-4 py-3 font-medium">
              {{ $t('col.case') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('col.customer') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('col.plan') }}
            </th>
            <th
              v-if="showOrg"
              class="px-4 py-3 font-medium"
            >
              {{ $t('col.org') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('col.status') }}
            </th>
          </tr>
        </template>
        <tr
          v-for="row in rows"
          :key="row.id"
          class="cursor-pointer border-b border-default last:border-0 hover:bg-muted/40"
          :class="row.id === selectedId ? 'bg-primary/5' : ''"
          @click="selectRow(row)"
        >
          <td class="px-4 py-3 font-medium text-highlighted">
            {{ row.id }}
          </td>
          <td class="px-4 py-3">
            <div>{{ customerName(row) }}</div>
            <div class="text-xs text-dimmed">
              {{ row.email }}
            </div>
          </td>
          <td class="px-4 py-3">
            {{ $t(`plan.${row.planId}`) }}
          </td>
          <td
            v-if="showOrg"
            class="px-4 py-3 text-muted"
          >
            {{ orgLabel(row.orgId) }}
          </td>
          <td class="px-4 py-3">
            <StatusBadge
              :label="$t(`status.${row.status}`)"
              :color="CASE_STATUS_COLOR[row.status]"
            />
          </td>
        </tr>
      </AdminTable>

      <template #detail>
        <div
          v-if="!creating && !selected"
          class="flex min-h-72 flex-col items-center justify-center p-6 text-center text-sm text-muted"
        >
          <UIcon
            name="i-lucide-panel-right"
            class="mb-2 size-8 text-dimmed"
          />
          {{ $t('form.emptyDetail') }}
        </div>
        <div
          v-else
          class="flex flex-col"
        >
          <header class="flex items-start justify-between gap-3 border-b border-default px-4 py-3">
            <div class="min-w-0">
              <p class="font-medium text-highlighted">
                {{ creating ? $t('actions.add') : selected?.id }}
              </p>
              <p
                v-if="selected"
                class="mt-1 text-xs text-muted"
              >
                {{ customerName(selected) }}
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              square
              @click="closeDetail"
            />
          </header>

          <UForm
            id="case-form"
            :schema="caseSchema"
            :state="state"
            class="space-y-4 p-4"
            @submit="onSubmit"
          >
            <UFormField
              v-if="showOrg"
              name="orgId"
              :label="$t('form.orgRequired')"
            >
              <USelect
                v-model="state.orgId"
                :items="orgOptions()"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="customer"
              :label="$t('col.customer')"
            >
              <UInput
                v-model="state.customer"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="customerEn"
              :label="$t('form.customerEn')"
            >
              <UInput
                v-model="state.customerEn"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="email"
              :label="$t('col.email')"
            >
              <UInput
                v-model="state.email"
                type="email"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="planId"
              :label="$t('col.plan')"
            >
              <USelect
                v-model="state.planId"
                :items="planOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="hasReport"
              :label="$t('col.report')"
            >
              <USwitch v-model="state.hasReport" />
            </UFormField>
            <UFormField
              name="paidAt"
              :label="$t('col.paidAt')"
            >
              <UInput
                v-model="state.paidAt"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="appointmentAt"
              :label="$t('col.appointment')"
            >
              <UInput
                v-model="state.appointmentAt"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="status"
              :label="$t('col.status')"
            >
              <USelect
                v-model="state.status"
                :items="caseStatusOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
          </UForm>

          <footer class="flex flex-wrap items-center justify-end gap-2 border-t border-default px-4 py-3">
            <NuxtLink
              v-if="selected && nextTo(selected.status)"
              :to="nextTo(selected.status)"
              class="mr-auto text-sm font-medium text-primary hover:underline"
            >
              {{ nextLabel(selected.status) }}
            </NuxtLink>
            <UButton
              v-if="selected"
              color="error"
              variant="ghost"
              :disabled="!writable"
              @click="deleteId = selected.id"
            >
              {{ $t('actions.delete') }}
            </UButton>
            <UButton
              type="submit"
              form="case-form"
              :disabled="!writable"
            >
              {{ $t('actions.save') }}
            </UButton>
          </footer>
        </div>
      </template>
    </SplitDetail>

    <ConfirmDelete
      :open="Boolean(deleteId)"
      @update:open="(open) => { if (!open) deleteId = null }"
      @confirm="confirmDelete"
    />
  </PageHeader>
</template>
