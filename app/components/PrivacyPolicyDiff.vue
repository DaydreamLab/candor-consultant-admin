<script setup lang="ts">
import { buildSideBySideDiff, type SideBySideDiff } from '~/utils/privacy-policy-diff'

const props = defineProps<{
  leftLabel: string
  rightLabel: string
  leftBody: string
  rightBody: string
  pending?: boolean
  error?: string
}>()

const diff = computed<SideBySideDiff>(() => buildSideBySideDiff(props.leftBody, props.rightBody))

function rowClass(kind: string) {
  if (kind === 'added') {
    return 'bg-success/15 text-highlighted'
  }
  if (kind === 'removed') {
    return 'bg-error/15 text-highlighted'
  }
  if (kind === 'empty') {
    return 'bg-muted/30 text-dimmed'
  }
  return 'text-default'
}
</script>

<template>
  <div>
    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('settings.privacy.diffLoading') }}
    </p>
    <p
      v-else-if="error"
      class="text-sm text-error"
    >
      {{ error }}
    </p>
    <div
      v-else
      class="overflow-x-auto rounded-lg border border-default"
      data-testid="privacy-policy-diff"
    >
      <div class="grid min-w-[40rem] grid-cols-2 divide-x divide-default text-xs sm:text-sm">
        <div class="sticky top-0 z-10 border-b border-default bg-elevated px-3 py-2 font-medium text-highlighted">
          {{ leftLabel }}
        </div>
        <div class="sticky top-0 z-10 border-b border-default bg-elevated px-3 py-2 font-medium text-highlighted">
          {{ rightLabel }}
        </div>
        <div class="font-mono leading-6">
          <div
            v-for="(line, index) in diff.left"
            :key="`l-${index}`"
            class="flex gap-2 px-2 py-0.5 whitespace-pre-wrap break-words"
            :class="rowClass(line.kind)"
          >
            <span class="w-8 shrink-0 select-none text-right text-dimmed tabular-nums">
              {{ line.lineNo ?? '' }}
            </span>
            <span class="min-w-0 flex-1">{{ line.text || '\u00a0' }}</span>
          </div>
        </div>
        <div class="font-mono leading-6">
          <div
            v-for="(line, index) in diff.right"
            :key="`r-${index}`"
            class="flex gap-2 px-2 py-0.5 whitespace-pre-wrap break-words"
            :class="rowClass(line.kind)"
          >
            <span class="w-8 shrink-0 select-none text-right text-dimmed tabular-nums">
              {{ line.lineNo ?? '' }}
            </span>
            <span class="min-w-0 flex-1">{{ line.text || '\u00a0' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
