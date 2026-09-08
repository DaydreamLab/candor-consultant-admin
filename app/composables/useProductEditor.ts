import type { ProductForm } from '~/utils/schemas'
import type { FormSubmitEvent } from '@nuxt/ui'
import { DEMO_LABELS } from '~/utils/demo'

export function useProductEditor(editingSku: MaybeRefOrGetter<string | null>) {
  const localePath = useLocalePath()
  const ops = useOpsStore()
  const feedback = useOpsFeedback()
  const { writable } = useOrgScope()

  const state = reactive<Partial<ProductForm>>({})

  function blankForm(): ProductForm {
    return {
      sku: '',
      orgId: ops.defaultOrgId(),
      name: '',
      nameEn: '',
      aLabel: '',
      aLabelEn: '',
      spec: '',
      cost: 0,
      priceToA: 0,
      labelVersion: DEMO_LABELS.find(row => row.current)?.id ?? DEMO_LABELS[0]?.id ?? '',
      onHand: 0,
      reserved: 0,
      reorderAt: 0
    }
  }

  function load() {
    const sku = toValue(editingSku)
    if (!sku) {
      Object.assign(state, blankForm())
      return true
    }
    const product = ops.products.find(row => row.sku === sku)
    const stock = ops.inventory.find(row => row.sku === sku)
    if (!product || !stock) {
      return false
    }
    Object.assign(state, {
      sku: product.sku,
      orgId: product.orgId,
      name: product.name,
      nameEn: product.nameEn,
      aLabel: product.aLabel,
      aLabelEn: product.aLabelEn,
      spec: product.spec,
      cost: product.cost,
      priceToA: product.priceToA,
      labelVersion: product.labelVersion,
      onHand: stock.onHand,
      reserved: stock.reserved,
      reorderAt: stock.reorderAt
    })
    return true
  }

  async function goList() {
    await navigateTo(localePath('/products'))
  }

  async function onSubmit(event: FormSubmitEvent<ProductForm>) {
    if (!writable.value) {
      return
    }
    const sku = toValue(editingSku)
    const saved = ops.saveProduct(event.data, sku ?? undefined)
    if (!saved) {
      feedback.warned(event.data.sku)
      return
    }
    feedback.saved(event.data.sku)
    await goList()
  }

  return { state, load, goList, onSubmit }
}
