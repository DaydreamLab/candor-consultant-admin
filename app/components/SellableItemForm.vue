<script setup lang="ts">
const props = defineProps<{
  mode: 'create' | 'update'
  sellableItem: Record<string, unknown> | null
  fallbackId?: string
  saving: boolean
  deleting: boolean
}>()

const emit = defineEmits<{
  save: [body: Record<string, unknown>]
  remove: []
}>()

const { t } = useI18n()

const name = ref('')
const spec = ref('')
const sku = ref('')
const image = ref('')

watch(() => props.sellableItem, (item) => {
  if (props.mode !== 'update' || !item) {
    return
  }
  name.value = scalarText(item.name)
  spec.value = scalarText(item.spec)
}, { immediate: true })

const showName = computed(() => props.mode === 'create' || hasKey(props.sellableItem, 'name'))
const showSpec = computed(() => props.mode === 'create' || hasKey(props.sellableItem, 'spec'))
const photoSrc = computed(() => {
  if (props.mode === 'create') {
    return image.value.trim()
  }
  return imageOf(props.sellableItem)
})
const identifierText = computed(() => identifierOf(props.sellableItem, props.fallbackId ?? ''))
const otherFields = computed(() => extraFields(props.sellableItem, props.mode))
const busy = computed(() => props.saving || props.deleting)

function onSubmit() {
  if (busy.value) {
    return
  }
  emit('save', writeBody())
}

function writeBody() {
  const body: Record<string, unknown> = {}
  if (props.mode === 'create') {
    assignFilled(body, 'name', name.value)
    assignFilled(body, 'sku', sku.value)
    assignFilled(body, 'spec', spec.value)
    assignFilled(body, 'image', image.value)
    return body
  }
  if (showName.value) {
    body.name = name.value.trim()
  }
  if (showSpec.value) {
    body.spec = spec.value.trim()
  }
  return body
}

function extraFields(item: Record<string, unknown> | null, mode: 'create' | 'update') {
  if (mode !== 'update' || !item) {
    return []
  }
  const skip = new Set(['image', 'image_url', 'name', 'spec', identifierKey(item)])
  const fields: { key: string, label: string, value: string }[] = []
  for (const [key, value] of Object.entries(item)) {
    if (skip.has(key) || !isScalar(value)) {
      continue
    }
    fields.push({
      key,
      label: fieldLabel(key),
      value: fieldValue(value)
    })
  }
  return fields
}

function fieldLabel(key: string) {
  if (key === 'onHand' || key === 'reserved' || key === 'reorderAt') {
    return t(`products.fields.${key}`)
  }
  return key
}

function fieldValue(value: unknown) {
  if (typeof value === 'boolean') {
    return value ? t('status.yes') : t('status.no')
  }
  const text = scalarText(value).trim()
  return text || t('status.na')
}

function assignFilled(body: Record<string, unknown>, key: string, value: string) {
  const text = value.trim()
  if (text) {
    body[key] = text
  }
}

function identifierOf(item: Record<string, unknown> | null, fallbackId: string) {
  if (!item) {
    return fallbackId
  }
  return scalarText(item.sku).trim() || scalarText(item.code).trim() || scalarText(item.id).trim() || fallbackId
}

function identifierKey(item: Record<string, unknown>) {
  if (scalarText(item.sku).trim()) {
    return 'sku'
  }
  if (scalarText(item.code).trim()) {
    return 'code'
  }
  return 'id'
}

function imageOf(item: Record<string, unknown> | null) {
  if (!item) {
    return ''
  }
  return scalarText(item.image).trim() || scalarText(item.image_url).trim()
}

function hasKey(item: Record<string, unknown> | null, key: string) {
  return Boolean(item) && Object.prototype.hasOwnProperty.call(item, key)
}

function isScalar(value: unknown) {
  if (typeof value === 'string' || typeof value === 'boolean') {
    return true
  }
  return typeof value === 'number' && Number.isFinite(value)
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
    class="max-w-xl overflow-hidden rounded-xl border border-default bg-elevated"
    @submit.prevent="onSubmit"
  >
    <div
      v-if="mode === 'create' || photoSrc"
      class="border-b border-default px-4 py-3.5"
    >
      <p class="text-sm text-muted">
        {{ $t('products.fields.image') }}
      </p>
      <img
        v-if="photoSrc"
        :src="photoSrc"
        alt=""
        class="mt-2 size-16 rounded-lg object-cover"
      >
      <UInput
        v-if="mode === 'create'"
        v-model="image"
        class="mt-2 w-full"
      />
    </div>

    <div
      v-if="showName"
      class="border-b border-default px-4 py-3.5"
    >
      <p class="text-sm text-muted">
        {{ $t('products.fields.name') }}
      </p>
      <UInput
        v-model="name"
        class="mt-2 w-full"
      />
    </div>

    <div class="border-b border-default px-4 py-3.5">
      <p class="text-sm text-muted">
        {{ $t('products.fields.identifier') }}
      </p>
      <UInput
        v-if="mode === 'create'"
        v-model="sku"
        class="mt-2 w-full"
      />
      <p
        v-else
        class="mt-1 text-sm font-medium break-all text-highlighted"
      >
        {{ identifierText }}
      </p>
    </div>

    <div
      v-if="showSpec"
      class="border-b border-default px-4 py-3.5"
    >
      <p class="text-sm text-muted">
        {{ $t('products.fields.spec') }}
      </p>
      <UInput
        v-model="spec"
        class="mt-2 w-full"
      />
    </div>

    <div
      v-for="field in otherFields"
      :key="field.key"
      class="border-b border-default px-4 py-3.5"
    >
      <p class="text-sm text-muted">
        {{ field.label }}
      </p>
      <p class="mt-1 text-sm font-medium break-all text-highlighted">
        {{ field.value }}
      </p>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
      <UButton
        type="submit"
        :loading="saving"
        :disabled="busy"
      >
        {{ $t('actions.save') }}
      </UButton>
      <UButton
        v-if="mode === 'update'"
        type="button"
        color="error"
        variant="outline"
        :loading="deleting"
        :disabled="busy"
        @click="emit('remove')"
      >
        {{ $t('actions.delete') }}
      </UButton>
    </div>
  </form>
</template>
