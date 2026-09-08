<script setup lang="ts">
const localePath = useLocalePath()
const { t } = useI18n()
const { moduleDesc } = usePageCopy()
const { state, load, goList, onSubmit } = useProductEditor(null)
const { writable } = useOrgScope()

load()

const crumbs = computed(() => [
  { label: t('nav.products'), to: localePath('/products') },
  { label: t('actions.add') }
])
</script>

<template>
  <PageHeader
    :title="$t('actions.add')"
    :description="moduleDesc('products')"
  >
    <template #actions>
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-arrow-left"
        :to="localePath('/products')"
      >
        {{ $t('form.back') }}
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        @click="goList"
      >
        {{ $t('actions.cancel') }}
      </UButton>
      <UButton
        type="submit"
        form="product-form"
        size="lg"
        :disabled="!writable"
      >
        {{ $t('actions.save') }}
      </UButton>
    </template>

    <AppBreadcrumb :items="crumbs" />

    <ProductFormFields
      v-model:state="state"
      form-id="product-form"
      @submit="onSubmit"
    />
  </PageHeader>
</template>
