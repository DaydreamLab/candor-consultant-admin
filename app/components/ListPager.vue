<template>
  <div
    v-if="total > pageSize"
    class="mt-4 flex flex-wrap items-center justify-between gap-3"
  >
    <p class="text-sm text-muted">
      {{ $t('table.showing', { from, to, total }) }}
    </p>
    <UPagination
      :page="page"
      :total="total"
      :items-per-page="pageSize"
      @update:page="emit('update:page', $event)"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  page: number
  pageSize: number
  total: number
  from: number
  to: number
}>()

const emit = defineEmits<{
  'update:page': [value: number]
}>()
</script>
