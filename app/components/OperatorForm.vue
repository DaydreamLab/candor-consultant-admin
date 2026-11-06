<script setup lang="ts">
import type { AdminOperator, OperatorRole, OperatorStatus } from '~/types/operator'
import { OPERATOR_ROLE_ORDER, sortOperatorRoles } from '~/utils/operator-role-order'

const props = defineProps<{
  mode: 'create' | 'edit'
  operator: AdminOperator | null
  saving: boolean
  saveError: string
}>()

const emit = defineEmits<{
  save: [payload: {
    email?: string
    name: string
    roles: OperatorRole[]
    password?: string
    status?: OperatorStatus
  }]
  cancel: []
  resetPassword: [password: string]
}>()

const { t } = useI18n()

const email = ref('')
const name = ref('')
const roles = ref<OperatorRole[]>([])
const password = ref('')
const status = ref<OperatorStatus>('active')
const resetPassword = ref('')
const localError = ref('')

const roleOptions = computed(() =>
  OPERATOR_ROLE_ORDER.map(role => ({
    value: role,
    label: t(`roles.${role}`)
  }))
)

const statusOptions = computed(() => [
  { value: 'active' as const, label: t('operators.status.active') },
  { value: 'suspended' as const, label: t('operators.status.suspended') }
])

watch(
  () => props.operator,
  (row) => {
    if (props.mode === 'edit' && row) {
      email.value = row.email
      name.value = row.name
      roles.value = [...row.roles]
      status.value = row.status
      password.value = ''
      resetPassword.value = ''
      localError.value = ''
      return
    }
    if (props.mode === 'create') {
      email.value = ''
      name.value = ''
      roles.value = []
      password.value = ''
      status.value = 'active'
      localError.value = ''
    }
  },
  { immediate: true }
)

function toggleRole(role: OperatorRole) {
  if (roles.value.includes(role)) {
    roles.value = roles.value.filter(item => item !== role)
    return
  }
  roles.value = sortOperatorRoles([...roles.value, role])
}

function onSubmit() {
  localError.value = ''
  const trimmedName = name.value.trim()
  const selected = sortOperatorRoles(roles.value)
  if (!trimmedName) {
    localError.value = t('operators.errors.nameRequired')
    return
  }
  if (selected.length === 0) {
    localError.value = t('operators.errors.rolesRequired')
    return
  }

  if (props.mode === 'create') {
    const trimmedEmail = email.value.trim()
    if (!trimmedEmail) {
      localError.value = t('operators.errors.emailRequired')
      return
    }
    if (!password.value) {
      localError.value = t('operators.errors.passwordRequired')
      return
    }
    emit('save', {
      email: trimmedEmail,
      name: trimmedName,
      roles: selected,
      password: password.value
    })
    return
  }

  emit('save', {
    name: trimmedName,
    roles: selected,
    status: status.value
  })
}

function onResetPassword() {
  localError.value = ''
  if (!resetPassword.value) {
    localError.value = t('operators.errors.passwordRequired')
    return
  }
  emit('resetPassword', resetPassword.value)
}
</script>

<template>
  <form
    class="max-w-xl space-y-5"
    data-testid="operator-form"
    @submit.prevent="onSubmit"
  >
    <UFormField
      :label="$t('operators.fields.email')"
      name="email"
      required
    >
      <UInput
        v-model="email"
        type="email"
        autocomplete="off"
        class="w-full"
        :disabled="mode === 'edit' || saving"
        data-testid="operator-form-email"
      />
    </UFormField>

    <UFormField
      :label="$t('operators.fields.name')"
      name="name"
      required
    >
      <UInput
        v-model="name"
        autocomplete="off"
        class="w-full"
        :disabled="saving"
        data-testid="operator-form-name"
      />
    </UFormField>

    <UFormField
      :label="$t('operators.fields.roles')"
      name="roles"
      required
      :help="$t('operators.fields.rolesHelp')"
    >
      <div
        class="flex flex-wrap gap-3"
        data-testid="operator-form-roles"
        role="group"
        :aria-label="$t('operators.fields.roles')"
      >
        <label
          v-for="option in roleOptions"
          :key="option.value"
          class="inline-flex items-center gap-2 text-sm"
        >
          <input
            type="checkbox"
            class="size-4 rounded border-default"
            :value="option.value"
            :checked="roles.includes(option.value)"
            :disabled="saving"
            :data-testid="`operator-form-role-${option.value}`"
            @change="toggleRole(option.value)"
          >
          <span>{{ option.label }}</span>
        </label>
      </div>
    </UFormField>

    <UFormField
      v-if="mode === 'create'"
      :label="$t('operators.fields.password')"
      name="password"
      required
    >
      <UInput
        v-model="password"
        type="password"
        autocomplete="new-password"
        class="w-full"
        :disabled="saving"
        data-testid="operator-form-password"
      />
    </UFormField>

    <UFormField
      v-if="mode === 'edit'"
      :label="$t('operators.fields.status')"
      name="status"
    >
      <USelect
        v-model="status"
        :items="statusOptions"
        value-key="value"
        class="w-full"
        :disabled="saving"
        data-testid="operator-form-status"
      />
    </UFormField>

    <p
      v-if="localError || saveError"
      class="text-sm text-error"
      data-testid="operator-form-error"
    >
      {{ localError || saveError }}
    </p>

    <div class="flex flex-wrap gap-2">
      <UButton
        type="submit"
        color="primary"
        :loading="saving"
        data-testid="operator-form-save"
      >
        {{ mode === 'create' ? $t('operators.create') : $t('operators.save') }}
      </UButton>
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        :disabled="saving"
        data-testid="operator-form-cancel"
        @click="emit('cancel')"
      >
        {{ $t('actions.cancel') }}
      </UButton>
    </div>

    <section
      v-if="mode === 'edit'"
      class="space-y-3 border-t border-default pt-5"
      data-testid="operator-password-reset"
    >
      <h2 class="text-sm font-medium text-highlighted">
        {{ $t('operators.resetPasswordTitle') }}
      </h2>
      <UFormField
        :label="$t('operators.fields.newPassword')"
        name="resetPassword"
      >
        <UInput
          v-model="resetPassword"
          type="password"
          autocomplete="new-password"
          class="w-full"
          :disabled="saving"
          data-testid="operator-form-reset-password"
        />
      </UFormField>
      <UButton
        type="button"
        color="neutral"
        variant="soft"
        :loading="saving"
        data-testid="operator-form-reset-password-submit"
        @click="onResetPassword"
      >
        {{ $t('operators.resetPassword') }}
      </UButton>
    </section>
  </form>
</template>
