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
const drawerOpen = ref(false)
const editingId = ref<string | null>(null)
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

function openCreate() {
  editingId.value = null
  const orgId = ops.defaultOrgId()
  Object.assign(state, {
    customer: '',
    customerEn: '',
    email: '',
    planId: 'basic',
    hasReport: true,
    orgId,
    paidAt: nowStamp(),
    appointmentAt: nowStamp(),
    status: 'received'
  })
  drawerOpen.value = true
}

function openEdit(row: CaseRow) {
  editingId.value = row.id
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
  drawerOpen.value = true
}

function onSubmit(event: FormSubmitEvent<CaseForm>) {
  const data = event.data
  if (editingId.value) {
    ops.updateCase(editingId.value, data)
  } else {
    ops.addCase(data)
  }
  drawerOpen.value = false
  feedback.saved(editingId.value ?? data.customer)
}

function confirmDelete() {
  if (!deleteId.value) {
    return
  }
  ops.removeCase(deleteId.value)
  feedback.deleted(deleteId.value)
  deleteId.value = null
}
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

    <AdminTable :empty="!rows.length">
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
          <th class="px-4 py-3 font-medium">
            {{ $t('col.report') }}
          </th>
          <th
            v-if="showOrg"
            class="px-4 py-3 font-medium"
          >
            {{ $t('col.org') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.paidAt') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.appointment') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.status') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.next') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.actions') }}
          </th>
        </tr>
      </template>
      <tr
        v-for="row in rows"
        :key="row.id"
        class="border-b border-default last:border-0"
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
        <td class="px-4 py-3">
          {{ $t(row.hasReport ? 'status.yes' : 'status.no') }}
        </td>
        <td
          v-if="showOrg"
          class="px-4 py-3 text-muted"
        >
          {{ orgLabel(row.orgId) }}
        </td>
        <td class="px-4 py-3 text-muted">
          {{ row.paidAt }}
        </td>
        <td class="px-4 py-3 text-muted">
          {{ row.appointmentAt }}
        </td>
        <td class="px-4 py-3">
          <StatusBadge
            :label="$t(`status.${row.status}`)"
            :color="CASE_STATUS_COLOR[row.status]"
          />
        </td>
        <td class="px-4 py-3">
          <NuxtLink
            v-if="nextTo(row.status)"
            :to="nextTo(row.status)"
            class="text-sm font-medium text-primary hover:underline"
          >
            {{ nextLabel(row.status) }}
          </NuxtLink>
          <span
            v-else
            class="text-muted"
          >{{ $t('status.na') }}</span>
        </td>
        <td class="px-4 py-3">
          <RowActions
            :disabled="!writable"
            @edit="openEdit(row)"
            @remove="deleteId = row.id"
          />
        </td>
      </tr>
    </AdminTable>

    <USlideover
      v-model:open="drawerOpen"
      :title="editingId ? $t('actions.edit') : $t('actions.add')"
      :description="$t('form.caseTitle')"
    >
      <template #body>
        <UForm
          id="case-form"
          :schema="caseSchema"
          :state="state"
          class="space-y-4"
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
      </template>
      <template #footer="{ close }">
        <UButton
          color="neutral"
          variant="outline"
          @click="close"
        >
          {{ $t('actions.cancel') }}
        </UButton>
        <UButton
          type="submit"
          form="case-form"
        >
          {{ $t('actions.save') }}
        </UButton>
      </template>
    </USlideover>

    <ConfirmDelete
      :open="Boolean(deleteId)"
      @update:open="(open) => { if (!open) deleteId = null }"
      @confirm="confirmDelete"
    />
  </PageHeader>
</template>
