<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <PageHeader
    :title="t('nav.ctaCatalog')"
    :description="t('settings.ctaCatalog.hint')"
    plain
  >
    <CtaCatalogSettings />
  </PageHeader>
</template>
