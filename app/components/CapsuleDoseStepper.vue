<script setup lang="ts">
import {
  bumpCapsuleDose,
  canDecrementCapsuleDose,
  validateCapsuleDose
} from '~/utils/expert-case-dose'

const props = withDefaults(defineProps<{
  modelValue: string
  disabled?: boolean
  invalid?: boolean
  testId?: string
}>(), {
  disabled: false,
  invalid: false,
  testId: 'capsule-dose-stepper'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'blur': []
}>()

const canMinus = computed(() => canDecrementCapsuleDose(props.modelValue))

function setValue(next: string) {
  emit('update:modelValue', next)
}

function decrement() {
  if (props.disabled || !canMinus.value) {
    return
  }
  setValue(bumpCapsuleDose(props.modelValue, -1))
}

function increment() {
  if (props.disabled) {
    return
  }
  setValue(bumpCapsuleDose(props.modelValue, 1))
}

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  setValue(target.value)
}

function onBlur() {
  emit('blur')
}

const showErrorBorder = computed(() => {
  if (props.invalid) {
    return true
  }
  if (props.modelValue === '') {
    return false
  }
  return !validateCapsuleDose(props.modelValue).ok
})
</script>

<template>
  <div
    class="inline-flex items-center gap-2"
    :data-testid="testId"
  >
    <div
      class="inline-flex items-stretch overflow-hidden rounded-md border"
      :class="showErrorBorder ? 'border-error' : 'border-default'"
    >
      <button
        type="button"
        class="px-2.5 text-sm text-highlighted disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="disabled || !canMinus"
        :data-testid="`${testId}-minus`"
        @click="decrement"
      >
        −
      </button>
      <input
        :value="modelValue"
        inputmode="numeric"
        pattern="[0-9]*"
        class="w-14 border-x border-default bg-transparent px-2 py-1.5 text-center text-sm tabular-nums outline-none"
        :class="showErrorBorder ? 'border-error' : ''"
        :disabled="disabled"
        :data-testid="`${testId}-input`"
        @input="onInput"
        @blur="onBlur"
      >
      <button
        type="button"
        class="px-2.5 text-sm text-highlighted disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="disabled"
        :data-testid="`${testId}-plus`"
        @click="increment"
      >
        +
      </button>
    </div>
    <span
      class="text-sm text-muted"
      :data-testid="`${testId}-unit`"
    >
      {{ $t('expertCaseReviews.doseUnit') }}
    </span>
  </div>
</template>
