<script setup lang="ts">
import { DEMO_ORGS, DEMO_STAFF } from '~/utils/demo'

definePageMeta({
  layout: 'auth'
})

const { t, locale } = useI18n()
const localePath = useLocalePath()
const session = useSessionStore()

const selected = ref(session.session?.id ?? 'user-owner')

const groups = computed(() => {
  const candor = DEMO_STAFF.filter(row => !row.orgId && row.status === 'active')
  const firms = DEMO_ORGS.map(org => ({
    id: org.id,
    name: locale.value === 'en' ? org.nameEn : org.name,
    accounts: DEMO_STAFF.filter(row => row.orgId === org.id && row.status === 'active')
  }))
  return [
    { id: 'candor', name: t('login.candor'), accounts: candor },
    ...firms
  ]
})

watch(groups, (list) => {
  if (!list.some(group => group.accounts.some(row => row.id === selected.value))) {
    selected.value = list[0]?.accounts[0]?.id ?? 'user-owner'
  }
}, { immediate: true })

async function submit() {
  session.loginAs(selected.value)
  await navigateTo(localePath('/'))
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold text-highlighted">
      {{ $t('login.title') }}
    </h1>
    <p class="mt-2 text-sm text-muted">
      {{ $t('login.description') }}
    </p>

    <form
      class="mt-8 space-y-6"
      @submit.prevent="submit"
    >
      <section
        v-for="group in groups"
        :key="group.id"
      >
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-dimmed">
          {{ group.name }}
        </h2>
        <div class="grid gap-2">
          <button
            v-for="account in group.accounts"
            :key="account.id"
            type="button"
            class="rounded-xl border px-4 py-3 text-left transition"
            :class="selected === account.id
              ? 'border-primary bg-primary/5'
              : 'border-default hover:border-primary/40'"
            @click="selected = account.id"
          >
            <p class="font-medium text-highlighted">
              {{ account.name }}
            </p>
            <p class="mt-0.5 text-xs text-muted">
              {{ $t(`login.roles.${account.role}`) }} · {{ account.email }}
            </p>
          </button>
        </div>
      </section>

      <UButton
        type="submit"
        block
        size="lg"
      >
        {{ $t('login.submit') }}
      </UButton>
    </form>
  </div>
</template>
