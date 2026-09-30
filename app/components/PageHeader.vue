<template>
  <div>
    <header
      v-if="showMeta"
      class="mb-6 flex flex-wrap items-start justify-between gap-3"
    >
      <div class="min-w-0 max-w-3xl">
        <UBadge
          v-if="developing"
          color="neutral"
          variant="subtle"
        >
          {{ $t('nav.developing') }}
        </UBadge>
        <p
          v-if="description"
          class="text-base text-muted"
          :class="developing ? 'mt-2' : ''"
        >
          {{ description }}
        </p>
        <p
          v-if="!plain"
          class="text-sm text-dimmed"
          :class="developing || description ? 'mt-2' : ''"
        >
          {{ hint }}
        </p>
        <p
          v-if="showLock"
          class="text-base text-warning"
          :class="developing || description || !plain ? 'mt-2' : ''"
        >
          {{ $t('actions.readOnly') }}
        </p>
      </div>
      <div
        v-if="$slots.actions"
        class="flex flex-wrap items-center gap-2"
      >
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { isDevelopingPath } from '~/utils/nav'

const { hint } = usePageCopy()
const { writable } = useOrgScope()
const route = useRoute()
const slots = useSlots()

const props = defineProps<{
  title?: string
  description?: string
  locked?: boolean
  /** 空殼頁：標題在頂欄，內文不留說明 */
  plain?: boolean
}>()

const developing = computed(() => Boolean(props.title) && isDevelopingPath(route.path))
const showLock = computed(() => !props.plain && (props.locked ?? !writable.value))
const showMeta = computed(() =>
  Boolean(props.description)
  || Boolean(slots.actions)
  || developing.value
  || showLock.value
  || !props.plain
)
</script>
