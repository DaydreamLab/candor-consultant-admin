<script setup lang="ts">
import { selectionLineSchema } from '~/utils/schemas'
import type { SelectionLineForm } from '~/utils/schemas'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { KeyInLine } from '~/types/admin'

const { locale, t } = useI18n()
const { moduleDesc } = usePageCopy()
const { scoped, orgLabel, showOrg, writable } = useOrgScope()
const ops = useOpsStore()
const feedback = useOpsFeedback()

const selectedId = ref<string | null>(null)
const creating = ref(false)
const openIds = ref<string[]>([])
const deleteId = ref<string | null>(null)
const confirmId = ref<string | null>(null)
const unconfirmId = ref<string | null>(null)
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
        image: product?.image ?? null,
        amount: (product?.cost ?? 0) * line.qty
      }
    })
    const confirmed = items.length > 0 && items.every(item => item.status === 'confirmed')
    const confirmedAt = items.find(item => item.confirmedAt)?.confirmedAt ?? null
    const shippedLock = ops.shipments.some(ship =>
      ship.caseId === row.id && ['in_transit', 'delivered'].includes(ship.status)
    )
    return {
      ...row,
      customerName: locale.value === 'en' ? row.customerEn : row.customer,
      items,
      total: items.reduce((sum, item) => sum + item.amount, 0),
      listStatus: items.length === 0 ? 'draft' : (confirmed ? 'confirmed' : 'draft'),
      confirmedAt,
      shippedLock
    }
  })
})

const {
  page,
  pageSize,
  rows: pagedGroups,
  total,
  from,
  to
} = usePager(groups, 10)

function skuOptions(orgId: string) {
  return ops.products
    .filter(row => row.orgId === orgId)
    .map(row => ({
      label: `${locale.value === 'en' ? row.aLabelEn : row.aLabel} · ${row.sku}`,
      value: row.sku
    }))
}

function toggle(id: string) {
  if (openIds.value.includes(id)) {
    openIds.value = openIds.value.filter(item => item !== id)
    return
  }
  openIds.value = [...openIds.value, id]
}

function isOpen(id: string) {
  return openIds.value.includes(id)
}

function openCreate(caseId: string) {
  if (!writable.value) {
    return
  }
  creating.value = true
  selectedId.value = null
  Object.assign(state, { caseId, sku: '', qty: 1 })
}

function openEdit(line: KeyInLine) {
  creating.value = false
  selectedId.value = line.id
  Object.assign(state, { caseId: line.caseId, sku: line.sku, qty: line.qty })
}

function closeDetail() {
  creating.value = false
  selectedId.value = null
}

function onSubmit(event: FormSubmitEvent<SelectionLineForm>) {
  const data = event.data
  const caseRow = ops.cases.find(row => row.id === data.caseId)
  if (selectedId.value) {
    ops.updateKeyInLine(selectedId.value, { sku: data.sku, qty: data.qty })
  } else {
    ops.addKeyInLine({
      caseId: data.caseId,
      orgId: caseRow?.orgId ?? ops.defaultOrgId(),
      sku: data.sku,
      qty: data.qty
    })
  }
  closeDetail()
  feedback.saved(data.sku)
}

function confirmLine() {
  if (!deleteId.value) {
    return
  }
  ops.removeKeyInLine(deleteId.value)
  feedback.deleted()
  if (selectedId.value === deleteId.value) {
    closeDetail()
  }
  deleteId.value = null
}

function confirmCase() {
  if (!confirmId.value) {
    return
  }
  ops.confirmSelection(confirmId.value)
  feedback.saved(confirmId.value)
  confirmId.value = null
}

function unconfirmCase() {
  if (!unconfirmId.value) {
    return
  }
  const ok = ops.unconfirmSelection(unconfirmId.value)
  if (!ok) {
    feedback.warned(t('selections.locked'))
  } else {
    feedback.saved(unconfirmId.value)
  }
  unconfirmId.value = null
}

const activeOrgId = computed(() => {
  const caseRow = ops.cases.find(row => row.id === state.caseId)
  return caseRow?.orgId ?? ops.defaultOrgId()
})

const detailOpen = computed(() => creating.value || Boolean(selectedId.value))
const detailTitle = computed(() => creating.value ? t('selections.addLine') : t('actions.edit'))
</script>

<template>
  <PageHeader
    :title="$t('nav.selections')"
    :description="moduleDesc('selections')"
  >
    <p class="mb-4 rounded-lg bg-muted px-4 py-3 text-base text-muted">
      {{ $t('selections.confirmHint') }}
    </p>

    <SplitDetail>
      <div>
        <div
          v-if="!pagedGroups.length"
          class="rounded-xl border border-default bg-elevated p-8 text-center text-base text-muted"
        >
          {{ $t('table.empty') }}
        </div>

        <div class="space-y-3">
          <section
            v-for="group in pagedGroups"
            :key="group.id"
            class="overflow-hidden rounded-xl border border-default bg-elevated"
          >
            <button
              type="button"
              class="flex w-full flex-wrap items-center gap-3 px-4 py-4 text-left hover:bg-muted/30"
              @click="toggle(group.id)"
            >
              <UIcon
                :name="isOpen(group.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                class="size-5 text-muted"
              />
              <div class="min-w-0 flex-1">
                <p class="text-base font-semibold text-highlighted">
                  {{ group.id }} · {{ group.customerName }}
                </p>
                <p class="mt-1 text-sm text-muted">
                  <span v-if="showOrg">{{ orgLabel(group.orgId) }} · </span>{{ $t(`plan.${group.planId}`) }}
                </p>
              </div>
              <StatusBadge
                :label="$t(`status.${group.listStatus}`)"
                :color="group.listStatus === 'confirmed' ? 'success' : 'warning'"
              />
            </button>

            <div
              v-if="isOpen(group.id)"
              class="border-t border-default px-4 py-4"
            >
              <p
                class="mb-4 rounded-lg px-3 py-2 text-sm"
                :class="group.listStatus === 'confirmed' ? 'bg-success/10 text-success' : 'bg-muted text-muted'"
              >
                {{ group.confirmedAt
                  ? $t('selections.confirmedAt', { time: group.confirmedAt })
                  : $t('selections.notConfirmed') }}
              </p>

              <div class="mb-4 flex flex-wrap gap-2">
                <UButton
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-plus"
                  :disabled="!writable || group.listStatus === 'confirmed'"
                  @click="openCreate(group.id)"
                >
                  {{ $t('selections.addLine') }}
                </UButton>
                <UButton
                  v-if="group.listStatus !== 'confirmed'"
                  :disabled="!writable || !group.items.length"
                  @click="confirmId = group.id"
                >
                  {{ $t('selections.confirm') }}
                </UButton>
                <UButton
                  v-else
                  color="neutral"
                  variant="outline"
                  :disabled="!writable || group.shippedLock"
                  @click="unconfirmId = group.id"
                >
                  {{ $t('selections.unconfirm') }}
                </UButton>
              </div>

              <table
                v-if="group.items.length"
                class="app-table w-full text-left text-base"
              >
                <thead class="border-b border-default bg-muted/40 text-sm text-muted">
                  <tr>
                    <th>{{ $t('col.aLabel') }}</th>
                    <th>{{ $t('col.yName') }}</th>
                    <th>{{ $t('col.qty') }}</th>
                    <th>{{ $t('col.cost') }}</th>
                    <th class="whitespace-nowrap">
                      {{ $t('col.actions') }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in group.items"
                    :key="item.id"
                    class="cursor-pointer border-b border-default last:border-0 hover:bg-muted/40"
                    :class="item.id === selectedId ? 'bg-primary/5' : ''"
                    @click="openEdit(item)"
                  >
                    <td class="font-medium text-highlighted">
                      <div class="flex items-center gap-3">
                        <ProductThumb
                          :seed="item.sku"
                          :label="item.aLabel"
                          :src="item.image"
                          size="sm"
                        />
                        {{ item.aLabel }}
                      </div>
                    </td>
                    <td class="text-muted">
                      {{ item.yName }}
                    </td>
                    <td>
                      {{ item.qty }}
                    </td>
                    <td class="tabular-money">
                      {{ money(item.amount) }}
                    </td>
                    <td
                      class="whitespace-nowrap"
                      @click.stop
                    >
                      <RowActions
                        :edit="false"
                        :disabled="!writable || group.listStatus === 'confirmed'"
                        @remove="deleteId = item.id"
                      />
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      class="text-muted"
                      colspan="3"
                    >
                      {{ $t('selections.lineTotal') }}
                    </td>
                    <td class="tabular-money font-semibold text-highlighted">
                      {{ money(group.total) }}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
              <p
                v-else
                class="py-4 text-base text-muted"
              >
                {{ $t('selections.emptyCase') }}
              </p>
            </div>
          </section>
        </div>

        <ListPager
          :page="page"
          :page-size="pageSize"
          :total="total"
          :from="from"
          :to="to"
          @update:page="page = $event"
        />
      </div>

      <template #detail>
        <DetailPanel
          :open="detailOpen"
          :title="detailTitle"
          :empty="$t('form.emptyDetail')"
          icon="i-lucide-clipboard-list"
          @close="closeDetail"
        >
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
          <template #footer>
            <UButton
              color="neutral"
              variant="outline"
              @click="closeDetail"
            >
              {{ $t('actions.cancel') }}
            </UButton>
            <UButton
              type="submit"
              form="line-form"
              :disabled="!writable"
            >
              {{ $t('actions.save') }}
            </UButton>
          </template>
        </DetailPanel>
      </template>
    </SplitDetail>

    <ConfirmDelete
      :open="Boolean(deleteId)"
      @update:open="(open) => { if (!open) deleteId = null }"
      @confirm="confirmLine"
    />
    <ConfirmDelete
      :open="Boolean(confirmId)"
      color="primary"
      :title="$t('selections.confirmTitle')"
      :description="$t('selections.confirmBody')"
      :confirm-label="$t('selections.confirm')"
      @update:open="(open) => { if (!open) confirmId = null }"
      @confirm="confirmCase"
    />
    <ConfirmDelete
      :open="Boolean(unconfirmId)"
      color="warning"
      :title="$t('selections.unconfirmTitle')"
      :description="$t('selections.unconfirmBody')"
      :confirm-label="$t('selections.unconfirm')"
      @update:open="(open) => { if (!open) unconfirmId = null }"
      @confirm="unconfirmCase"
    />
  </PageHeader>
</template>
