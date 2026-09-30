<script setup lang="ts">
import { AdminApiError, adminListUsers } from '~/utils/admin-api'
import { readOperatorToken } from '~/utils/operator-session'

type UserColumn = 'email' | 'displayName' | 'createdAt' | 'orderCount' | 'reportCount' | 'anonymized' | 'detail'
type ColumnAlign = 'left' | 'center' | 'right'

const PAGE_SIZE = 10
const FILTER_ANY = 'all'

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t } = useI18n()

const users = ref<Record<string, unknown>[]>([])
const pending = ref(true)
const errorMessage = ref('')
const page = ref(1)
let loadSeq = 0

const filterQ = ref('')
const filterHasOrders = ref(FILTER_ANY)
const debouncedQ = ref('')

let qTimer: ReturnType<typeof setTimeout> | null = null

const columns: { key: UserColumn, align: ColumnAlign, width?: string, truncate?: boolean }[] = [
  { key: 'email', align: 'left', width: 'w-[16rem]', truncate: true },
  { key: 'displayName', align: 'left', width: 'w-[10rem]', truncate: true },
  { key: 'createdAt', align: 'left', width: 'w-[9.5rem]' },
  { key: 'orderCount', align: 'center', width: 'w-[5rem]' },
  { key: 'reportCount', align: 'center', width: 'w-[5rem]' },
  { key: 'anonymized', align: 'center', width: 'w-[7rem]' },
  { key: 'detail', align: 'center', width: 'w-[5.5rem]' }
]

const hasOrdersOptions = computed(() => [
  { label: t('users.filters.any'), value: FILTER_ANY },
  { label: t('users.filters.withOrders'), value: 'true' },
  { label: t('users.filters.withoutOrders'), value: 'false' }
])

const rows = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return users.value.slice(start, start + PAGE_SIZE)
})
const paginationTotal = computed(() => users.value.length)

if (import.meta.client) {
  watch(filterQ, (value) => {
    if (qTimer) {
      clearTimeout(qTimer)
    }
    qTimer = setTimeout(() => {
      debouncedQ.value = value.trim()
    }, 300)
  })

  watch(
    [debouncedQ, filterHasOrders],
    () => {
      void load()
    },
    { immediate: true }
  )
}

onUnmounted(() => {
  if (qTimer) {
    clearTimeout(qTimer)
  }
})

async function load() {
  const seq = ++loadSeq
  const token = readOperatorToken()
  if (!token) {
    users.value = []
    errorMessage.value = t('users.failed')
    pending.value = false
    return
  }

  pending.value = true
  errorMessage.value = ''
  page.value = 1
  try {
    const hasOrders = filterHasOrders.value === FILTER_ANY
      ? undefined
      : filterHasOrders.value === 'true'
    const fetched = await adminListUsers(config.public.apiBase, token, {
      q: debouncedQ.value || undefined,
      has_orders: hasOrders
    })
    if (seq !== loadSeq) {
      return
    }
    users.value = fetched
  } catch (error) {
    if (seq !== loadSeq) {
      return
    }
    users.value = []
    const message = error instanceof AdminApiError ? error.message.trim() : ''
    errorMessage.value = message || t('users.failed')
  } finally {
    if (seq === loadSeq) {
      pending.value = false
    }
  }
}

function goToPage(next: number) {
  if (pending.value || next < 1 || next === page.value) {
    return
  }
  page.value = next
}

function userId(row: Record<string, unknown>) {
  const id = row.id
  return typeof id === 'string' && id.trim() ? id : ''
}

function rowKey(row: Record<string, unknown>, index: number) {
  return userId(row) || `user-${index}`
}

function openUser(row: Record<string, unknown>) {
  const id = userId(row)
  if (!id) {
    return
  }
  void navigateTo(localePath(`/users/${encodeURIComponent(id)}`))
}

function columnLabel(key: UserColumn) {
  return t(`users.columns.${key}`)
}

function alignClass(align: ColumnAlign) {
  if (align === 'center') {
    return 'text-center'
  }
  if (align === 'right') {
    return 'text-right'
  }
  return ''
}

function cellClass(column: { key: UserColumn, align: ColumnAlign, truncate?: boolean }) {
  const classes = [alignClass(column.align)]
  if (column.truncate) {
    classes.push('truncate')
  }
  if (column.key === 'email') {
    classes.push('font-medium text-highlighted')
  } else if (column.key === 'createdAt') {
    classes.push('text-muted')
  }
  return classes.filter(Boolean).join(' ')
}

function cellText(row: Record<string, unknown>, key: UserColumn) {
  switch (key) {
    case 'email':
      return textOf(row.email)
    case 'displayName':
      return textOf(row.display_name)
    case 'createdAt':
      return createdAtOf(row.created_at)
    case 'orderCount':
      return countOf(row.order_count)
    case 'reportCount':
      return countOf(row.report_count)
    case 'anonymized':
      return anonymizedOf(row.anonymized_at)
    case 'detail':
      return ''
  }
}

function textOf(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value
  }
  return t('status.na')
}

function countOf(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return String(Number(value))
  }
  return '0'
}

function anonymizedOf(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return t('users.anonymized.yes')
  }
  return t('users.anonymized.no')
}

function createdAtOf(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return t('status.na')
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}/${day} ${hours}:${minutes}`
}
</script>

<template>
  <PageHeader
    :title="$t('nav.users')"
    plain
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-end gap-3 rounded-xl border border-default bg-elevated p-4">
        <div class="min-w-40 grow basis-40">
          <label class="mb-1 block text-xs text-muted">
            {{ $t('users.filters.q') }}
          </label>
          <UInput
            v-model="filterQ"
            icon="i-lucide-search"
            :placeholder="$t('users.filters.qPlaceholder')"
            class="w-full"
          />
        </div>
        <div class="min-w-36">
          <label class="mb-1 block text-xs text-muted">
            {{ $t('users.filters.hasOrders') }}
          </label>
          <USelect
            v-model="filterHasOrders"
            :items="hasOrdersOptions"
            value-key="value"
            class="w-full"
          />
        </div>
      </div>

      <p
        v-if="errorMessage"
        class="text-sm text-error"
      >
        {{ errorMessage }}
      </p>
      <p
        v-else-if="pending && !users.length"
        class="text-sm text-muted"
      >
        {{ $t('users.loading') }}
      </p>
      <template v-else>
        <p
          v-if="!users.length"
          class="rounded-xl border border-default bg-elevated p-10 text-center text-base text-muted"
        >
          {{ $t('users.empty') }}
        </p>
        <AdminTable
          v-else
          compact
          fixed
        >
          <template #colgroup>
            <colgroup>
              <col
                v-for="column in columns"
                :key="column.key"
                :class="column.width"
              >
            </colgroup>
          </template>
          <template #head>
            <tr>
              <th
                v-for="column in columns"
                :key="column.key"
                :class="[column.width, alignClass(column.align)]"
              >
                {{ columnLabel(column.key) }}
              </th>
            </tr>
          </template>
          <tr
            v-for="(row, index) in rows"
            :key="rowKey(row, index)"
            class="border-b border-default last:border-0"
            :class="userId(row) ? 'cursor-pointer hover:bg-muted/40' : ''"
            @click="openUser(row)"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              :class="cellClass(column)"
              :title="column.truncate ? cellText(row, column.key) : undefined"
            >
              <UButton
                v-if="column.key === 'detail'"
                size="xs"
                variant="soft"
                color="neutral"
                @click.stop="openUser(row)"
              >
                {{ $t('users.openDetail') }}
              </UButton>
              <template v-else>
                {{ cellText(row, column.key) }}
              </template>
            </td>
          </tr>
          <template #footer>
            <div class="flex justify-end border-t border-default px-4 py-3">
              <UPagination
                :page="page"
                :items-per-page="PAGE_SIZE"
                :total="paginationTotal"
                :disabled="pending"
                @update:page="goToPage"
              />
            </div>
          </template>
        </AdminTable>
      </template>
    </div>
  </PageHeader>
</template>
