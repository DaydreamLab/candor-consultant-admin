<script setup lang="ts">
import { staffSchema } from '~/utils/schemas'
import type { StaffForm } from '~/utils/schemas'
import type { StaffRow } from '~/types/admin'
import { isPlatformRole } from '~/types/admin'
import type { FormSubmitEvent } from '@nuxt/ui'

const session = useSessionStore()
const { t } = useI18n()
const { moduleDesc } = usePageCopy()
const { orgLabel, showOrg, platform, usersWritable, orgOptions } = useOrgScope()
const ops = useOpsStore()
const feedback = useOpsFeedback()
const { accountStatusOptions, staffRoleOptions } = useSelectOptions()

const drawerOpen = ref(false)
const editingId = ref<string | null>(null)
const deleteId = ref<string | null>(null)
const state = reactive<Partial<StaffForm>>({})

const rows = computed(() => {
  if (platform.value) {
    return ops.staff
  }
  const orgId = session.session?.orgId
  return ops.staff.filter(row => row.orgId === orgId)
})

function openCreate() {
  editingId.value = null
  Object.assign(state, {
    name: '',
    email: '',
    role: platform.value ? 'consultant_ops' : 'consultant_ops',
    orgId: ops.defaultOrgId(),
    status: 'invited'
  })
  drawerOpen.value = true
}

function openEdit(row: StaffRow) {
  editingId.value = row.id
  Object.assign(state, {
    name: row.name,
    email: row.email,
    role: row.role,
    orgId: row.orgId ?? '',
    status: row.status
  })
  drawerOpen.value = true
}

function onSubmit(event: FormSubmitEvent<StaffForm>) {
  const data = event.data
  const orgId = isPlatformRole(data.role) ? null : (data.orgId || ops.defaultOrgId())
  ops.saveStaff({
    id: editingId.value ?? undefined,
    name: data.name,
    email: data.email,
    role: data.role,
    orgId,
    status: data.status
  })
  drawerOpen.value = false
  feedback.saved(data.email)
}

function confirmDelete() {
  if (!deleteId.value) {
    return
  }
  const ok = ops.removeStaff(deleteId.value)
  if (!ok) {
    feedback.warned(t('actions.selfDelete'))
  } else {
    feedback.deleted()
  }
  deleteId.value = null
}
</script>

<template>
  <PageHeader
    :title="$t('nav.users')"
    :description="moduleDesc('users')"
    :locked="!usersWritable"
  >
    <template #actions>
      <UButton
        icon="i-lucide-plus"
        :disabled="!usersWritable"
        @click="openCreate"
      >
        {{ $t('actions.invite') }}
      </UButton>
    </template>

    <AdminTable :empty="!rows.length">
      <template #head>
        <tr>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.name') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.email') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.role') }}
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
          <th class="px-4 py-3 font-medium">
            {{ $t('col.lastLogin') }}
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
          {{ row.name }}
        </td>
        <td class="px-4 py-3">
          {{ row.email }}
        </td>
        <td class="px-4 py-3">
          {{ $t(`roles.${row.role}`) }}
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
            :color="row.status === 'active' ? 'success' : 'neutral'"
          />
        </td>
        <td class="px-4 py-3 text-muted">
          {{ row.lastLogin }}
        </td>
        <td class="px-4 py-3">
          <RowActions
            :disabled="!usersWritable"
            @edit="openEdit(row)"
            @remove="deleteId = row.id"
          />
        </td>
      </tr>
    </AdminTable>

    <section
      v-if="platform"
      class="mt-8"
    >
      <h2 class="mb-2 text-sm font-semibold text-highlighted">
        {{ $t('audit.title') }}
      </h2>
      <p class="mb-4 text-sm text-muted">
        {{ $t('audit.hint') }}
      </p>
      <AdminTable :empty="!ops.auditLog.length">
        <template #head>
          <tr>
            <th class="px-4 py-3 font-medium">
              {{ $t('col.lastLogin') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('col.name') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('col.actions') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('col.case') }}
            </th>
          </tr>
        </template>
        <tr
          v-for="row in ops.auditLog"
          :key="row.id"
          class="border-b border-default last:border-0"
        >
          <td class="px-4 py-3 text-muted">
            {{ row.at }}
          </td>
          <td class="px-4 py-3">
            {{ row.actor }}
          </td>
          <td class="px-4 py-3">
            {{ row.action }}
          </td>
          <td class="px-4 py-3 text-muted">
            {{ row.target }}
          </td>
        </tr>
      </AdminTable>
    </section>

    <USlideover
      v-model:open="drawerOpen"
      :title="editingId ? $t('actions.edit') : $t('actions.invite')"
      :description="$t('form.staffTitle')"
    >
      <template #body>
        <UForm
          id="staff-form"
          :schema="staffSchema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UFormField
            name="name"
            :label="$t('col.name')"
          >
            <UInput
              v-model="state.name"
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
            name="role"
            :label="$t('col.role')"
          >
            <USelect
              v-model="state.role"
              :items="staffRoleOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField
            v-if="showOrg && state.role && !isPlatformRole(state.role)"
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
            name="status"
            :label="$t('col.status')"
          >
            <USelect
              v-model="state.status"
              :items="accountStatusOptions"
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
          form="staff-form"
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
