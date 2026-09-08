<script setup lang="ts">
import { productSchema } from '~/utils/schemas'
import type { ProductForm } from '~/utils/schemas'
import type { FormSubmitEvent } from '@nuxt/ui'
import { DEMO_LABELS } from '~/utils/demo'

const { locale, t } = useI18n()
const { moduleDesc } = usePageCopy()
const { scoped, orgLabel, showOrg, writable, orgOptions } = useOrgScope()
const ops = useOpsStore()
const feedback = useOpsFeedback()

const query = ref('')
const drawerOpen = ref(false)
const editingSku = ref<string | null>(null)
const deleteSku = ref<string | null>(null)
const state = reactive<Partial<ProductForm>>({})

const rows = computed(() => {
  const list = scoped(ops.products).map((product) => {
    const stock = ops.inventory.find(item => item.sku === product.sku)
    const onHand = stock?.onHand ?? 0
    const reserved = stock?.reserved ?? 0
    const available = onHand - reserved
    const reorderAt = stock?.reorderAt ?? 0
    return {
      ...product,
      onHand,
      reserved,
      available,
      reorderAt,
      low: available <= reorderAt
    }
  })
  const q = query.value.trim().toLowerCase()
  if (!q) {
    return list
  }
  return list.filter((row) => {
    const name = locale.value === 'en' ? row.nameEn : row.name
    const label = locale.value === 'en' ? row.aLabelEn : row.aLabel
    return [row.sku, name, label].join(' ').toLowerCase().includes(q)
  })
})

const labelOptions = DEMO_LABELS.map(row => ({ label: row.id, value: row.id }))

function yName(row: (typeof rows.value)[number]) {
  return locale.value === 'en' ? row.nameEn : row.name
}

function aName(row: (typeof rows.value)[number]) {
  return locale.value === 'en' ? row.aLabelEn : row.aLabel
}

function openCreate() {
  editingSku.value = null
  Object.assign(state, {
    sku: '',
    orgId: ops.defaultOrgId(),
    name: '',
    nameEn: '',
    aLabel: '',
    aLabelEn: '',
    spec: '',
    cost: 0,
    priceToA: 0,
    labelVersion: DEMO_LABELS.find(row => row.current)?.id ?? DEMO_LABELS[0]?.id,
    onHand: 0,
    reserved: 0,
    reorderAt: 0
  })
  drawerOpen.value = true
}

function openEdit(row: (typeof rows.value)[number]) {
  editingSku.value = row.sku
  Object.assign(state, {
    sku: row.sku,
    orgId: row.orgId,
    name: row.name,
    nameEn: row.nameEn,
    aLabel: row.aLabel,
    aLabelEn: row.aLabelEn,
    spec: row.spec,
    cost: row.cost,
    priceToA: row.priceToA,
    labelVersion: row.labelVersion,
    onHand: row.onHand,
    reserved: row.reserved,
    reorderAt: row.reorderAt
  })
  drawerOpen.value = true
}

function onSubmit(event: FormSubmitEvent<ProductForm>) {
  const saved = ops.saveProduct(event.data, editingSku.value ?? undefined)
  if (!saved) {
    feedback.warned(event.data.sku)
    return
  }
  drawerOpen.value = false
  feedback.saved(event.data.sku)
}

function confirmDelete() {
  if (!deleteSku.value) {
    return
  }
  const ok = ops.removeProduct(deleteSku.value)
  if (!ok) {
    feedback.warned(tInUse())
  } else {
    feedback.deleted(deleteSku.value)
  }
  deleteSku.value = null
}

function tInUse() {
  return t('actions.inUse')
}
</script>

<template>
  <PageHeader
    :title="$t('nav.products')"
    :description="moduleDesc('products')"
  >
    <template #actions>
      <UInput
        v-model="query"
        icon="i-lucide-search"
        :placeholder="$t('table.search')"
        class="w-44"
      />
      <UButton
        icon="i-lucide-plus"
        :disabled="!writable"
        @click="openCreate"
      >
        {{ $t('actions.add') }}
      </UButton>
    </template>

    <AdminTable :empty="!rows.length">
      <template #head>
        <tr>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.sku') }}
          </th>
          <th
            v-if="showOrg"
            class="px-4 py-3 font-medium"
          >
            {{ $t('col.org') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.yName') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.aLabel') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.spec') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.onHand') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.available') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.cost') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.priceToA') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.status') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.actions') }}
          </th>
        </tr>
      </template>
      <tr
        v-for="row in rows"
        :key="row.sku"
        class="border-b border-default last:border-0"
      >
        <td class="px-4 py-3 font-medium text-highlighted">
          {{ row.sku }}
        </td>
        <td
          v-if="showOrg"
          class="px-4 py-3 text-muted"
        >
          {{ orgLabel(row.orgId) }}
        </td>
        <td class="px-4 py-3">
          {{ yName(row) }}
        </td>
        <td class="px-4 py-3">
          {{ aName(row) }}
        </td>
        <td class="px-4 py-3 text-muted">
          {{ row.spec }}
        </td>
        <td class="px-4 py-3">
          {{ row.onHand }}
        </td>
        <td class="px-4 py-3">
          {{ row.available }}
        </td>
        <td class="px-4 py-3">
          {{ money(row.cost) }}
        </td>
        <td class="px-4 py-3">
          {{ money(row.priceToA) }}
        </td>
        <td class="px-4 py-3">
          <StatusBadge
            :label="row.low ? $t('workbench.lowStock') : $t('status.active')"
            :color="row.low ? 'error' : 'success'"
          />
        </td>
        <td class="px-4 py-3">
          <RowActions
            :disabled="!writable"
            @edit="openEdit(row)"
            @remove="deleteSku = row.sku"
          />
        </td>
      </tr>
    </AdminTable>

    <USlideover
      v-model:open="drawerOpen"
      :title="editingSku ? $t('actions.edit') : $t('actions.add')"
      :description="$t('form.productTitle')"
    >
      <template #body>
        <UForm
          id="product-form"
          :schema="productSchema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
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
        </UForm>
      </template>
      <template #footer="{ close }">
        <UButton
          color="neutral"
          variant="outline"
          @click="close"
        >
          {{ $t('actions.cancel') }}
        </UButton>
        <UButton
          type="submit"
          form="product-form"
        >
          {{ $t('actions.save') }}
        </UButton>
      </template>
    </USlideover>

    <ConfirmDelete
      :open="Boolean(deleteSku)"
      @update:open="(open) => { if (!open) deleteSku = null }"
      @confirm="confirmDelete"
    />
  </PageHeader>
</template>
