<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <PageHeader
    :title="t('nav.privacy')"
    :description="t('settings.privacy.hint')"
    plain
  >
    <PrivacyPolicySettings />
  </PageHeader>
</template>
