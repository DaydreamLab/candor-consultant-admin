<template>
  <div>
    <UBreadcrumb
      :items="crumbs"
      class="mb-4"
    />
    <header class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 max-w-3xl">
        <div
          v-if="title"
          class="flex flex-wrap items-center gap-2"
        >
          <h1 class="text-2xl font-semibold text-highlighted">
            {{ title }}
          </h1>
          <UBadge
            v-if="developing"
            color="neutral"
            variant="subtle"
          >
            {{ $t('nav.developing') }}
          </UBadge>
        </div>
        <p
          v-if="description"
          class="text-base text-muted"
          :class="title ? 'mt-2' : ''"
        >
          {{ description }}
        </p>
        <p
          v-if="!plain"
          class="text-sm text-dimmed"
          :class="title || description ? 'mt-2' : ''"
        >
          {{ hint }}
        </p>
        <p
          v-if="showLock"
          class="mt-2 text-base text-warning"
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
const { items: crumbs } = usePageCrumbs()
const route = useRoute()

const props = defineProps<{
  title?: string
  description?: string
  locked?: boolean
  /** 空殼頁：只留麵包屑與標題 */
  plain?: boolean
}>()

const developing = computed(() => Boolean(props.title) && isDevelopingPath(route.path))
const showLock = computed(() => !props.plain && (props.locked ?? !writable.value))
</script>
