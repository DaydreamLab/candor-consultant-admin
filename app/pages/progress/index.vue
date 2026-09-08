<script setup lang="ts">
import type { ProgressRow } from '~/types/admin'

const { locale, t } = useI18n()
const { moduleDesc } = usePageCopy()
const { scoped, orgLabel, showOrg, writable } = useOrgScope()
const ops = useOpsStore()
const feedback = useOpsFeedback()

const flags = ['labScheduled', 'reportBack', 'consultDone', 'keyedIn', 'labeled', 'shipped'] as const
type FlagKey = (typeof flags)[number]
type FlagState = Pick<ProgressRow, FlagKey>

const editing = ref(false)
const draft = ref<Record<string, FlagState>>({})
const baseline = ref<Record<string, FlagState>>({})

const rows = computed(() => scoped(ops.progress))

function cloneFlags(row: ProgressRow): FlagState {
  return {
    labScheduled: row.labScheduled,
    reportBack: row.reportBack,
    consultDone: row.consultDone,
    keyedIn: row.keyedIn,
    labeled: row.labeled,
    shipped: row.shipped
  }
}

function missing(row: ProgressRow) {
  return locale.value === 'en' ? row.missingEn : row.missing
}

function flagsOf(row: ProgressRow): FlagState {
  return editing.value ? (draft.value[row.caseId] ?? cloneFlags(row)) : cloneFlags(row)
}

function flagValue(row: ProgressRow, key: FlagKey) {
  return flagsOf(row)[key]
}

const dirtyUpdates = computed(() => {
  const updates: Array<{ caseId: string, patch: Partial<FlagState> }> = []
  for (const row of rows.value) {
    const next = draft.value[row.caseId]
    const prev = baseline.value[row.caseId]
    if (!next || !prev) {
      continue
    }
    const patch: Partial<FlagState> = {}
    for (const key of flags) {
      if (next[key] !== prev[key]) {
        Object.assign(patch, { [key]: next[key] })
      }
    }
    if (Object.keys(patch).length) {
      updates.push({ caseId: row.caseId, patch })
    }
  }
  return updates
})

const dirtyCount = computed(() => dirtyUpdates.value.length)

function startEdit() {
  if (!writable.value) {
    return
  }
  const next: Record<string, FlagState> = {}
  for (const row of rows.value) {
    next[row.caseId] = cloneFlags(row)
  }
  draft.value = next
  baseline.value = structuredClone(next)
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  draft.value = {}
  baseline.value = {}
}

function saveEdit() {
  const count = ops.applyProgressFlags(dirtyUpdates.value)
  editing.value = false
  draft.value = {}
  baseline.value = {}
  if (count) {
    feedback.notify({
      title: t('progress.savedCount', { n: count })
    })
  }
}

function toggle(row: ProgressRow, key: FlagKey, value: boolean | undefined) {
  if (!editing.value || row[key] === null || value === undefined) {
    return
  }
  const current = draft.value[row.caseId] ?? cloneFlags(row)
  draft.value[row.caseId] = { ...current, [key]: value }
}
</script>

<template>
  <PageHeader
    :title="$t('nav.progress')"
    :description="moduleDesc('progress')"
  >
    <template #actions>
      <UButton
        v-if="!editing"
        icon="i-lucide-pencil"
        :disabled="!writable"
        @click="startEdit"
      >
        {{ $t('progress.edit') }}
      </UButton>
    </template>

    <p class="mb-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted">
      {{ $t('progress.tickHint') }}
    </p>

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
            {{ $t('progress.lab') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('progress.report') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('progress.consult') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('progress.selection') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('progress.label') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('progress.ship') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.missing') }}
          </th>
        </tr>
      </template>
      <tr
        v-for="row in rows"
        :key="row.caseId"
        class="border-b border-default last:border-0"
        :class="editing && dirtyUpdates.some(item => item.caseId === row.caseId) ? 'bg-primary/5' : ''"
      >
        <td class="px-4 py-3 font-medium text-highlighted">
          <div>{{ row.caseId }}</div>
          <div
            v-if="showOrg"
            class="text-xs text-dimmed"
          >
            {{ orgLabel(row.orgId) }}
          </div>
        </td>
        <td class="px-4 py-3">
          {{ row.customer }}
        </td>
        <td class="px-4 py-3">
          {{ $t(`plan.${row.planId}`) }}
        </td>
        <td
          v-for="key in flags"
          :key="key"
          class="px-4 py-3"
        >
          <UCheckbox
            v-if="editing && flagValue(row, key) !== null"
            :model-value="Boolean(flagValue(row, key))"
            @update:model-value="toggle(row, key, $event as boolean)"
          />
          <span
            v-else-if="flagValue(row, key) === null"
            class="text-muted"
          >{{ $t('status.na') }}</span>
          <UIcon
            v-else
            :name="flagValue(row, key) ? 'i-lucide-circle-check' : 'i-lucide-circle'"
            class="size-4"
            :class="flagValue(row, key) ? 'text-success' : 'text-dimmed'"
            :aria-label="flagValue(row, key) ? $t('progress.done') : $t('progress.open')"
          />
        </td>
        <td class="px-4 py-3 text-muted">
          {{ missing(row) }}
        </td>
      </tr>
    </AdminTable>

    <div
      v-if="editing"
      class="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-default bg-default/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"
    >
      <div class="flex flex-wrap items-center justify-end gap-3">
        <p class="mr-auto text-sm text-muted">
          {{ $t('progress.changed', { n: dirtyCount }) }}
        </p>
        <UButton
          color="neutral"
          variant="outline"
          @click="cancelEdit"
        >
          {{ $t('actions.cancel') }}
        </UButton>
        <UButton
          :disabled="!dirtyCount"
          @click="saveEdit"
        >
          {{ $t('progress.save') }}
        </UButton>
      </div>
    </div>
  </PageHeader>
</template>
