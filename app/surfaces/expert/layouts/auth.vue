<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: t('expertStation.brand')
})
</script>

<template>
  <div
    class="min-h-screen bg-muted/40 text-default"
    data-surface="expert"
  >
    <div class="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <slot />
    </div>
  </div>
</template>
