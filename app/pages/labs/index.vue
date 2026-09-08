<script setup lang="ts">
import { LAB_STATUS_COLOR } from '~/utils/labels'
import { labSchema } from '~/utils/schemas'
import type { LabForm } from '~/utils/schemas'
import type { LabRow } from '~/types/admin'
import type { FormSubmitEvent } from '@nuxt/ui'

const { locale } = useI18n()
const { moduleDesc } = usePageCopy()
const { scoped, orgLabel, showOrg, writable } = useOrgScope()
const ops = useOpsStore()
const feedback = useOpsFeedback()
const { labStatusOptions } = useSelectOptions()

const selectedId = ref<string | null>(null)
const creating = ref(false)
const deleteId = ref<string | null>(null)
const state = reactive<Partial<LabForm>>({})

const rows = computed(() => scoped(ops.labs))
const selected = computed(() => rows.value.find(row => row.id === selectedId.value) ?? null)
const detailOpen = computed(() => creating.value || Boolean(selected.value))

const caseOptions = computed(() =>
  scoped(ops.cases)
    .filter(row => ['lab_pending', 'lab_scheduled', 'awaiting_report'].includes(row.status) || ops.labs.some(lab => lab.caseId === row.id))
    .map(row => ({
      label: `${row.id} · ${locale.value === 'en' ? row.customerEn : row.customer}`,
      value: row.id
    }))
)

function siteName(row: LabRow) {
  return locale.value === 'en' ? row.siteEn : row.site
}

function fillCreate() {
  Object.assign(state, {
    caseId: caseOptions.value[0]?.value ?? '',
    site: '',
    siteEn: '',
    scheduledAt: '',
    status: 'unscheduled'
  })
}

function fillEdit(row: LabRow) {
  Object.assign(state, {
    caseId: row.caseId,
    site: row.site,
    siteEn: row.siteEn,
    scheduledAt: row.scheduledAt ?? '',
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

function selectRow(row: LabRow) {
  creating.value = false
  selectedId.value = row.id
  fillEdit(row)
}

function closeDetail() {
  creating.value = false
  selectedId.value = null
}

function onSubmit(event: FormSubmitEvent<LabForm>) {
  const data = event.data
  const caseRow = ops.cases.find(row => row.id === data.caseId)
  const saved = ops.upsertLab({
    id: selectedId.value ?? undefined,
    caseId: data.caseId,
    orgId: caseRow?.orgId ?? ops.defaultOrgId(),
    customer: caseRow?.customer ?? data.caseId,
    site: data.site,
    siteEn: data.siteEn,
    scheduledAt: data.scheduledAt || null,
    status: data.status
  })
  if (caseRow && data.status === 'scheduled' && caseRow.status === 'lab_pending') {
    ops.updateCase(caseRow.id, { status: 'lab_scheduled' })
  }
  if (caseRow && data.status === 'awaiting_report') {
    ops.updateCase(caseRow.id, { status: 'awaiting_report' })
  }
  if (caseRow && data.status === 'report_ready' && ['lab_pending', 'lab_scheduled', 'awaiting_report'].includes(caseRow.status)) {
    ops.updateCase(caseRow.id, { status: 'progress_due', hasReport: true })
  }
  feedback.saved(data.caseId)
  creating.value = false
  if (saved) {
    selectedId.value = saved.id
    fillEdit(saved)
  }
}

function confirmDelete() {
  if (!deleteId.value) {
    return
  }
  ops.removeLab(deleteId.value)
  feedback.deleted()
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
    :title="$t('nav.labs')"
    :description="moduleDesc('labs')"
  >
    <template #actions>
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
            <th
              v-if="showOrg"
            >
              {{ $t('col.org') }}
            </th>
            <th>{{ $t('col.site') }}</th>
            <th>{{ $t('col.scheduled') }}</th>
            <th>{{ $t('col.status') }}</th>
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
            {{ row.caseId }}
          </td>
          <td>
            {{ row.customer }}
          </td>
          <td
            v-if="showOrg"
            class="text-muted"
          >
            {{ orgLabel(row.orgId) }}
          </td>
          <td>
            {{ siteName(row) }}
          </td>
          <td class="text-muted">
            {{ row.scheduledAt ?? $t('status.na') }}
          </td>
          <td>
            <StatusBadge
              :label="$t(`status.${row.status}`)"
              :color="LAB_STATUS_COLOR[row.status]"
            />
          </td>
        </tr>
      </AdminTable>

      <template #detail>
        <DetailPanel
          :open="detailOpen"
          :title="creating ? $t('actions.add') : selected?.caseId"
          :subtitle="selected ? siteName(selected) : $t('form.labTitle')"
          :empty="$t('form.emptyDetail')"
          icon="i-lucide-flask-conical"
          @close="closeDetail"
        >
          <UForm
            id="lab-form"
            :schema="labSchema"
            :state="state"
            class="space-y-4"
            @submit="onSubmit"
          >
            <UFormField
              name="caseId"
              :label="$t('col.case')"
            >
              <USelect
                v-model="state.caseId"
                :items="caseOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="site"
              :label="$t('col.site')"
            >
              <UInput
                v-model="state.site"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="siteEn"
              :label="$t('form.siteEn')"
            >
              <UInput
                v-model="state.siteEn"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="scheduledAt"
              :label="$t('col.scheduled')"
            >
              <UInput
                v-model="state.scheduledAt"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="status"
              :label="$t('col.status')"
            >
              <USelect
                v-model="state.status"
                :items="labStatusOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
          </UForm>
          <template #footer>
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
              form="lab-form"
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
