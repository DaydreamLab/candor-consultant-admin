<script setup lang="ts">
import { selectionLineSchema } from '~/utils/schemas'
import type { SelectionLineForm } from '~/utils/schemas'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { KeyInLine } from '~/types/admin'

const { locale } = useI18n()
const { moduleDesc } = usePageCopy()
const { scoped, orgLabel, showOrg, writable } = useOrgScope()
const ops = useOpsStore()
const feedback = useOpsFeedback()

const drawerOpen = ref(false)
const editingId = ref<string | null>(null)
const deleteId = ref<string | null>(null)
const state = reactive<Partial<SelectionLineForm>>({})

const groups = computed(() => {
  const cases = scoped(ops.cases).filter(row => row.planId === 'premium')
  const lines = scoped(ops.keyIn)

  return cases.map((row) => {
    const items = lines.filter(line => line.caseId === row.id).map((line) => {
      const product = ops.productOf(line.sku)
      return {
        ...line,
        yName: product ? (locale.value === 'en' ? product.nameEn : product.name) : line.sku,
        aLabel: product ? (locale.value === 'en' ? product.aLabelEn : product.aLabel) : line.sku,
        amount: (product?.cost ?? 0) * line.qty
      }
    })
    const confirmed = items.length > 0 && items.every(item => item.status === 'confirmed')
    return {
      ...row,
      customerName: locale.value === 'en' ? row.customerEn : row.customer,
      items,
      total: items.reduce((sum, item) => sum + item.amount, 0),
      listStatus: items.length === 0 ? 'draft' : (confirmed ? 'confirmed' : 'draft')
    }
  })
})

function skuOptions(orgId: string) {
  return ops.products
    .filter(row => row.orgId === orgId)
    .map(row => ({
      label: `${locale.value === 'en' ? row.aLabelEn : row.aLabel} · ${row.sku}`,
      value: row.sku
    }))
}

function openCreate(caseId: string) {
  editingId.value = null
  Object.assign(state, { caseId, sku: '', qty: 1 })
  drawerOpen.value = true
}

function openEdit(line: KeyInLine) {
  editingId.value = line.id
  Object.assign(state, { caseId: line.caseId, sku: line.sku, qty: line.qty })
  drawerOpen.value = true
}

function onSubmit(event: FormSubmitEvent<SelectionLineForm>) {
  const data = event.data
  const caseRow = ops.cases.find(row => row.id === data.caseId)
  if (editingId.value) {
    ops.updateKeyInLine(editingId.value, { sku: data.sku, qty: data.qty })
  } else {
    ops.addKeyInLine({
      caseId: data.caseId,
      orgId: caseRow?.orgId ?? ops.defaultOrgId(),
      sku: data.sku,
      qty: data.qty
    })
  }
  drawerOpen.value = false
  feedback.saved(data.sku)
}

function confirmLine() {
  if (!deleteId.value) {
    return
  }
  ops.removeKeyInLine(deleteId.value)
  feedback.deleted()
  deleteId.value = null
}

function confirmCase(caseId: string) {
  ops.confirmSelection(caseId)
  feedback.saved(caseId)
}

const activeOrgId = computed(() => {
  const caseRow = ops.cases.find(row => row.id === state.caseId)
  return caseRow?.orgId ?? ops.defaultOrgId()
})
</script>

<template>
  <PageHeader
    :title="$t('nav.selections')"
    :description="moduleDesc('selections')"
  >
    <p class="mb-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted">
      {{ $t('selections.confirmHint') }}
    </p>

    <div
      v-if="!groups.length"
      class="rounded-xl border border-default bg-elevated p-8 text-center text-sm text-muted"
    >
      {{ $t('table.empty') }}
    </div>

    <div class="space-y-4">
      <section
        v-for="group in groups"
        :key="group.id"
        class="overflow-hidden rounded-xl border border-default bg-elevated"
      >
        <header class="flex flex-wrap items-center gap-3 border-b border-default px-4 py-3">
          <div class="min-w-0 flex-1">
            <p class="font-medium text-highlighted">
              {{ group.id }} · {{ group.customerName }}
            </p>
            <p class="text-xs text-muted">
              <span v-if="showOrg">{{ orgLabel(group.orgId) }} · </span>{{ $t(`plan.${group.planId}`) }}
            </p>
          </div>
          <StatusBadge
            :label="$t(`status.${group.listStatus}`)"
            :color="group.listStatus === 'confirmed' ? 'success' : 'warning'"
          />
          <UButton
            size="xs"
            color="neutral"
            variant="outline"
            icon="i-lucide-plus"
            :disabled="!writable"
            @click="openCreate(group.id)"
          >
            {{ $t('selections.addLine') }}
          </UButton>
          <UButton
            size="xs"
            :disabled="!writable || !group.items.length || group.listStatus === 'confirmed'"
            @click="confirmCase(group.id)"
          >
            {{ $t('selections.confirm') }}
          </UButton>
        </header>

        <table
          v-if="group.items.length"
          class="w-full text-left text-sm"
        >
          <thead class="border-b border-default bg-muted/40 text-xs text-muted">
            <tr>
              <th class="px-4 py-2 font-medium">
                {{ $t('col.aLabel') }}
              </th>
              <th class="px-4 py-2 font-medium">
                {{ $t('col.yName') }}
              </th>
              <th class="px-4 py-2 font-medium">
                {{ $t('col.qty') }}
              </th>
              <th class="px-4 py-2 font-medium">
                {{ $t('col.cost') }}
              </th>
              <th class="px-4 py-2 font-medium">
                {{ $t('col.actions') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in group.items"
              :key="item.id"
              class="border-b border-default last:border-0"
            >
              <td class="px-4 py-3 font-medium text-highlighted">
                {{ item.aLabel }}
              </td>
              <td class="px-4 py-3 text-muted">
                {{ item.yName }}
              </td>
              <td class="px-4 py-3">
                {{ item.qty }}
              </td>
              <td class="px-4 py-3">
                {{ money(item.amount) }}
              </td>
              <td class="px-4 py-3">
                <RowActions
                  :disabled="!writable"
                  @edit="openEdit(item)"
                  @remove="deleteId = item.id"
                />
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td
                class="px-4 py-3 text-muted"
                colspan="3"
              >
                {{ $t('selections.lineTotal') }}
              </td>
              <td class="px-4 py-3 font-medium text-highlighted">
                {{ money(group.total) }}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
        <p
          v-else
          class="px-4 py-6 text-sm text-muted"
        >
          {{ $t('selections.emptyCase') }}
        </p>
      </section>
    </div>

    <USlideover
      v-model:open="drawerOpen"
      :title="editingId ? $t('actions.edit') : $t('selections.addLine')"
      :description="$t('form.lineTitle')"
    >
      <template #body>
        <UForm
          id="line-form"
          :schema="selectionLineSchema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UFormField
            name="sku"
            :label="$t('col.sku')"
          >
            <USelect
              v-model="state.sku"
              :items="skuOptions(activeOrgId)"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField
            name="qty"
            :label="$t('col.qty')"
          >
            <UInput
              v-model="state.qty"
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
          form="line-form"
        >
          {{ $t('actions.save') }}
        </UButton>
      </template>
    </USlideover>

    <ConfirmDelete
      :open="Boolean(deleteId)"
      @update:open="(open) => { if (!open) deleteId = null }"
      @confirm="confirmLine"
    />
  </PageHeader>
</template>
