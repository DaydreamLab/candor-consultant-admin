<script setup lang="ts">
const route = useRoute()

const orderId = computed(() => String(route.params.id ?? ''))
</script>

<template>
  <PageHeader
    :title="orderId"
    plain
  />
</template>
