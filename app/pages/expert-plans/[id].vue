<script setup lang="ts">
import {
  AdminApiError,
  adminGetExpertPlan,
  adminUpdateExpertPlan,
  isExpertPlanFieldForbiddenError,
  type ExpertPlanWrite
} from '~/utils/admin-api'
import { EXPERT_PLAN_FORM_ID, bindNavbarActions } from '~/composables/useNavbarActions'
import { useDirtyLeaveModal } from '~/composables/useDirtyLeaveModal'
import { normalizeAdminPath } from '~/utils/nav'
import { readOperatorToken } from '~/utils/operator-session'

const config = useRuntimeConfig()
const route = useRoute()
const localePath = useLocalePath()
const { t, locale } = useI18n()
const session = useSessionStore()
const crumbLabel = useExpertPlanCrumbLabel()
const { set } = bindNavbarActions()

const expertPlanId = computed(() => String(route.params.id ?? ''))
const title = computed(() => crumbLabel.value || expertPlanId.value)
const canEdit = computed(() => {
  const role = session.operator?.role
  return role === 'ops' || role === 'admin'
})

const expertPlan = ref<Record<string, unknown> | null>(null)
const pending = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const formDirty = ref(false)
const saveNotice = ref<'success' | 'noChanges' | null>(null)

const {
  leaveOpen,
  requestLeave,
  stay,
  discardAndLeave,
  allowNavigationWithoutConfirm
} = useDirtyLeaveModal(formDirty)

watch([saving, pending, expertPlan, locale, canEdit], () => {
  if (pending.value || !expertPlan.value || !canEdit.value) {
    set(null)
    return
  }
  set({
    showDelete: false,
    deleteDisabled: false,
    deleting: false,
    busy: saving.value,
    onDelete: () => {},
    primaryLabel: t('actions.save'),
    primaryLoading: saving.value,
    primaryForm: EXPERT_PLAN_FORM_ID,
    onPrimary: null
  })
}, { immediate: true })

if (import.meta.client) {
  watch(expertPlanId, (id) => {
    void load(id)
  }, { immediate: true })

  // Expert role has no edit entry (B-03); bounce to list if they hit the URL.
  watch(canEdit, (ok) => {
    if (!ok && !pending.value) {
      void navigateTo(localePath('/expert-plans'))
    }
  }, { immediate: true })
}

onUnmounted(() => {
  if (!normalizeAdminPath(route.path).startsWith('/expert-plans/')) {
    crumbLabel.value = null
  }
})

async function load(id: string) {
  crumbLabel.value = null
  expertPlan.value = null
  errorMessage.value = ''
  formDirty.value = false
  saveNotice.value = null

  const token = readOperatorToken()
  if (!token || !id) {
    pending.value = false
    errorMessage.value = t('expertPlans.failed')
    return
  }

  pending.value = true
  try {
    const row = await adminGetExpertPlan(config.public.apiBase, token, id)
    if (expertPlanId.value !== id) {
      return
    }
    expertPlan.value = row
    crumbLabel.value = planName(row)
    errorMessage.value = ''
  } catch (error) {
    if (expertPlanId.value !== id) {
      return
    }
    expertPlan.value = null
    errorMessage.value = failText(error, t('expertPlans.failed'))
  } finally {
    if (expertPlanId.value === id) {
      pending.value = false
    }
  }
}

async function onSave(payload: ExpertPlanWrite) {
  const token = readOperatorToken()
  const id = expertPlanId.value
  if (!token || !id || !canEdit.value) {
    errorMessage.value = t('expertPlans.saveFailed')
    return
  }

  saving.value = true
  errorMessage.value = ''
  saveNotice.value = null
  try {
    const row = await adminUpdateExpertPlan(config.public.apiBase, token, id, payload)
    if (expertPlanId.value !== id) {
      return
    }
    expertPlan.value = row
    crumbLabel.value = planName(row)
    formDirty.value = false
    saveNotice.value = 'success'
  } catch (error) {
    if (expertPlanId.value !== id) {
      return
    }
    if (isExpertPlanFieldForbiddenError(error)) {
      errorMessage.value = failText(error, t('expertPlans.fieldForbidden'))
      return
    }
    errorMessage.value = failText(error, t('expertPlans.saveFailed'))
  } finally {
    if (expertPlanId.value === id) {
      saving.value = false
    }
  }
}

function onNoChanges() {
  saveNotice.value = 'noChanges'
  errorMessage.value = ''
}

async function onCancel() {
  const ok = await requestLeave()
  if (!ok) {
    return
  }
  allowNavigationWithoutConfirm()
  void navigateTo(localePath('/expert-plans'))
}

watch(formDirty, (dirty) => {
  if (dirty) {
    saveNotice.value = null
  }
})

function planName(row: Record<string, unknown>) {
  return scalarText(row.name_zh).trim() || scalarText(row.name).trim() || null
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

function failText(error: unknown, fallback: string) {
  const message = error instanceof AdminApiError ? error.message.trim() : ''
  return message || fallback
}
</script>

<template>
  <PageHeader
    :title="title"
    plain
  >
    <UAlert
      v-if="saveNotice === 'success' && expertPlan"
      color="success"
      variant="subtle"
      class="mb-4"
      :title="$t('expertPlans.saveOk')"
      data-testid="expert-plan-save-ok"
    />
    <UAlert
      v-if="saveNotice === 'noChanges' && expertPlan"
      color="neutral"
      variant="subtle"
      class="mb-4"
      :title="$t('expertPlans.noChanges')"
    />
    <p
      v-if="errorMessage"
      class="mb-4 text-sm text-error"
      data-testid="expert-plan-page-error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('expertPlans.loading') }}
    </p>
    <ExpertPlanForm
      v-else-if="expertPlan && canEdit"
      :disabled="!canEdit"
      :expert-plan="expertPlan"
      :saving="saving"
      :save-error="errorMessage"
      @dirty-change="formDirty = $event"
      @cancel="onCancel"
      @no-changes="onNoChanges"
      @save="onSave"
    />

    <UModal
      :open="leaveOpen"
      :title="$t('expertPlans.leaveTitle')"
      :description="$t('expertPlans.leaveBody')"
      :ui="{ footer: 'justify-end gap-2' }"
      @update:open="(open: boolean) => { if (!open) stay() }"
    >
      <template #body>
        <p
          class="sr-only"
          data-testid="expert-plan-leave-modal"
        >
          {{ $t('expertPlans.leaveTitle') }}
        </p>
      </template>
      <template #footer>
        <UButton
          color="neutral"
          variant="outline"
          data-testid="expert-plan-leave-stay"
          @click="stay"
        >
          {{ $t('expertPlans.leaveStay') }}
        </UButton>
        <UButton
          color="error"
          data-testid="expert-plan-leave-discard"
          @click="discardAndLeave"
        >
          {{ $t('expertPlans.leaveDiscard') }}
        </UButton>
      </template>
    </UModal>
  </PageHeader>
</template>
