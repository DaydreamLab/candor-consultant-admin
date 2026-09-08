<script setup lang="ts">
import { staffSchema } from '~/utils/schemas'
import type { StaffForm } from '~/utils/schemas'
import type { Role, StaffRow } from '~/types/admin'
import { isPlatformRole } from '~/types/admin'
import type { FormSubmitEvent } from '@nuxt/ui'

const session = useSessionStore()
const { t } = useI18n()
const { moduleDesc } = usePageCopy()
const { orgLabel, showOrg, platform, usersWritable, orgOptions } = useOrgScope()
const ops = useOpsStore()
const feedback = useOpsFeedback()
const { accountStatusOptions, staffRoleOptions } = useSelectOptions()

const selectedId = ref<string | null>(null)
const creating = ref(false)
const deleteId = ref<string | null>(null)
const state = reactive<Partial<StaffForm>>({})

const rows = computed(() => {
  if (platform.value) {
    return ops.staff
  }
  const orgId = session.session?.orgId
  return ops.staff.filter(row => row.orgId === orgId)
})

const selected = computed(() => rows.value.find(row => row.id === selectedId.value) ?? null)
const detailOpen = computed(() => creating.value || Boolean(selected.value))

function fillCreate() {
  Object.assign(state, {
    name: '',
    email: '',
    role: 'consultant_ops',
    orgId: ops.defaultOrgId(),
    status: 'invited'
  })
}

function fillEdit(row: StaffRow) {
  Object.assign(state, {
    name: row.name,
    email: row.email,
    role: row.role,
    orgId: row.orgId ?? '',
    status: row.status
  })
}

function openCreate() {
  if (!usersWritable.value) {
    return
  }
  selectedId.value = null
  creating.value = true
  fillCreate()
}

function selectRow(row: StaffRow) {
  creating.value = false
  selectedId.value = row.id
  fillEdit(row)
}

function closeDetail() {
  creating.value = false
  selectedId.value = null
}

function persistStaff(data: StaffForm, id?: string) {
  const orgId = isPlatformRole(data.role) ? null : (data.orgId || ops.defaultOrgId())
  return ops.saveStaff({
    id,
    name: data.name,
    email: data.email,
    role: data.role,
    orgId,
    status: data.status
  })
}

function onSubmit(event: FormSubmitEvent<StaffForm>) {
  const data = event.data
  const saved = persistStaff(data, selectedId.value ?? undefined)
  feedback.saved(data.email)
  creating.value = false
  if (saved) {
    selectedId.value = saved.id
    fillEdit(saved)
  }
}

function changeRole(row: StaffRow, role: Role) {
  if (!usersWritable.value) {
    return
  }
  ops.saveStaff({
    id: row.id,
    name: row.name,
    email: row.email,
    role,
    orgId: isPlatformRole(role) ? null : row.orgId,
    status: row.status
  })
  feedback.saved(row.email)
  if (selectedId.value === row.id) {
    fillEdit({ ...row, role, orgId: isPlatformRole(role) ? null : row.orgId })
  }
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
    if (selectedId.value === deleteId.value) {
      closeDetail()
    }
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
    :title="$t('nav.users')"
    :description="moduleDesc('users')"
    :locked="!usersWritable"
  >
    <template #actions>
      <UButton
        icon="i-lucide-user-plus"
        :disabled="!usersWritable"
        @click="openCreate"
      >
        {{ $t('actions.invite') }}
      </UButton>
    </template>

    <p class="mb-4 text-base text-muted">
      {{ $t('users.inviteHint') }}
    </p>

    <SplitDetail>
      <div class="overflow-hidden rounded-xl border border-default bg-elevated">
        <button
          v-for="row in rows"
          :key="row.id"
          type="button"
          class="flex w-full flex-wrap items-center gap-4 border-b border-default px-4 py-4 text-left last:border-0 hover:bg-muted/40"
          :class="row.id === selectedId ? 'bg-primary/5' : ''"
          @click="selectRow(row)"
        >
          <UAvatar
            :alt="row.name"
            :text="row.name.slice(0, 1)"
            size="lg"
          />
          <div class="min-w-0 flex-1">
            <p class="text-base font-semibold text-highlighted">
              {{ row.name }}
            </p>
            <p class="mt-0.5 text-sm text-muted">
              {{ row.email }}
            </p>
            <p
              v-if="showOrg"
              class="mt-0.5 text-sm text-dimmed"
            >
              {{ orgLabel(row.orgId) }}
            </p>
          </div>
          <div
            class="min-w-44"
            @click.stop
          >
            <USelect
              :model-value="row.role"
              :items="staffRoleOptions"
              value-key="value"
              :disabled="!usersWritable"
              class="w-full"
              @update:model-value="changeRole(row, $event as Role)"
            />
          </div>
          <StatusBadge
            :label="$t(`status.${row.status}`)"
            :color="row.status === 'active' ? 'success' : 'neutral'"
          />
        </button>
        <p
          v-if="!rows.length"
          class="px-4 py-10 text-center text-base text-muted"
        >
          {{ $t('table.empty') }}
        </p>
      </div>

      <template #detail>
        <DetailPanel
          :open="detailOpen"
          :title="creating ? $t('actions.invite') : selected?.name"
          :subtitle="selected?.email ?? $t('form.staffTitle')"
          :empty="$t('users.emptyDetail')"
          icon="i-lucide-users"
          @close="closeDetail"
        >
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
          <template #footer>
            <UButton
              v-if="selected"
              color="error"
              variant="ghost"
              :disabled="!usersWritable"
              @click="deleteId = selected.id"
            >
              {{ $t('actions.delete') }}
            </UButton>
            <UButton
              type="submit"
              form="staff-form"
              :disabled="!usersWritable"
            >
              {{ $t('actions.save') }}
            </UButton>
          </template>
        </DetailPanel>
      </template>
    </SplitDetail>

    <section
      v-if="platform"
      class="mt-8"
    >
      <h2 class="mb-2 text-base font-semibold text-highlighted">
        {{ $t('audit.title') }}
      </h2>
      <p class="mb-4 text-base text-muted">
        {{ $t('audit.hint') }}
      </p>
      <AdminTable :empty="!ops.auditLog.length">
        <template #head>
          <tr>
            <th>{{ $t('col.lastLogin') }}</th>
            <th>{{ $t('col.name') }}</th>
            <th>{{ $t('col.actions') }}</th>
            <th>{{ $t('col.case') }}</th>
          </tr>
        </template>
        <tr
          v-for="row in ops.auditLog"
          :key="row.id"
          class="border-b border-default last:border-0"
        >
          <td class="text-muted">
            {{ row.at }}
          </td>
          <td>
            {{ row.actor }}
          </td>
          <td>
            {{ row.action }}
          </td>
          <td class="text-muted">
            {{ row.target }}
          </td>
        </tr>
      </AdminTable>
    </section>

    <ConfirmDelete
      :open="Boolean(deleteId)"
      @update:open="(open) => { if (!open) deleteId = null }"
      @confirm="confirmDelete"
    />
  </PageHeader>
</template>
