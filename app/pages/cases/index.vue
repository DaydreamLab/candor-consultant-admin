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
const detailOpen = computed(() => creating.value || Boolean(selected.value))

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
        class="w-52"
      />
      <USelect
        v-model="filter"
        :items="[
          { label: $t('actions.filterOpen'), value: 'open' },
          { label: $t('actions.filterAll'), value: 'all' }
        ]"
        value-key="value"
        class="w-36"
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
            <th>{{ $t('col.case') }}</th>
            <th>{{ $t('col.customer') }}</th>
            <th>{{ $t('col.plan') }}</th>
            <th
              v-if="showOrg"
            >
              {{ $t('col.org') }}
            </th>
            <th>{{ $t('col.appointment') }}</th>
            <th>{{ $t('col.status') }}</th>
            <th>{{ $t('col.next') }}</th>
          </tr>
        </template>
        <tr
          v-for="row in rows"
          :key="row.id"
          class="cursor-pointer border-b border-default last:border-0 hover:bg-muted/40"
          :class="row.id === selectedId ? 'bg-primary/5' : ''"
          @click="selectRow(row)"
        >
          <td class="font-medium text-highlighted">
            {{ row.id }}
          </td>
          <td>
            <div>{{ customerName(row) }}</div>
            <div class="text-sm text-dimmed">
              {{ row.email }}
            </div>
          </td>
          <td>
            {{ $t(`plan.${row.planId}`) }}
          </td>
          <td
            v-if="showOrg"
            class="text-muted"
          >
            {{ orgLabel(row.orgId) }}
          </td>
          <td class="text-muted">
            <div>{{ row.appointmentAt }}</div>
            <div class="text-sm text-dimmed">
              {{ $t('col.paidAt') }} {{ row.paidAt }}
            </div>
          </td>
          <td>
            <StatusBadge
              :label="$t(`status.${row.status}`)"
              :color="CASE_STATUS_COLOR[row.status]"
            />
          </td>
          <td @click.stop>
            <NextActionButton
              :to="nextTo(row.status)"
              :label="nextLabel(row.status)"
            />
          </td>
        </tr>
      </AdminTable>

      <template #detail>
        <DetailPanel
          :open="detailOpen"
          :title="creating ? $t('actions.add') : selected?.id"
          :subtitle="selected ? customerName(selected) : ''"
          :empty="$t('form.emptyDetail')"
          @close="closeDetail"
        >
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

          <template #footer>
            <div
              v-if="selected && nextTo(selected.status)"
              class="mr-auto"
            >
              <NextActionButton
                :to="nextTo(selected.status)"
                :label="nextLabel(selected.status)"
              />
            </div>
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
          </template>
        </DetailPanel>
      </template>
    </SplitDetail>

    <ConfirmDelete
      :open="Boolean(deleteId)"
      @update:open="(open) => { if (!open) deleteId = null }"
      @confirm="confirmDelete"
    />
  </PageHeader>
</template>
