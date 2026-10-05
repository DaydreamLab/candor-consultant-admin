<script setup lang="ts">
import { LAB_SERVICE_FORM_ID } from '~/composables/useNavbarActions'
import { money } from '~/utils/format'
import {
  newLocalId,
  type LabServiceItemMock,
  type LabServiceMock,
  type LabServiceScheduleRuleMock,
  type LabServiceWindowMock,
  type LabServiceWrite,
  type Weekday
} from '~/utils/lab-service-mock'

const props = withDefaults(defineProps<{
  mode: 'create' | 'edit'
  labService: LabServiceMock | null
  saving: boolean
  saveError?: string
  disabled?: boolean
}>(), {
  disabled: false,
  saveError: ''
})

const emit = defineEmits<{
  save: [payload: LabServiceWrite]
}>()

const { t } = useI18n()

type ItemDraft = {
  id: string
  name_zh: string
  name_en: string
  unit_price: string
  required: boolean
}

type WindowDraft = {
  id: string
  start: string
  end: string
  capacity: string
}

type RuleDraft = {
  id: string
  weekdays: Weekday[]
  windows: WindowDraft[]
}

type FormState = {
  code: string
  name_zh: string
  name_en: string
  description: string
  partner_name: string
  partner_phone: string
  partner_address: string
  sort_order: string
  active: boolean
  items: ItemDraft[]
  schedule_rules: RuleDraft[]
}

const state = reactive<FormState>(emptyState())
const localError = ref('')

const fieldsLocked = computed(() => props.disabled || props.saving)
const codeLocked = computed(() => props.mode === 'edit' || fieldsLocked.value)

const weekdayOptions = computed(() => ([
  { label: t('labServices.weekdays.1'), value: 1 as Weekday },
  { label: t('labServices.weekdays.2'), value: 2 as Weekday },
  { label: t('labServices.weekdays.3'), value: 3 as Weekday },
  { label: t('labServices.weekdays.4'), value: 4 as Weekday },
  { label: t('labServices.weekdays.5'), value: 5 as Weekday },
  { label: t('labServices.weekdays.6'), value: 6 as Weekday },
  { label: t('labServices.weekdays.7'), value: 7 as Weekday }
]))

const basePrice = computed(() => {
  let sum = 0
  for (const item of state.items) {
    if (!item.required) {
      continue
    }
    const price = Number(item.unit_price)
    if (Number.isInteger(price) && price > 0) {
      sum += price
    }
  }
  return sum
})

watch(() => props.labService, (service) => {
  applyService(service)
  localError.value = ''
}, { immediate: true })

watch(() => props.saveError, () => {
  localError.value = ''
})

function onSubmit() {
  if (fieldsLocked.value) {
    return
  }
  localError.value = ''

  const code = state.code.trim()
  const nameZh = state.name_zh.trim()
  const partnerName = state.partner_name.trim()
  if (!code || !nameZh || !partnerName) {
    localError.value = t('labServices.validation.required')
    return
  }

  const sortOrder = state.sort_order.trim() === '' ? 0 : Number(state.sort_order)
  if (!Number.isInteger(sortOrder)) {
    localError.value = t('labServices.validation.sortOrder')
    return
  }

  const items: LabServiceItemMock[] = []
  for (const draft of state.items) {
    const name = draft.name_zh.trim()
    const price = Number(draft.unit_price)
    if (!name) {
      localError.value = t('labServices.validation.itemName')
      return
    }
    if (!Number.isInteger(price) || price <= 0) {
      localError.value = t('labServices.validation.itemPrice')
      return
    }
    items.push({
      id: draft.id || newLocalId('lsi'),
      name_zh: name,
      name_en: draft.name_en.trim(),
      unit_price: price,
      required: draft.required
    })
  }
  if (!items.length) {
    localError.value = t('labServices.validation.itemsRequired')
    return
  }
  if (!items.some(item => item.required)) {
    localError.value = t('labServices.validation.requiredItem')
    return
  }

  const scheduleRules: LabServiceScheduleRuleMock[] = []
  for (const draft of state.schedule_rules) {
    const weekdays = [...new Set(draft.weekdays)].sort((a, b) => a - b) as Weekday[]
    if (!weekdays.length) {
      localError.value = t('labServices.validation.weekdays')
      return
    }
    const windows: LabServiceWindowMock[] = []
    for (const window of draft.windows) {
      const start = normalizeTime(window.start)
      const end = normalizeTime(window.end)
      const capacity = Number(window.capacity)
      if (!isTime(start) || !isTime(end) || start >= end) {
        localError.value = t('labServices.validation.window')
        return
      }
      if (!Number.isInteger(capacity) || capacity <= 0) {
        localError.value = t('labServices.validation.capacity')
        return
      }
      windows.push({
        id: window.id || newLocalId('lsw'),
        start,
        end,
        capacity
      })
    }
    if (!windows.length) {
      localError.value = t('labServices.validation.windowsRequired')
      return
    }
    scheduleRules.push({
      id: draft.id || newLocalId('lsr'),
      weekdays,
      windows
    })
  }
  if (!scheduleRules.length) {
    localError.value = t('labServices.validation.rulesRequired')
    return
  }

  emit('save', {
    code,
    name_zh: nameZh,
    name_en: state.name_en.trim(),
    description: state.description.trim(),
    partner_name: partnerName,
    partner_phone: state.partner_phone.trim(),
    partner_address: state.partner_address.trim(),
    items,
    schedule_rules: scheduleRules,
    sort_order: sortOrder,
    active: state.active
  })
}

function applyService(service: LabServiceMock | null) {
  if (!service) {
    Object.assign(state, emptyState())
    return
  }
  state.code = service.code
  state.name_zh = service.name_zh
  state.name_en = service.name_en
  state.description = service.description
  state.partner_name = service.partner_name
  state.partner_phone = service.partner_phone
  state.partner_address = service.partner_address
  state.sort_order = String(service.sort_order)
  state.active = service.active
  state.items = service.items.map(item => ({
    id: item.id,
    name_zh: item.name_zh,
    name_en: item.name_en,
    unit_price: String(item.unit_price),
    required: item.required
  }))
  state.schedule_rules = service.schedule_rules.map(rule => ({
    id: rule.id,
    weekdays: [...rule.weekdays],
    windows: rule.windows.map(window => ({
      id: window.id,
      start: window.start,
      end: window.end,
      capacity: String(window.capacity)
    }))
  }))
}

function emptyState(): FormState {
  return {
    code: '',
    name_zh: '',
    name_en: '',
    description: '',
    partner_name: 'Younger',
    partner_phone: '',
    partner_address: '',
    sort_order: '0',
    active: true,
    items: [emptyItem(true)],
    schedule_rules: [emptyRule()]
  }
}

function emptyItem(required = false): ItemDraft {
  return {
    id: newLocalId('lsi'),
    name_zh: '',
    name_en: '',
    unit_price: '',
    required
  }
}

function emptyWindow(): WindowDraft {
  return {
    id: newLocalId('lsw'),
    start: '09:00',
    end: '12:00',
    capacity: '1'
  }
}

function emptyRule(): RuleDraft {
  return {
    id: newLocalId('lsr'),
    weekdays: [1, 2, 3, 4, 5],
    windows: [emptyWindow()]
  }
}

function addItem() {
  state.items.push(emptyItem(false))
}

function removeItem(index: number) {
  if (state.items.length <= 1) {
    return
  }
  state.items.splice(index, 1)
}

function addRule() {
  state.schedule_rules.push(emptyRule())
}

function removeRule(index: number) {
  if (state.schedule_rules.length <= 1) {
    return
  }
  state.schedule_rules.splice(index, 1)
}

function addWindow(rule: RuleDraft) {
  rule.windows.push(emptyWindow())
}

function removeWindow(rule: RuleDraft, index: number) {
  if (rule.windows.length <= 1) {
    return
  }
  rule.windows.splice(index, 1)
}

function normalizeTime(value: string) {
  const trimmed = value.trim()
  const match = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/)
  if (!match) {
    return trimmed
  }
  return `${match[1]}:${match[2]}`
}

function isTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}
</script>

<template>
  <form
    :id="LAB_SERVICE_FORM_ID"
    class="flex flex-col gap-6"
    @submit.prevent="onSubmit"
  >
    <p
      v-if="localError || saveError"
      class="text-sm text-error"
    >
      {{ localError || saveError }}
    </p>

    <section class="grid gap-4 rounded-xl border border-default bg-elevated p-4 md:grid-cols-2">
      <h2 class="md:col-span-2 text-sm font-semibold text-highlighted">
        {{ $t('labServices.sections.identity') }}
      </h2>
      <UFormField :label="$t('labServices.fields.code')">
        <UInput
          v-model="state.code"
          :disabled="codeLocked"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('labServices.fields.active')">
        <USwitch
          v-model="state.active"
          :disabled="fieldsLocked"
        />
      </UFormField>
      <UFormField :label="$t('labServices.fields.name_zh')">
        <UInput
          v-model="state.name_zh"
          :disabled="fieldsLocked"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('labServices.fields.name_en')">
        <UInput
          v-model="state.name_en"
          :disabled="fieldsLocked"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('labServices.fields.sort_order')">
        <UInput
          v-model="state.sort_order"
          type="number"
          step="1"
          :disabled="fieldsLocked"
          class="w-full"
        />
      </UFormField>
      <UFormField
        class="md:col-span-2"
        :label="$t('labServices.fields.description')"
      >
        <UTextarea
          v-model="state.description"
          :disabled="fieldsLocked"
          :rows="3"
          class="w-full"
        />
      </UFormField>
    </section>

    <section class="grid gap-4 rounded-xl border border-default bg-elevated p-4 md:grid-cols-2">
      <h2 class="md:col-span-2 text-sm font-semibold text-highlighted">
        {{ $t('labServices.sections.partner') }}
      </h2>
      <UFormField :label="$t('labServices.fields.partner_name')">
        <UInput
          v-model="state.partner_name"
          :disabled="fieldsLocked"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('labServices.fields.partner_phone')">
        <UInput
          v-model="state.partner_phone"
          :disabled="fieldsLocked"
          class="w-full"
        />
      </UFormField>
      <UFormField
        class="md:col-span-2"
        :label="$t('labServices.fields.partner_address')"
      >
        <UInput
          v-model="state.partner_address"
          :disabled="fieldsLocked"
          class="w-full"
        />
      </UFormField>
    </section>

    <section class="flex flex-col gap-4 rounded-xl border border-default bg-elevated p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            {{ $t('labServices.sections.items') }}
          </h2>
          <p class="mt-1 text-xs text-muted">
            {{ $t('labServices.basePriceHint') }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <p class="text-sm text-muted">
            {{ $t('labServices.fields.base_price') }}
            <span class="tabular-money ml-1 font-medium text-highlighted">{{ money(basePrice) }}</span>
          </p>
          <UButton
            type="button"
            color="neutral"
            variant="soft"
            icon="i-lucide-plus"
            :disabled="fieldsLocked"
            @click="addItem"
          >
            {{ $t('labServices.actions.addItem') }}
          </UButton>
        </div>
      </div>

      <div
        v-for="(item, index) in state.items"
        :key="item.id"
        class="grid gap-3 rounded-lg border border-default p-3 md:grid-cols-12"
      >
        <UFormField
          class="md:col-span-4"
          :label="$t('labServices.fields.item_name_zh')"
        >
          <UInput
            v-model="item.name_zh"
            :disabled="fieldsLocked"
            class="w-full"
          />
        </UFormField>
        <UFormField
          class="md:col-span-3"
          :label="$t('labServices.fields.item_name_en')"
        >
          <UInput
            v-model="item.name_en"
            :disabled="fieldsLocked"
            class="w-full"
          />
        </UFormField>
        <UFormField
          class="md:col-span-2"
          :label="$t('labServices.fields.unit_price')"
        >
          <UInput
            v-model="item.unit_price"
            type="number"
            min="1"
            step="1"
            :disabled="fieldsLocked"
            class="w-full"
          />
        </UFormField>
        <UFormField
          class="md:col-span-2"
          :label="$t('labServices.fields.required')"
        >
          <USwitch
            v-model="item.required"
            :disabled="fieldsLocked"
          />
        </UFormField>
        <div class="flex items-end md:col-span-1">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            :disabled="fieldsLocked || state.items.length <= 1"
            :aria-label="$t('labServices.actions.removeItem')"
            @click="removeItem(index)"
          />
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-4 rounded-xl border border-default bg-elevated p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            {{ $t('labServices.sections.schedule') }}
          </h2>
          <p class="mt-1 text-xs text-muted">
            {{ $t('labServices.scheduleHint') }}
          </p>
        </div>
        <UButton
          type="button"
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          :disabled="fieldsLocked"
          @click="addRule"
        >
          {{ $t('labServices.actions.addRule') }}
        </UButton>
      </div>

      <div
        v-for="(rule, ruleIndex) in state.schedule_rules"
        :key="rule.id"
        class="flex flex-col gap-3 rounded-lg border border-default p-3"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <UFormField
            class="min-w-64 flex-1"
            :label="$t('labServices.fields.weekdays')"
          >
            <USelect
              v-model="rule.weekdays"
              multiple
              :items="weekdayOptions"
              value-key="value"
              :disabled="fieldsLocked"
              class="w-full"
            />
          </UFormField>
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            class="mt-6"
            :disabled="fieldsLocked || state.schedule_rules.length <= 1"
            :aria-label="$t('labServices.actions.removeRule')"
            @click="removeRule(ruleIndex)"
          />
        </div>

        <div
          v-for="(window, windowIndex) in rule.windows"
          :key="window.id"
          class="grid gap-3 md:grid-cols-12"
        >
          <UFormField
            class="md:col-span-3"
            :label="$t('labServices.fields.window_start')"
          >
            <UInput
              v-model="window.start"
              type="time"
              :disabled="fieldsLocked"
              class="w-full"
            />
          </UFormField>
          <UFormField
            class="md:col-span-3"
            :label="$t('labServices.fields.window_end')"
          >
            <UInput
              v-model="window.end"
              type="time"
              :disabled="fieldsLocked"
              class="w-full"
            />
          </UFormField>
          <UFormField
            class="md:col-span-3"
            :label="$t('labServices.fields.capacity')"
          >
            <UInput
              v-model="window.capacity"
              type="number"
              min="1"
              step="1"
              :disabled="fieldsLocked"
              class="w-full"
            />
          </UFormField>
          <div class="flex items-end gap-2 md:col-span-3">
            <UButton
              type="button"
              color="neutral"
              variant="soft"
              icon="i-lucide-plus"
              :disabled="fieldsLocked"
              @click="addWindow(rule)"
            >
              {{ $t('labServices.actions.addWindow') }}
            </UButton>
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              :disabled="fieldsLocked || rule.windows.length <= 1"
              :aria-label="$t('labServices.actions.removeWindow')"
              @click="removeWindow(rule, windowIndex)"
            />
          </div>
        </div>
      </div>
    </section>
  </form>
</template>
