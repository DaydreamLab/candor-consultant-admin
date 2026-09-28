<script setup lang="ts">
const { t } = useI18n()
const { me, pending, errorMessage } = useOperatorMe({ refresh: true })

const LEADING = ['name', 'email', 'role']

const fields = computed(() => {
  const data = me.value
  if (!data) {
    return []
  }
  const keys = Object.keys(data).filter(key => key !== 'token')
  const leading = LEADING.filter(key => Object.prototype.hasOwnProperty.call(data, key))
  const rest = keys.filter(key => !LEADING.includes(key))
  return [...leading, ...rest].map(key => ({
    key,
    label: fieldLabel(key),
    value: fieldValue(key, data[key])
  }))
})

function fieldLabel(key: string) {
  switch (key) {
    case 'name':
      return t('operatorMe.fields.name')
    case 'email':
      return t('operatorMe.fields.email')
    case 'role':
      return t('operatorMe.fields.role')
    case 'status':
      return t('operatorMe.fields.status')
    case 'last_login_at':
      return t('operatorMe.fields.last_login_at')
    case 'id':
      return t('operatorMe.fields.id')
    default:
      return key
  }
}

function fieldValue(key: string, value: unknown) {
  if (value == null || value === '') {
    return t('status.na')
  }
  if (key === 'role' && (value === 'expert' || value === 'ops' || value === 'admin')) {
    return t(`roles.${value}`)
  }
  if (key === 'status' && value === 'active') {
    return t('operatorMe.status.active')
  }
  if (key === 'status' && value === 'suspended') {
    return t('operatorMe.status.suspended')
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value)
}
</script>

<template>
  <PageHeader
    :title="$t('nav.account')"
    plain
  >
    <p
      v-if="errorMessage"
      class="text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-else-if="pending && !fields.length"
      class="text-sm text-muted"
    >
      {{ $t('operatorMe.loading') }}
    </p>
    <section
      v-else-if="fields.length"
      class="max-w-xl overflow-hidden rounded-xl border border-default bg-elevated"
    >
      <dl>
        <div
          v-for="field in fields"
          :key="field.key"
          class="flex flex-col gap-1 border-b border-default px-4 py-3.5 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
        >
          <dt class="shrink-0 text-sm text-muted">
            {{ field.label }}
          </dt>
          <dd class="min-w-0 text-sm font-medium break-all text-highlighted sm:text-right">
            {{ field.value }}
          </dd>
        </div>
      </dl>
    </section>
  </PageHeader>
</template>
