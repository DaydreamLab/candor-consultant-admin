<script setup lang="ts">
import { productSchema } from '~/utils/schemas'
import type { ProductForm } from '~/utils/schemas'
import { DEMO_LABELS } from '~/utils/demo'
import type { FormSubmitEvent } from '@nuxt/ui'

defineProps<{
  formId: string
  skuLocked?: boolean
}>()

const emit = defineEmits<{
  submit: [event: FormSubmitEvent<ProductForm>]
}>()

const { showOrg, orgOptions } = useOrgScope()
const state = defineModel<Partial<ProductForm>>('state', { required: true })

const labelOptions = DEMO_LABELS.map(row => ({ label: row.id, value: row.id }))
</script>

<template>
  <UForm
    :id="formId"
    :schema="productSchema"
    :state="state"
    class="grid gap-6 lg:grid-cols-2"
    @submit="emit('submit', $event)"
  >
    <section class="space-y-4 rounded-xl border border-default bg-elevated p-4 sm:p-5">
      <h2 class="text-base font-semibold text-highlighted">
        {{ $t('form.identity') }}
      </h2>
      <UFormField
        v-if="showOrg"
        name="orgId"
        :label="$t('form.orgRequired')"
      >
        <USelect
          v-model="state.orgId"
          :items="orgOptions()"
          value-key="value"
          class="w-full"
        />
      </UFormField>
      <UFormField
        name="sku"
        :label="$t('col.sku')"
      >
        <UInput
          v-model="state.sku"
          :disabled="skuLocked"
          class="w-full"
        />
      </UFormField>
      <UFormField
        name="name"
        :label="$t('col.yName')"
      >
        <UInput
          v-model="state.name"
          class="w-full"
        />
      </UFormField>
      <UFormField
        name="nameEn"
        :label="$t('form.nameEn')"
      >
        <UInput
          v-model="state.nameEn"
          class="w-full"
        />
      </UFormField>
      <UFormField
        name="aLabel"
        :label="$t('col.aLabel')"
      >
        <UInput
          v-model="state.aLabel"
          class="w-full"
        />
      </UFormField>
      <UFormField
        name="aLabelEn"
        :label="$t('form.aLabelEn')"
      >
        <UInput
          v-model="state.aLabelEn"
          class="w-full"
        />
      </UFormField>
      <UFormField
        name="spec"
        :label="$t('col.spec')"
      >
        <UInput
          v-model="state.spec"
          class="w-full"
        />
      </UFormField>
    </section>

    <section class="space-y-4 rounded-xl border border-default bg-elevated p-4 sm:p-5">
      <h2 class="text-base font-semibold text-highlighted">
        {{ $t('form.stockPrice') }}
      </h2>
      <UFormField
        name="cost"
        :label="$t('col.cost')"
      >
        <UInput
          v-model="state.cost"
          type="number"
          class="w-full"
        />
      </UFormField>
      <UFormField
        name="priceToA"
        :label="$t('col.priceToA')"
      >
        <UInput
          v-model="state.priceToA"
          type="number"
          class="w-full"
        />
      </UFormField>
      <UFormField
        name="labelVersion"
        :label="$t('col.labelVer')"
      >
        <USelect
          v-model="state.labelVersion"
          :items="labelOptions"
          value-key="value"
          class="w-full"
        />
      </UFormField>
      <UFormField
        name="onHand"
        :label="$t('col.onHand')"
      >
        <UInput
          v-model="state.onHand"
          type="number"
          class="w-full"
        />
      </UFormField>
      <UFormField
        name="reserved"
        :label="$t('col.reserved')"
      >
        <UInput
          v-model="state.reserved"
          type="number"
          class="w-full"
        />
      </UFormField>
      <UFormField
        name="reorderAt"
        :label="$t('col.reorder')"
      >
        <UInput
          v-model="state.reorderAt"
          type="number"
          class="w-full"
        />
      </UFormField>
    </section>
  </UForm>
</template>
