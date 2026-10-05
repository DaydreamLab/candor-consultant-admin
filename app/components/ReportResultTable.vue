<script setup lang="ts">
import {
  displayResultValue,
  formatResultRef,
  resultGaugePct,
  resultStatusClass,
  type HealthReportResult,
  type ResultStatusClass
} from '~/utils/report-result-status'

defineProps<{
  results: HealthReportResult[]
  hideScrollbar?: boolean
}>()

const { t } = useI18n()

function resultStatusLabel(cls: ResultStatusClass) {
  if (cls === 'ok') {
    return t('orders.reportReading.optimal')
  }
  if (cls === 'warn') {
    return t('orders.reportReading.caution')
  }
  if (cls === 'alert') {
    return t('orders.reportReading.alert')
  }
  return t('orders.reportReading.pending')
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="shrink-0 border-b border-default bg-elevated px-4 py-2.5">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-muted px-3 py-2 text-xs text-muted">
        <span class="inline-flex items-center">
          <i class="yr-dot ok" />{{ $t('orders.reportReading.optimal') }}
        </span>
        <span class="inline-flex items-center">
          <i class="yr-dot warn" />{{ $t('orders.reportReading.caution') }}
        </span>
        <span class="inline-flex items-center">
          <i class="yr-dot alert" />{{ $t('orders.reportReading.alert') }}
        </span>
        <span class="text-dimmed sm:ms-auto">{{ $t('orders.reportReading.colorHint') }}</span>
      </div>
    </div>
    <div
      class="flex min-h-0 flex-1 flex-col bg-elevated px-4 py-3"
      :class="hideScrollbar ? 'scrollbar-none' : ''"
    >
      <div
        class="min-h-0 flex-1 overflow-auto rounded-lg border border-default bg-default"
        :class="hideScrollbar ? 'scrollbar-none' : ''"
      >
        <table class="w-full min-w-[32rem] border-separate border-spacing-0 text-sm">
          <thead>
            <tr class="text-left text-xs font-semibold text-muted">
              <th class="sticky top-0 z-10 min-w-[6.5rem] whitespace-nowrap border-b border-dashed border-default bg-muted px-2.5 py-2">
                {{ $t('orders.reportReading.status') }}
              </th>
              <th class="sticky top-0 z-10 border-b border-dashed border-default bg-muted px-2.5 py-2">
                {{ $t('orders.reportReading.item') }}
              </th>
              <th class="sticky top-0 z-10 border-b border-dashed border-default bg-muted px-2.5 py-2">
                {{ $t('orders.reportReading.value') }}
              </th>
              <th class="sticky top-0 z-10 border-b border-dashed border-default bg-muted px-2.5 py-2">
                {{ $t('orders.reportReading.unit') }}
              </th>
              <th class="sticky top-0 z-10 border-b border-dashed border-default bg-muted px-2.5 py-2">
                {{ $t('orders.reportReading.refRange') }}
              </th>
              <th class="sticky top-0 z-10 border-b border-dashed border-default bg-muted px-2.5 py-2">
                {{ $t('orders.reportReading.position') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in results"
              :key="row.id"
              class="border-b border-dashed border-default last:border-b-0 [&>td]:border-b [&>td]:border-dashed [&>td]:border-default last:[&>td]:border-b-0"
            >
              <td class="min-w-[6.5rem] whitespace-nowrap px-2.5 py-2.5 text-highlighted">
                <i
                  class="yr-dot"
                  :class="resultStatusClass(row)"
                />{{ resultStatusLabel(resultStatusClass(row)) }}
              </td>
              <td class="px-2.5 py-2.5 font-semibold text-highlighted">
                {{ row.raw_name || row.biomarker_id || '—' }}
              </td>
              <td
                class="px-2.5 py-2.5 text-base font-bold"
                :class="`yr-val-${resultStatusClass(row)}`"
              >
                {{ displayResultValue(row) }}
              </td>
              <td class="px-2.5 py-2.5 text-muted">
                {{ row.unit || row.raw_unit || '—' }}
              </td>
              <td class="px-2.5 py-2.5 text-xs text-muted">
                {{ formatResultRef(row) }}
              </td>
              <td class="overflow-visible px-2.5 py-2.5">
                <div
                  v-if="resultGaugePct(row) != null"
                  class="yr-gauge relative h-2 w-[4.5rem] overflow-visible rounded-full"
                >
                  <div
                    class="yr-gauge-marker absolute top-[-3px] h-3.5 -translate-x-1/2 rounded-sm"
                    :style="{ left: `${resultGaugePct(row)}%` }"
                  />
                </div>
                <span
                  v-else
                  class="text-muted"
                >—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-none {
  scrollbar-width: none;
}

.scrollbar-none::-webkit-scrollbar {
  display: none;
}

.yr-dot {
  display: inline-block;
  width: 0.55rem;
  height: 0.55rem;
  margin-right: 0.3rem;
  vertical-align: middle;
  border-radius: 999px;
}

.yr-dot.ok {
  background: var(--ui-success);
}

.yr-dot.warn {
  background: var(--ui-warning);
}

.yr-dot.alert {
  background: var(--ui-error);
}

.yr-dot.unknown {
  background: var(--ui-text-dimmed);
}

.yr-val-ok {
  color: var(--ui-success);
}

.yr-val-warn {
  color: var(--ui-warning);
}

.yr-val-alert {
  color: var(--ui-error);
}

.yr-val-unknown {
  color: var(--ui-text-muted);
}

.yr-gauge {
  background: linear-gradient(
    90deg,
    color-mix(in oklab, var(--ui-error) 85%, var(--ui-bg-elevated)) 0%,
    color-mix(in oklab, var(--ui-warning) 85%, var(--ui-bg-elevated)) 28%,
    color-mix(in oklab, var(--ui-success) 85%, var(--ui-bg-elevated)) 50%,
    color-mix(in oklab, var(--ui-warning) 85%, var(--ui-bg-elevated)) 72%,
    color-mix(in oklab, var(--ui-error) 85%, var(--ui-bg-elevated)) 100%
  );
}

.yr-gauge-marker {
  width: 3px;
  background: var(--ui-text-highlighted);
  box-shadow: 0 0 0 1px var(--ui-bg-elevated);
}
</style>
