<script setup lang="ts">
import { WEIGHT_SET_STATUS_COLOR } from '~/utils/expert-tuning-mock'

const route = useRoute()
const localePath = useLocalePath()
const { locale } = useI18n()
const { weightSets } = useExpertTuningMockStore()

const weightId = computed(() => String(route.params.id ?? ''))
const selected = computed(() => weightSets.value.find(row => row.id === weightId.value) ?? null)
const weightLabel = useState<string | null>('candor-weight-set-label', () => null)

watch(selected, (row) => {
  if (!row) {
    weightLabel.value = null
    return
  }
  weightLabel.value = String(locale.value).startsWith('en') ? row.labelEn : row.label
}, { immediate: true })

onUnmounted(() => {
  weightLabel.value = null
})

function unlockNoteOf() {
  const row = selected.value
  if (!row) {
    return ''
  }
  return String(locale.value).startsWith('en')
    ? (row.unlock_note_en ?? row.unlock_note ?? '')
    : (row.unlock_note ?? row.unlock_note_en ?? '')
}

function formatWeight(value: number) {
  return value.toFixed(2)
}
</script>

<template>
  <PageHeader
    :title="weightLabel || weightId"
    :description="$t('weights.description')"
  >
    <ExpertTuningTabs />

    <p
      v-if="!selected"
      class="text-sm text-error"
    >
      {{ $t('weights.notFound') }}
    </p>
    <template v-else>
      <dl class="mb-4 grid gap-3 rounded-xl border border-default bg-elevated p-4 text-sm sm:grid-cols-2">
        <div>
          <dt class="text-muted">
            {{ $t('weights.columns.version') }}
          </dt>
          <dd class="mt-1 font-medium text-highlighted">
            {{ selected.version }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            {{ $t('weights.columns.status') }}
          </dt>
          <dd class="mt-1">
            <StatusBadge
              :label="$t(`weights.status.${selected.status}`)"
              :color="WEIGHT_SET_STATUS_COLOR[selected.status]"
            />
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            {{ $t('weights.columns.baseline') }}
          </dt>
          <dd class="mt-1 font-medium text-highlighted">
            {{ selected.baseline_version ?? $t('status.na') }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            {{ $t('weights.columns.updatedAt') }}
          </dt>
          <dd class="mt-1 text-highlighted">
            {{ selected.updated_at }}
          </dd>
        </div>
      </dl>

      <p
        v-if="unlockNoteOf()"
        class="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-highlighted"
      >
        {{ unlockNoteOf() }}
      </p>

      <section class="overflow-hidden rounded-xl border border-default bg-elevated">
        <h2 class="border-b border-default px-4 py-3 text-base font-semibold text-highlighted">
          {{ $t('weights.entriesTitle') }}
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[20rem] border-collapse text-sm">
            <thead>
              <tr class="bg-muted text-left text-xs font-semibold text-muted">
                <th class="px-4 py-2">
                  {{ $t('weights.entries.domain') }}
                </th>
                <th class="px-4 py-2">
                  {{ $t('weights.entries.ingredient') }}
                </th>
                <th class="px-4 py-2 text-right">
                  {{ $t('weights.entries.baseWeight') }}
                </th>
                <th class="px-4 py-2 text-right">
                  {{ $t('weights.entries.priority') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(entry, index) in selected.entries"
                :key="`${entry.domain}-${entry.ingredient}-${index}`"
                class="border-t border-default"
              >
                <td class="px-4 py-2.5 text-highlighted">
                  {{ entry.domain }}
                </td>
                <td class="px-4 py-2.5 text-highlighted">
                  {{ entry.ingredient }}
                </td>
                <td class="px-4 py-2.5 text-right tabular-nums text-highlighted">
                  {{ formatWeight(entry.base_weight) }}
                </td>
                <td class="px-4 py-2.5 text-right tabular-nums text-muted">
                  {{ entry.priority }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="mt-4">
        <UButton
          color="neutral"
          variant="ghost"
          :to="localePath('/weights')"
        >
          {{ $t('weights.backToList') }}
        </UButton>
      </div>
      <p class="mt-3 text-xs text-muted">
        {{ $t('weights.mockHint') }}
      </p>
    </template>
  </PageHeader>
</template>
