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

function isMissing(row: ProgressRow) {
  const text = missing(row)
  return !['可向坦見請款', 'Ready to invoice Candor'].includes(text)
}

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
        size="md"
        :disabled="!writable"
        @click="startEdit"
      >
        {{ $t('progress.edit') }}
      </UButton>
    </template>

    <p class="mb-4 rounded-lg bg-muted px-4 py-3 text-base text-muted">
      {{ $t('progress.tickHint') }}
    </p>

    <AdminTable :empty="!rows.length">
      <template #head>
        <tr>
          <th class="whitespace-nowrap">
            {{ $t('col.case') }}
          </th>
          <th>{{ $t('col.customer') }}</th>
          <th class="whitespace-nowrap">
            {{ $t('col.plan') }}
          </th>
          <th>{{ $t('progress.lab') }}</th>
          <th>{{ $t('progress.report') }}</th>
          <th>{{ $t('progress.consult') }}</th>
          <th>{{ $t('progress.selection') }}</th>
          <th>{{ $t('progress.label') }}</th>
          <th>{{ $t('progress.ship') }}</th>
          <th>{{ $t('col.missing') }}</th>
        </tr>
      </template>
      <tr
        v-for="row in rows"
        :key="row.caseId"
        class="border-b border-default last:border-0"
        :class="editing && dirtyUpdates.some(item => item.caseId === row.caseId) ? 'bg-primary/5' : ''"
      >
        <td class="whitespace-nowrap font-medium text-highlighted">
          <div>{{ row.caseId }}</div>
          <div
            v-if="showOrg"
            class="text-sm text-dimmed"
          >
            {{ orgLabel(row.orgId) }}
          </div>
        </td>
        <td>
          {{ row.customer }}
        </td>
        <td class="whitespace-nowrap">
          {{ $t(`plan.${row.planId}`) }}
        </td>
        <td
          v-for="key in flags"
          :key="key"
        >
          <UCheckbox
            v-if="editing && flagValue(row, key) !== null"
            :model-value="Boolean(flagValue(row, key))"
            size="lg"
            @update:model-value="toggle(row, key, $event as boolean)"
          />
          <span
            v-else-if="flagValue(row, key) === null"
            class="text-muted"
          >{{ $t('status.na') }}</span>
          <UIcon
            v-else
            :name="flagValue(row, key) ? 'i-lucide-circle-check' : 'i-lucide-circle'"
            class="size-7"
            :class="flagValue(row, key) ? 'text-success' : 'text-warning'"
            :aria-label="flagValue(row, key) ? $t('progress.done') : $t('progress.open')"
          />
        </td>
        <td>
          <StatusBadge
            :label="isMissing(row) ? missing(row) : $t('progress.complete')"
            :color="isMissing(row) ? 'warning' : 'success'"
          />
        </td>
      </tr>
    </AdminTable>

    <div
      v-if="editing"
      class="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-default bg-default/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6"
    >
      <div class="flex flex-wrap items-center justify-end gap-3">
        <p class="mr-auto text-base text-muted">
          {{ $t('progress.changed', { n: dirtyCount }) }}
        </p>
        <UButton
          color="neutral"
          variant="outline"
          size="md"
          @click="cancelEdit"
        >
          {{ $t('actions.cancel') }}
        </UButton>
        <UButton
          size="md"
          :disabled="!dirtyCount"
          @click="saveEdit"
        >
          {{ $t('progress.save') }}
        </UButton>
      </div>
    </div>
  </PageHeader>
</template>
