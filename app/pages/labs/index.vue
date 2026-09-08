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

const drawerOpen = ref(false)
const editingId = ref<string | null>(null)
const deleteId = ref<string | null>(null)
const state = reactive<Partial<LabForm>>({})

const rows = computed(() => scoped(ops.labs))

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

function openCreate() {
  editingId.value = null
  Object.assign(state, {
    caseId: caseOptions.value[0]?.value ?? '',
    site: '',
    siteEn: '',
    scheduledAt: '',
    status: 'unscheduled'
  })
  drawerOpen.value = true
}

function openEdit(row: LabRow) {
  editingId.value = row.id
  Object.assign(state, {
    caseId: row.caseId,
    site: row.site,
    siteEn: row.siteEn,
    scheduledAt: row.scheduledAt ?? '',
    status: row.status
  })
  drawerOpen.value = true
}

function onSubmit(event: FormSubmitEvent<LabForm>) {
  const data = event.data
  const caseRow = ops.cases.find(row => row.id === data.caseId)
  ops.upsertLab({
    id: editingId.value ?? undefined,
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
  drawerOpen.value = false
  feedback.saved(data.caseId)
}

function confirmDelete() {
  if (!deleteId.value) {
    return
  }
  ops.removeLab(deleteId.value)
  feedback.deleted()
  deleteId.value = null
}
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

    <AdminTable :empty="!rows.length">
      <template #head>
        <tr>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.case') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.customer') }}
          </th>
          <th
            v-if="showOrg"
            class="px-4 py-3 font-medium"
          >
            {{ $t('col.org') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.site') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.scheduled') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.status') }}
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
          {{ row.caseId }}
        </td>
        <td class="px-4 py-3">
          {{ row.customer }}
        </td>
        <td
          v-if="showOrg"
          class="px-4 py-3 text-muted"
        >
          {{ orgLabel(row.orgId) }}
        </td>
        <td class="px-4 py-3">
          {{ siteName(row) }}
        </td>
        <td class="px-4 py-3 text-muted">
          {{ row.scheduledAt ?? $t('status.na') }}
        </td>
        <td class="px-4 py-3">
          <StatusBadge
            :label="$t(`status.${row.status}`)"
            :color="LAB_STATUS_COLOR[row.status]"
          />
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
      :description="$t('form.labTitle')"
    >
      <template #body>
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
          form="lab-form"
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
