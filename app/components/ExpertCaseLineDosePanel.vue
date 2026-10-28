<script setup lang="ts">
import CapsuleDoseStepper from '~/components/CapsuleDoseStepper.vue'
import { dosePanelMode } from '~/utils/expert-case-dose'

const props = withDefaults(defineProps<{
  decision: string
  awaiting?: boolean
  modelValue: string
  suggestedCount: string
  busy?: boolean
  invalid?: boolean
  testIdPrefix?: string
}>(), {
  awaiting: true,
  busy: false,
  invalid: false,
  testIdPrefix: 'expert-case'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'blur': []
}>()

const mode = computed(() => dosePanelMode(props.decision))
</script>

<template>
  <!-- 移除：隱藏劑量列 -->
  <div
    v-if="awaiting && mode === 'hidden'"
    class="mt-2 text-xs text-muted"
    :data-testid="`${testIdPrefix}-dose-removed-hint`"
  >
    {{ $t('expertCaseReviews.doseRemovedHint') }}
  </div>
  <!-- 調劑量：stepper 可編 -->
  <div
    v-else-if="awaiting && mode === 'editable'"
    class="mt-2"
    :data-testid="`${testIdPrefix}-inline-dose-row`"
  >
    <label class="mb-1 block text-sm text-highlighted">
      {{ $t('expertCaseReviews.dose') }}
    </label>
    <CapsuleDoseStepper
      :model-value="modelValue"
      :disabled="busy"
      :invalid="invalid"
      :test-id="`${testIdPrefix}-inline-dose`"
      @update:model-value="emit('update:modelValue', $event)"
      @blur="emit('blur')"
    />
  </div>
  <!-- 保留／未決：建議顆數唯讀；須切調劑量才可編 -->
  <div
    v-else-if="awaiting"
    class="mt-2"
    :data-testid="`${testIdPrefix}-dose-readonly`"
  >
    <p class="text-sm text-highlighted">
      {{ $t('expertCaseReviews.doseSuggestedReadonly', { n: suggestedCount }) }}
    </p>
    <p class="mt-0.5 text-xs text-muted">
      {{ $t('expertCaseReviews.doseKeepEditHint') }}
    </p>
  </div>
</template>
