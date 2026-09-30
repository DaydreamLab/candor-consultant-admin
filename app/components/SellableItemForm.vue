<script setup lang="ts">
import type { SellableItemWrite } from '~/utils/admin-api'
import { SELLABLE_ITEM_FORM_ID } from '~/composables/useNavbarActions'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

const props = defineProps<{
  mode: 'create' | 'update'
  editing: boolean
  sellableItem: Record<string, unknown> | null
  saving: boolean
}>()

const emit = defineEmits<{
  save: [payload: SellableItemWrite]
}>()

const { t, locale } = useI18n()

type NutritionRow = {
  name: string
  amount_per_serving: string
  daily_reference_pct: string
}

type LongKey = 'audience' | 'summary' | 'highlights' | 'usage_text' | 'usage_limit' | 'ingredients_text' | 'cautions' | 'shelf_life_text' | 'distributor' | 'origin'
type IntegerKey = 'servings_per_container' | 'daily_servings_min' | 'daily_servings_max' | 'unit_price'

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
  unit_price: string
  active: boolean
  is_core: boolean
  sale_status: string
  audience: string
  summary: string
  highlights: string
  usage_text: string
  usage_limit: string
  ingredients_text: string
  cautions: string
  shelf_life_text: string
  distributor: string
  origin: string
  nutrition: NutritionRow[]
}

const longFields: { key: LongKey, label: string, rows: number }[] = [
  { key: 'audience', label: 'products.fields.audience', rows: 3 },
  { key: 'summary', label: 'products.fields.summary', rows: 5 },
  { key: 'highlights', label: 'products.fields.highlights', rows: 5 },
  { key: 'usage_text', label: 'products.fields.usage', rows: 3 },
  { key: 'usage_limit', label: 'products.fields.usageLimit', rows: 3 },
  { key: 'ingredients_text', label: 'products.fields.ingredients', rows: 3 },
  { key: 'cautions', label: 'products.fields.cautions', rows: 3 },
  { key: 'shelf_life_text', label: 'products.fields.shelfLife', rows: 3 },
  { key: 'distributor', label: 'products.fields.distributor', rows: 2 },
  { key: 'origin', label: 'products.fields.origin', rows: 2 }
]

const readoutFields = [
  { key: 'code', label: 'products.fields.code' },
  { key: 'daily_price', label: 'products.fields.dailyPrice' },
  { key: 'bottle_price', label: 'products.fields.bottlePrice' },
  { key: 'monthly_cost', label: 'products.fields.monthlyCost' }
] as const

const state = reactive<FormState>(emptyState())
const imageFile = ref<File | null>(null)
const imageError = ref('')
const previewUrl = ref('')

watch(() => props.sellableItem, (item) => {
  applyItem(item)
  imageFile.value = null
  imageError.value = ''
}, { immediate: true })

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
const showPhoto = computed(() => props.editing || Boolean(displaySrc.value))

const visibleLongFields = computed(() => {
  if (props.editing) {
    return longFields
  }
  return longFields.filter(field => state[field.key].trim())
})
const showRight = computed(() => visibleLongFields.value.length > 0)

const showActive = computed(() => props.editing || typeof props.sellableItem?.active === 'boolean')
const showCore = computed(() => props.editing || typeof props.sellableItem?.is_core === 'boolean')
const showSaleStatus = computed(() => props.editing || Boolean(state.sale_status.trim()))

const saleStatusItems = computed(() => {
  const current = state.sale_status.trim()
  const values = current && current !== 'on_sale' ? [current, 'on_sale'] : ['on_sale']
  return values.map(value => ({ label: value, value }))
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

function onSubmit() {
  if (props.saving) {
    return
  }
  if (imageFile.value) {
    const message = fileError(imageFile.value)
    if (message) {
      imageError.value = message
      imageFile.value = null
      return
    }
  }
  emit('save', { body: writeBody(), image: imageFile.value })
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
  const body: Record<string, unknown> = {
    name_zh: state.name_zh.trim(),
    name_en: state.name_en.trim(),
    category: state.category.trim(),
    spec_text: state.spec_text.trim(),
    serving_size_text: state.serving_size_text.trim(),
    audience: state.audience.trim(),
    summary: state.summary.trim(),
    highlights: state.highlights.trim(),
    usage_text: state.usage_text.trim(),
    usage_limit: state.usage_limit.trim(),
    ingredients_text: state.ingredients_text.trim(),
    cautions: state.cautions.trim(),
    shelf_life_text: state.shelf_life_text.trim(),
    distributor: state.distributor.trim(),
    origin: state.origin.trim(),
    active: state.active,
    is_core: state.is_core,
    sale_status: state.sale_status.trim() || 'on_sale',
    nutrition: state.nutrition
      .map(row => ({
        name: row.name.trim(),
        amount_per_serving: row.amount_per_serving.trim(),
        daily_reference_pct: row.daily_reference_pct.trim()
      }))
      .filter(row => row.name || row.amount_per_serving || row.daily_reference_pct)
  }
  if (props.mode === 'create') {
    body.sku = state.sku.trim()
  }
  assignInteger(body, 'servings_per_container', state.servings_per_container)
  assignInteger(body, 'daily_servings_min', state.daily_servings_min)
  assignInteger(body, 'daily_servings_max', state.daily_servings_max)
  assignInteger(body, 'unit_price', state.unit_price)
  return body
}

function assignInteger(body: Record<string, unknown>, key: IntegerKey, raw: string) {
  if (!raw.trim()) {
    return
  }
  const value = Number(raw)
  if (Number.isInteger(value)) {
    body[key] = value
  }
}

function setDigits(key: IntegerKey, value: string | number) {
  state[key] = String(value ?? '').replace(/\D/g, '')
}

function addNutrition() {
  state.nutrition.push({ name: '', amount_per_serving: '', daily_reference_pct: '' })
}

function removeNutrition(index: number) {
  state.nutrition.splice(index, 1)
}

function filled(value: string) {
  return props.editing || Boolean(value.trim())
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
    next.daily_servings_min = integerText(item.daily_servings_min)
    next.daily_servings_max = integerText(item.daily_servings_max)
    next.unit_price = integerText(item.unit_price)
    next.active = typeof item.active === 'boolean' ? item.active : true
    next.is_core = item.is_core === true
    next.sale_status = scalarText(item.sale_status).trim() || 'on_sale'
    next.audience = fieldText(item.audience)
    next.summary = scalarText(item.summary).trim()
    next.highlights = scalarText(item.highlights).trim()
    next.usage_text = scalarText(item.usage_text).trim()
    next.usage_limit = scalarText(item.usage_limit).trim()
    next.ingredients_text = scalarText(item.ingredients_text).trim()
    next.cautions = scalarText(item.cautions).trim()
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
    unit_price: '',
    active: true,
    is_core: false,
    sale_status: 'on_sale',
    audience: '',
    summary: '',
    highlights: '',
    usage_text: '',
    usage_limit: '',
    ingredients_text: '',
    cautions: '',
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
  const candidate = scalarText(item.image_uri).trim()
    || scalarText(item.image).trim()
    || scalarText(item.image_url).trim()
  if (/^https?:\/\//i.test(candidate)) {
    return candidate
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

function yesNo(value: boolean) {
  return value ? t('status.yes') : t('status.no')
}
</script>

<template>
  <form
    :id="SELLABLE_ITEM_FORM_ID"
    @submit.prevent="onSubmit"
  >
    <fieldset
      :disabled="saving"
      class="m-0 grid min-w-0 grid-cols-1 gap-6 border-0 p-0 lg:grid-cols-2"
    >
      <div class="space-y-4">
        <UFormField
          v-if="showPhoto"
          :label="$t('products.fields.image')"
          :error="imageError || undefined"
        >
          <img
            v-if="displaySrc && (!editing || !previewUrl)"
            :src="displaySrc"
            alt=""
            class="mb-3 w-96 max-w-full rounded-lg object-contain"
            :class="editing ? 'h-24' : 'min-h-48'"
          >
          <UFileUpload
            v-if="editing"
            v-model="imageModel"
            accept="image/*"
            icon="i-lucide-image"
            :label="$t('products.imageDrop')"
            :description="$t('products.imageHint')"
            class="w-96 min-h-48 max-w-full"
          />
        </UFormField>

        <UFormField
          v-if="filled(state.name_zh)"
          :label="$t('products.fields.nameZh')"
        >
          <p
            v-if="!editing"
            class="text-sm font-medium break-all text-highlighted"
          >
            {{ state.name_zh }}
          </p>
          <UInput
            v-else
            v-model="state.name_zh"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="filled(state.name_en)"
          :label="$t('products.fields.nameEn')"
        >
          <p
            v-if="!editing"
            class="text-sm font-medium break-all text-highlighted"
          >
            {{ state.name_en }}
          </p>
          <UInput
            v-else
            v-model="state.name_en"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="mode === 'create' || state.sku"
          :label="$t('products.fields.sku')"
        >
          <UInput
            v-if="mode === 'create'"
            v-model="state.sku"
            class="w-full"
          />
          <p
            v-else
            class="text-sm font-medium break-all text-highlighted"
          >
            {{ state.sku }}
          </p>
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            v-if="filled(state.category)"
            :label="$t('products.fields.category')"
          >
            <p
              v-if="!editing"
              class="text-sm font-medium text-highlighted"
            >
              {{ state.category }}
            </p>
            <UInput
              v-else
              v-model="state.category"
              class="w-full"
            />
          </UFormField>
          <UFormField
            v-if="filled(state.spec_text)"
            :label="$t('products.fields.spec')"
          >
            <p
              v-if="!editing"
              class="text-sm font-medium text-highlighted"
            >
              {{ state.spec_text }}
            </p>
            <UInput
              v-else
              v-model="state.spec_text"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            v-if="filled(state.servings_per_container)"
            :label="$t('products.fields.servingsPerContainer')"
          >
            <p
              v-if="!editing"
              class="text-sm font-medium text-highlighted"
            >
              {{ state.servings_per_container }}
            </p>
            <UInput
              v-else
              :model-value="state.servings_per_container"
              inputmode="numeric"
              class="w-full"
              @update:model-value="setDigits('servings_per_container', $event)"
            />
          </UFormField>
          <UFormField
            v-if="filled(state.serving_size_text)"
            :label="$t('products.fields.servingSize')"
          >
            <p
              v-if="!editing"
              class="text-sm font-medium text-highlighted"
            >
              {{ state.serving_size_text }}
            </p>
            <UInput
              v-else
              v-model="state.serving_size_text"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            v-if="filled(state.daily_servings_min)"
            :label="$t('products.fields.dailyServingsMin')"
          >
            <p
              v-if="!editing"
              class="text-sm font-medium text-highlighted"
            >
              {{ state.daily_servings_min }}
            </p>
            <UInput
              v-else
              :model-value="state.daily_servings_min"
              inputmode="numeric"
              class="w-full"
              @update:model-value="setDigits('daily_servings_min', $event)"
            />
          </UFormField>
          <UFormField
            v-if="filled(state.daily_servings_max)"
            :label="$t('products.fields.dailyServingsMax')"
          >
            <p
              v-if="!editing"
              class="text-sm font-medium text-highlighted"
            >
              {{ state.daily_servings_max }}
            </p>
            <UInput
              v-else
              :model-value="state.daily_servings_max"
              inputmode="numeric"
              class="w-full"
              @update:model-value="setDigits('daily_servings_max', $event)"
            />
          </UFormField>
        </div>

        <UFormField
          v-if="filled(state.unit_price)"
          :label="$t('products.fields.unitPrice')"
        >
          <p
            v-if="!editing"
            class="text-sm font-medium text-highlighted"
          >
            {{ state.unit_price }}
          </p>
          <UInput
            v-else
            :model-value="state.unit_price"
            inputmode="numeric"
            class="w-full"
            @update:model-value="setDigits('unit_price', $event)"
          />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-3">
          <UFormField
            v-if="showActive"
            :label="$t('products.fields.active')"
          >
            <p
              v-if="!editing"
              class="text-sm font-medium text-highlighted"
            >
              {{ yesNo(state.active) }}
            </p>
            <USwitch
              v-else
              v-model="state.active"
            />
          </UFormField>
          <UFormField
            v-if="showCore"
            :label="$t('products.fields.isCore')"
          >
            <p
              v-if="!editing"
              class="text-sm font-medium text-highlighted"
            >
              {{ yesNo(state.is_core) }}
            </p>
            <USwitch
              v-else
              v-model="state.is_core"
            />
          </UFormField>
          <UFormField
            v-if="showSaleStatus"
            :label="$t('products.fields.saleStatus')"
          >
            <p
              v-if="!editing"
              class="text-sm font-medium text-highlighted"
            >
              {{ state.sale_status }}
            </p>
            <USelect
              v-else
              v-model="state.sale_status"
              :items="saleStatusItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>

      <div
        v-if="showRight"
        class="space-y-4"
      >
        <UFormField
          v-for="field in visibleLongFields"
          :key="field.key"
          :label="$t(field.label)"
        >
          <p
            v-if="!editing"
            class="text-sm font-medium whitespace-pre-wrap text-highlighted"
          >
            {{ state[field.key] }}
          </p>
          <UTextarea
            v-else
            v-model="state[field.key]"
            :rows="field.rows"
            class="w-full"
          />
        </UFormField>
      </div>

      <div
        v-if="editing || state.nutrition.length"
        class="space-y-3 lg:col-span-2"
      >
        <p class="text-sm font-medium text-highlighted">
          {{ $t('products.fields.nutrition') }}
        </p>
        <div
          v-for="(row, index) in state.nutrition"
          :key="index"
          class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
        >
          <UFormField :label="index === 0 ? $t('products.fields.nutritionName') : undefined">
            <p
              v-if="!editing"
              class="text-sm font-medium text-highlighted"
            >
              {{ row.name }}
            </p>
            <UInput
              v-else
              v-model="row.name"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="index === 0 ? $t('products.fields.nutritionAmount') : undefined">
            <p
              v-if="!editing"
              class="text-sm font-medium text-highlighted"
            >
              {{ row.amount_per_serving }}
            </p>
            <UInput
              v-else
              v-model="row.amount_per_serving"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="index === 0 ? $t('products.fields.nutritionPct') : undefined">
            <p
              v-if="!editing"
              class="text-sm font-medium text-highlighted"
            >
              {{ row.daily_reference_pct }}
            </p>
            <UInput
              v-else
              v-model="row.daily_reference_pct"
              class="w-full"
            />
          </UFormField>
          <UButton
            v-if="editing"
            type="button"
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            :aria-label="$t('actions.delete')"
            @click="removeNutrition(index)"
          />
        </div>
        <UButton
          v-if="editing"
          type="button"
          color="neutral"
          variant="outline"
          icon="i-lucide-plus"
          @click="addNutrition"
        >
          {{ $t('products.fields.addNutrition') }}
        </UButton>
      </div>

      <div
        v-if="readouts.length"
        class="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4"
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
    </fieldset>
  </form>
</template>
