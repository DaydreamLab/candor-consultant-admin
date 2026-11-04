<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <PageHeader
    :title="t('nav.guidance')"
    :description="t('settings.guidance.hint')"
    plain
  >
    <CtaCatalogSettings />
  </PageHeader>
</template>
