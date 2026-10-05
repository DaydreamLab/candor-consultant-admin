<script setup lang="ts">
import type { SellableItemWrite } from '~/utils/admin-api'
import { SELLABLE_ITEM_FORM_ID } from '~/composables/useNavbarActions'
import { isBottlePriceSaveError } from '~/utils/sellable-item-form'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

const props = withDefaults(defineProps<{
  mode: 'create' | 'update'
  sellableItem: Record<string, unknown> | null
  saving: boolean
  saveError?: string
  disabled?: boolean
}>(), {
  disabled: false
})

const emit = defineEmits<{
  save: [payload: SellableItemWrite]
}>()

const { t, locale } = useI18n()

type NutritionRow = {
  name: string
  amount_per_serving: string
  daily_reference_pct: string
}

type IntegerKey = 'servings_per_container' | 'unit_price' | 'bottle_price'
type DecimalKey = 'daily_servings_min' | 'daily_servings_max' | 'daily_dose'

type FormState = {
  name_zh: string
  name_en: string
  sku: string
  category: string
  spec_text: string
  servings_per_container: string
  serving_size_text: string
  daily_servings_min: string
  daily_servings_max: string
  daily_dose: string
  unit_price: string
  bottle_price: string
  active: boolean
  is_core: boolean
  can_co_pack: boolean
  sale_status: string
  audience: string
  summary: string
  highlights: string
  usage_text: string
  usage_limit: string
  ingredients_text: string
  cautions: string
  risk_text: string
  contraindication_text: string
  unit_size_text: string
  shelf_life_text: string
  distributor: string
  origin: string
  nutrition: NutritionRow[]
}

const readoutFields = [
  { key: 'code', label: 'products.fields.code' },
  { key: 'daily_price', label: 'products.fields.dailyPrice' },
  { key: 'monthly_cost', label: 'products.fields.monthlyCost' }
] as const

const state = reactive<FormState>(emptyState())
const imageFile = ref<File | null>(null)
const imageError = ref('')
const previewUrl = ref('')
const localBottleError = ref('')
const dismissedBottleError = ref(false)

const fieldsLocked = computed(() => props.disabled || props.saving)

watch(() => props.sellableItem, (item) => {
  applyItem(item)
  imageFile.value = null
  imageError.value = ''
  localBottleError.value = ''
  dismissedBottleError.value = false
}, { immediate: true })

watch(() => props.saveError, () => {
  dismissedBottleError.value = false
})

watch(imageFile, (file, _, onCleanup) => {
  if (!file) {
    previewUrl.value = ''
    return
  }
  const url = URL.createObjectURL(file)
  previewUrl.value = url
  onCleanup(() => {
    URL.revokeObjectURL(url)
  })
})

const imageModel = computed({
  get: () => imageFile.value,
  set: (file: File | null | undefined) => {
    acceptImage(file ?? null)
  }
})

const savedImageSrc = computed(() => httpImage(props.sellableItem))
const displaySrc = computed(() => previewUrl.value || savedImageSrc.value)

const onSale = computed({
  get: () => (state.sale_status.trim() || 'on_sale') === 'on_sale',
  set: (value: boolean) => {
    state.sale_status = value ? 'on_sale' : 'off_sale'
    clearBottleError()
  }
})

const readouts = computed(() => {
  const item = props.sellableItem
  if (!item) {
    return []
  }
  return readoutFields.flatMap((field) => {
    const value = readoutText(item[field.key])
    if (!value) {
      return []
    }
    return [{ key: field.key, label: t(field.label), value }]
  })
})

const bottlePriceError = computed(() => {
  if (localBottleError.value) {
    return localBottleError.value
  }
  const remote = props.saveError?.trim() ?? ''
  if (remote && !dismissedBottleError.value && isBottlePriceSaveError(remote)) {
    return remote
  }
  return ''
})

function onSubmit() {
  if (props.saving || props.disabled) {
    return
  }
  const image = props.mode === 'update' ? null : imageFile.value
  if (image) {
    const message = fileError(image)
    if (message) {
      imageError.value = message
      imageFile.value = null
      return
    }
  }
  if (bottlePriceMissing()) {
    localBottleError.value = t('products.bottlePriceRequired')
    return
  }
  emit('save', { body: writeBody(), image })
}

function bottlePriceMissing() {
  const status = state.sale_status.trim() || 'on_sale'
  if (status !== 'on_sale') {
    return false
  }
  const raw = state.bottle_price.trim()
  const value = Number(raw)
  return !raw || !Number.isInteger(value) || value <= 0
}

function acceptImage(file: File | null) {
  if (!file) {
    imageFile.value = null
    imageError.value = ''
    return
  }
  const message = fileError(file)
  if (message) {
    imageError.value = message
    imageFile.value = null
    return
  }
  imageError.value = ''
  imageFile.value = file
}

function fileError(file: File) {
  if (file.size > MAX_IMAGE_BYTES) {
    return t('products.imageTooLarge')
  }
  if (!IMAGE_TYPES.has(file.type)) {
    return t('products.imageType')
  }
  return ''
}

function writeBody() {
  const updating = props.mode === 'update'
  const body: Record<string, unknown> = {
    name_zh: optionalText(state.name_zh, updating),
    name_en: optionalText(state.name_en, updating),
    category: optionalText(state.category, updating),
    spec_text: optionalText(state.spec_text, updating),
    serving_size_text: optionalText(state.serving_size_text, updating),
    unit_size_text: optionalText(state.unit_size_text, updating),
    audience: optionalText(state.audience, updating),
    summary: optionalText(state.summary, updating),
    highlights: optionalText(state.highlights, updating),
    usage_text: optionalText(state.usage_text, updating),
    usage_limit: optionalText(state.usage_limit, updating),
    ingredients_text: optionalText(state.ingredients_text, updating),
    cautions: optionalText(state.cautions, updating),
    risk_text: optionalText(state.risk_text, updating),
    contraindication_text: optionalText(state.contraindication_text, updating),
    shelf_life_text: optionalText(state.shelf_life_text, updating),
    distributor: optionalText(state.distributor, updating),
    origin: optionalText(state.origin, updating),
    active: state.active,
    is_core: state.is_core,
    can_co_pack: state.can_co_pack,
    sale_status: state.sale_status.trim() || 'on_sale',
    nutrition: nutritionBody(updating)
  }
  if (!updating) {
    body.sku = state.sku.trim()
  }
  assignInteger(body, 'servings_per_container', state.servings_per_container, updating)
  assignDecimal(body, 'daily_servings_min', state.daily_servings_min, updating)
  assignDecimal(body, 'daily_servings_max', state.daily_servings_max, updating)
  assignDecimal(body, 'daily_dose', state.daily_dose, updating)
  assignInteger(body, 'unit_price', state.unit_price, updating)
  assignInteger(body, 'bottle_price', state.bottle_price, updating)
  return body
}

function optionalText(raw: string, updating: boolean) {
  const value = raw.trim()
  if (updating) {
    return value || null
  }
  return value
}

function nutritionBody(updating: boolean) {
  const rows = state.nutrition.map(row => ({
    name: row.name.trim(),
    amount_per_serving: row.amount_per_serving.trim(),
    daily_reference_pct: row.daily_reference_pct.trim()
  }))
  if (!updating) {
    return rows.filter(row => row.name || row.amount_per_serving || row.daily_reference_pct)
  }
  return rows
    .filter(row => row.name && row.amount_per_serving)
    .map(row => ({
      name: row.name,
      amount_per_serving: row.amount_per_serving,
      daily_reference_pct: row.daily_reference_pct || null
    }))
}

function assignInteger(body: Record<string, unknown>, key: IntegerKey, raw: string, updating: boolean) {
  if (!raw.trim()) {
    if (updating) {
      body[key] = null
    }
    return
  }
  const value = Number(raw)
  if (Number.isInteger(value)) {
    body[key] = value
  }
}

function assignDecimal(body: Record<string, unknown>, key: DecimalKey, raw: string, updating: boolean) {
  const trimmed = raw.trim().replace(/\.$/, '')
  if (!trimmed) {
    if (updating) {
      body[key] = null
    }
    return
  }
  const value = Number(trimmed)
  if (Number.isFinite(value)) {
    body[key] = value
  }
}

function setDigits(key: IntegerKey, value: string | number) {
  state[key] = String(value ?? '').replace(/\D/g, '')
  if (key === 'bottle_price') {
    clearBottleError()
  }
}

function setDecimal(key: DecimalKey, value: string | number) {
  const raw = String(value ?? '')
  let next = ''
  let dotted = false
  for (const char of raw) {
    if (char >= '0' && char <= '9') {
      next += char
      continue
    }
    if (char === '.' && !dotted) {
      dotted = true
      next += char
    }
  }
  state[key] = next
}

function clearBottleError() {
  localBottleError.value = ''
  dismissedBottleError.value = true
}

function addNutrition() {
  state.nutrition.push({ name: '', amount_per_serving: '', daily_reference_pct: '' })
}

function removeNutrition(index: number) {
  state.nutrition.splice(index, 1)
}

function applyItem(item: Record<string, unknown> | null) {
  const next = emptyState()
  if (item) {
    next.name_zh = scalarText(item.name_zh).trim() || scalarText(item.name).trim()
    next.name_en = scalarText(item.name_en).trim()
    next.sku = scalarText(item.sku).trim()
    next.category = fieldText(item.category)
    next.spec_text = scalarText(item.spec_text).trim() || scalarText(item.spec).trim()
    next.servings_per_container = integerText(item.servings_per_container)
    next.serving_size_text = scalarText(item.serving_size_text).trim()
    next.daily_servings_min = decimalText(item.daily_servings_min)
    next.daily_servings_max = decimalText(item.daily_servings_max)
    next.daily_dose = decimalText(item.daily_dose)
    next.unit_price = integerText(item.unit_price)
    next.bottle_price = integerText(item.bottle_price)
    next.active = typeof item.active === 'boolean' ? item.active : true
    next.is_core = item.is_core === true
    next.can_co_pack = item.can_co_pack !== false
    next.sale_status = scalarText(item.sale_status).trim() || 'on_sale'
    next.audience = fieldText(item.audience)
    next.summary = scalarText(item.summary).trim()
    next.highlights = scalarText(item.highlights).trim()
    next.usage_text = scalarText(item.usage_text).trim()
    next.usage_limit = scalarText(item.usage_limit).trim()
    next.ingredients_text = scalarText(item.ingredients_text).trim()
    next.cautions = scalarText(item.cautions).trim()
    next.risk_text = scalarText(item.risk_text).trim()
    next.contraindication_text = scalarText(item.contraindication_text).trim()
    next.unit_size_text = scalarText(item.unit_size_text).trim()
    next.shelf_life_text = scalarText(item.shelf_life_text).trim()
    next.distributor = scalarText(item.distributor).trim()
    next.origin = scalarText(item.origin).trim()
    next.nutrition = nutritionRows(item.nutrition)
  }
  Object.assign(state, next)
  state.nutrition = next.nutrition
}

function emptyState(): FormState {
  return {
    name_zh: '',
    name_en: '',
    sku: '',
    category: '',
    spec_text: '',
    servings_per_container: '',
    serving_size_text: '',
    daily_servings_min: '',
    daily_servings_max: '',
    daily_dose: '',
    unit_price: '',
    bottle_price: '',
    active: true,
    is_core: false,
    can_co_pack: true,
    sale_status: 'on_sale',
    audience: '',
    summary: '',
    highlights: '',
    usage_text: '',
    usage_limit: '',
    ingredients_text: '',
    cautions: '',
    risk_text: '',
    contraindication_text: '',
    unit_size_text: '',
    shelf_life_text: '',
    distributor: '',
    origin: '',
    nutrition: []
  }
}

function nutritionRows(value: unknown): NutritionRow[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter(isRecord).map(row => ({
    name: scalarText(row.name).trim(),
    amount_per_serving: scalarText(row.amount_per_serving).trim(),
    daily_reference_pct: scalarText(row.daily_reference_pct).trim()
  }))
}

function integerText(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(Math.abs(value)))
  }
  return scalarText(value).replace(/\D/g, '')
}

function decimalText(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  const text = scalarText(value).trim()
  if (!text) {
    return ''
  }
  let next = ''
  let dotted = false
  for (const char of text) {
    if (char >= '0' && char <= '9') {
      next += char
      continue
    }
    if (char === '.' && !dotted && next) {
      dotted = true
      next += char
    }
  }
  return next.replace(/\.$/, '')
}

function fieldText(value: unknown) {
  if (isRecord(value)) {
    return localizedText(value)
  }
  return scalarText(value).trim()
}

function localizedText(value: Record<string, unknown>) {
  const zh = scalarText(value.name_zh).trim()
  const en = scalarText(value.name_en).trim()
  const name = scalarText(value.name).trim()
  const localized = String(locale.value).startsWith('en') ? (en || zh) : (zh || en)
  return localized || name
}

function httpImage(item: Record<string, unknown> | null) {
  if (!item) {
    return ''
  }
  for (const candidate of [
    scalarText(item.image_url).trim(),
    scalarText(item.image).trim(),
    scalarText(item.image_uri).trim()
  ]) {
    if (/^https?:\/\//i.test(candidate)) {
      return candidate
    }
  }
  return ''
}

function readoutText(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value))
  }
  return scalarText(value).trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function scalarText(value: unknown) {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
}
</script>

<template>
  <form
    :id="SELLABLE_ITEM_FORM_ID"
    @submit.prevent="onSubmit"
  >
    <fieldset
      :disabled="fieldsLocked"
      class="m-0 flex min-w-0 flex-col gap-4 border-0 p-0"
    >
      <section class="rounded-xl border border-default bg-elevated p-5">
        <h2 class="text-base font-semibold text-highlighted">
          {{ $t('products.sections.identity') }}
        </h2>
        <div class="mt-4 flex flex-col gap-4 sm:flex-row">
          <div class="w-full shrink-0 space-y-3 sm:w-56">
            <UFormField
              :label="$t('products.fields.image')"
              :error="imageError || undefined"
            >
              <img
                v-if="displaySrc && !previewUrl"
                :src="displaySrc"
                alt=""
                class="mb-3 size-56 max-w-full rounded-lg object-contain"
              >
              <UFileUpload
                v-model="imageModel"
                accept="image/png,image/jpeg,image/webp"
                icon="i-lucide-image"
                :disabled="mode === 'update'"
                :label="$t('products.imageDrop')"
                :description="$t('products.imageHint')"
                class="min-h-56 w-full sm:w-56"
              />
            </UFormField>
          </div>

          <div class="min-w-0 flex-1 space-y-4">
            <UFormField :label="$t('products.fields.nameZh')">
              <UInput
                v-model="state.name_zh"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('products.fields.nameEn')">
              <UInput
                v-model="state.name_en"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('products.fields.sku')">
              <UInput
                v-model="state.sku"
                class="w-full"
                :disabled="mode === 'update'"
              />
            </UFormField>

            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField :label="$t('products.fields.category')">
                <UInput
                  v-model="state.category"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="$t('products.fields.spec')">
                <UInput
                  v-model="state.spec_text"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </div>

        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <UFormField :label="$t('products.fields.active')">
            <USwitch v-model="state.active" />
          </UFormField>
          <UFormField :label="$t('products.fields.isCore')">
            <USwitch v-model="state.is_core" />
          </UFormField>
          <UFormField :label="$t('products.fields.canCoPack')">
            <USwitch v-model="state.can_co_pack" />
          </UFormField>
          <UFormField :label="$t('products.fields.saleStatus')">
            <USwitch v-model="onSale" />
          </UFormField>
        </div>
      </section>

      <section class="rounded-xl border border-default bg-elevated p-5">
        <h2 class="text-base font-semibold text-highlighted">
          {{ $t('products.sections.dose') }}
        </h2>
        <div class="mt-4 space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField :label="$t('products.fields.servingsPerContainer')">
              <UInput
                :model-value="state.servings_per_container"
                inputmode="numeric"
                class="w-full"
                @update:model-value="setDigits('servings_per_container', $event)"
              />
            </UFormField>
            <UFormField :label="$t('products.fields.servingSize')">
              <UInput
                v-model="state.serving_size_text"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="$t('products.fields.unitSizeText')">
              <UInput
                v-model="state.unit_size_text"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="$t('products.fields.dailyServingsMin')">
              <UInput
                :model-value="state.daily_servings_min"
                inputmode="decimal"
                class="w-full"
                @update:model-value="setDecimal('daily_servings_min', $event)"
              />
            </UFormField>
            <UFormField :label="$t('products.fields.dailyServingsMax')">
              <UInput
                :model-value="state.daily_servings_max"
                inputmode="decimal"
                class="w-full"
                @update:model-value="setDecimal('daily_servings_max', $event)"
              />
            </UFormField>
            <UFormField :label="$t('products.fields.dailyDose')">
              <UInput
                :model-value="state.daily_dose"
                inputmode="decimal"
                class="w-full"
                @update:model-value="setDecimal('daily_dose', $event)"
              />
            </UFormField>
            <UFormField :label="$t('products.fields.unitPrice')">
              <UInput
                :model-value="state.unit_price"
                inputmode="numeric"
                class="w-full"
                @update:model-value="setDigits('unit_price', $event)"
              />
            </UFormField>
            <UFormField
              :label="$t('products.fields.bottlePrice')"
              :error="bottlePriceError || undefined"
            >
              <UInput
                :model-value="state.bottle_price"
                inputmode="numeric"
                class="w-full"
                @update:model-value="setDigits('bottle_price', $event)"
              />
            </UFormField>
          </div>

          <div
            v-if="readouts.length"
            class="grid gap-4 border-t border-default pt-4 sm:grid-cols-3"
          >
            <div
              v-for="row in readouts"
              :key="row.key"
            >
              <p class="text-sm text-muted">
                {{ row.label }}
              </p>
              <p class="mt-1 text-sm font-medium text-highlighted">
                {{ row.value }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-default bg-elevated p-5">
        <h2 class="text-base font-semibold text-highlighted">
          {{ $t('products.sections.copy') }}
        </h2>
        <div class="mt-4 space-y-4">
          <UFormField :label="$t('products.fields.audience')">
            <UTextarea
              v-model="state.audience"
              :rows="2"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('products.fields.summary')">
            <UTextarea
              v-model="state.summary"
              :rows="4"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('products.fields.highlights')">
            <UTextarea
              v-model="state.highlights"
              :rows="4"
              class="w-full"
            />
          </UFormField>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField :label="$t('products.fields.usage')">
              <UTextarea
                v-model="state.usage_text"
                :rows="3"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="$t('products.fields.usageLimit')">
              <UTextarea
                v-model="state.usage_limit"
                :rows="3"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField :label="$t('products.fields.ingredients')">
              <UTextarea
                v-model="state.ingredients_text"
                :rows="3"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="$t('products.fields.cautions')">
              <UTextarea
                v-model="state.cautions"
                :rows="3"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="$t('products.fields.riskText')">
              <UTextarea
                v-model="state.risk_text"
                :rows="3"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="$t('products.fields.contraindicationText')">
              <UTextarea
                v-model="state.contraindication_text"
                :rows="3"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-default bg-elevated p-5">
        <h2 class="text-base font-semibold text-highlighted">
          {{ $t('products.sections.supply') }}
        </h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-3">
          <UFormField :label="$t('products.fields.shelfLife')">
            <UInput
              v-model="state.shelf_life_text"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('products.fields.distributor')">
            <UInput
              v-model="state.distributor"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('products.fields.origin')">
            <UInput
              v-model="state.origin"
              class="w-full"
            />
          </UFormField>
        </div>
      </section>

      <section class="rounded-xl border border-default bg-elevated p-5">
        <h2 class="text-base font-semibold text-highlighted">
          {{ $t('products.fields.nutrition') }}
        </h2>
        <div class="mt-4 space-y-3">
          <div
            v-if="state.nutrition.length"
            class="hidden gap-3 text-sm text-muted sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <p>{{ $t('products.fields.nutritionName') }}</p>
            <p>{{ $t('products.fields.nutritionAmount') }}</p>
            <p>{{ $t('products.fields.nutritionPct') }}</p>
            <span class="size-8" />
          </div>
          <div
            v-for="(row, index) in state.nutrition"
            :key="index"
            class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
          >
            <UFormField
              :label="$t('products.fields.nutritionName')"
              class="sm:[&_label]:sr-only"
            >
              <UInput
                v-model="row.name"
                class="w-full"
              />
            </UFormField>
            <UFormField
              :label="$t('products.fields.nutritionAmount')"
              class="sm:[&_label]:sr-only"
            >
              <UInput
                v-model="row.amount_per_serving"
                class="w-full"
              />
            </UFormField>
            <UFormField
              :label="$t('products.fields.nutritionPct')"
              class="sm:[&_label]:sr-only"
            >
              <UInput
                v-model="row.daily_reference_pct"
                class="w-full"
              />
            </UFormField>
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              :aria-label="$t('actions.delete')"
              @click="removeNutrition(index)"
            />
          </div>
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            icon="i-lucide-plus"
            @click="addNutrition"
          >
            {{ $t('products.fields.addNutrition') }}
          </UButton>
        </div>
      </section>
    </fieldset>
  </form>
</template>
