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
    </template>

    <ProductFormFields
      v-model:state="state"
      form-id="product-form"
      sku-locked
      @submit="onSubmit"
    />

    <div class="mt-6 flex justify-end gap-2">
      <UButton
        color="neutral"
        variant="outline"
        @click="goList"
      >
        {{ $t('actions.cancel') }}
      </UButton>
      <UButton
        type="submit"
        form="product-form"
        :disabled="!writable"
      >
        {{ $t('actions.save') }}
      </UButton>
    </div>
  </PageHeader>
</template>
