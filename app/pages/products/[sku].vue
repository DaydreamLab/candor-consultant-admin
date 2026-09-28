<script setup lang="ts">
const route = useRoute()
const localePath = useLocalePath()
const { moduleDesc } = usePageCopy()
const { writable } = useOrgScope()

const sku = computed(() => String(route.params.sku ?? ''))
const { state, load, goList, onSubmit } = useProductEditor(sku)

onMounted(async () => {
  if (!load()) {
    await goList()
  }
})
</script>

<template>
  <PageHeader
    :title="$t('actions.edit')"
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

    <ProductFormFields
      v-model:state="state"
      form-id="product-form"
      sku-locked
      @submit="onSubmit"
    />
  </PageHeader>
</template>
