<template>
  <img
    v-if="src"
    :src="src"
    :alt="label"
    class="shrink-0 rounded-lg object-cover"
    :class="sizeClass"
  >
  <span
    v-else
    class="inline-flex shrink-0 items-center justify-center rounded-lg font-semibold text-white"
    :class="sizeClass"
    :style="{ backgroundColor: tone }"
    aria-hidden="true"
  >
    {{ letter }}
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  seed: string
  label: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
}>(), {
  src: null,
  size: 'md'
})

const tone = computed(() => thumbTone(props.seed))
const letter = computed(() => thumbLetter(props.label))
const sizeClass = computed(() => {
  if (props.size === 'sm') {
    return 'size-9 text-sm'
  }
  if (props.size === 'lg') {
    return 'size-14 text-lg'
  }
  return 'size-11 text-base'
})
</script>
