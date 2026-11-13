<script setup lang="ts">
import {
  ctaStatusClass,
  parseReplyActionsView,
  resolveWholeActionLabel,
  vitalsDisplayField,
  type AskVitalsPayloadView,
  type CtaControlStatus,
  type ReplyActionView,
  type VitalsField
} from '~/utils/chat-reply-actions'

const props = defineProps<{
  replyActions?: unknown
}>()

const { t } = useI18n()

const view = computed(() => parseReplyActionsView(props.replyActions))

const actions = computed(() => view.value?.actions ?? [])

function statusOf(status: CtaControlStatus | null | undefined): CtaControlStatus {
  return status ?? 'disabled'
}

function confirmStatus(action: Extract<ReplyActionView, { type: 'choose_option' | 'ask_goal' }>): CtaControlStatus {
  return statusOf(action.payload.confirm_status)
}

function showConfirm(action: Extract<ReplyActionView, { type: 'choose_option' | 'ask_goal' }>): boolean {
  return action.payload.confirm || action.payload.confirm_status != null
}

function wholeButtonLabel(action: Extract<ReplyActionView, { type: 'whole' }>): string {
  return resolveWholeActionLabel(action.actionType, action.payload.label, t)
}

function vitalsText(payload: AskVitalsPayloadView): string {
  if (!payload.has_stored_value || payload.stored_value == null) {
    return ''
  }
  const field = vitalsDisplayField(payload)
  return t('chatCta.vitalsValue', {
    value: payload.stored_value,
    unit: t(vitalsUnitKey(field))
  })
}

function vitalsUnitKey(field: VitalsField): string {
  if (field === 'height') {
    return 'chatCta.vitalsHeightUnit'
  }
  if (field === 'weight') {
    return 'chatCta.vitalsWeightUnit'
  }
  return 'chatCta.vitalsAgeUnit'
}
</script>

<template>
  <div
    v-if="actions.length"
    class="chat-cta-readonly"
    data-testid="chat-reply-actions-readonly"
  >
    <template
      v-for="(action, index) in actions"
      :key="`${action.type}-${index}`"
    >
      <div
        v-if="action.type === 'choose_option' || action.type === 'ask_goal'"
        class="chat-cta-readonly__block"
        data-testid="chat-cta-chips"
      >
        <div
          v-if="action.payload.options.length"
          class="chat-cta-readonly__chips"
        >
          <span
            v-for="option in action.payload.options"
            :key="option.code"
            class="chat-cta-readonly__chip"
            :class="ctaStatusClass(option.status)"
            :data-status="option.status"
            :data-testid="`chat-cta-chip-${option.code}`"
          >{{ option.label }}</span>
        </div>
        <div
          v-if="showConfirm(action)"
          class="chat-cta-readonly__confirm"
        >
          <span
            class="chat-cta-readonly__btn"
            :class="ctaStatusClass(confirmStatus(action))"
            :data-status="confirmStatus(action)"
            data-testid="chat-cta-confirm"
          >{{ $t('chatCta.confirm') }}</span>
        </div>
      </div>

      <div
        v-else-if="action.type === 'ask_vitals'"
        class="chat-cta-readonly__vitals"
        :class="[
          ctaStatusClass(action.payload.status),
          { 'is-empty': !action.payload.has_stored_value || action.payload.stored_value == null }
        ]"
        :data-status="action.payload.status"
        :data-has-stored-value="action.payload.has_stored_value ? '1' : '0'"
        data-testid="chat-cta-vitals"
        :aria-hidden="!action.payload.has_stored_value || action.payload.stored_value == null ? 'true' : undefined"
      >
        {{ vitalsText(action.payload) }}
      </div>

      <div
        v-else-if="action.type === 'whole'"
        class="chat-cta-readonly__confirm"
      >
        <span
          class="chat-cta-readonly__btn"
          :class="ctaStatusClass(action.payload.status)"
          :data-status="action.payload.status"
          :data-testid="`chat-cta-whole-${action.actionType}`"
        >{{ wholeButtonLabel(action) }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.chat-cta-readonly {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.chat-cta-readonly__block {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 0.5rem;
}

.chat-cta-readonly__chips {
  display: grid;
  width: 100%;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.chat-cta-readonly__chip,
.chat-cta-readonly__btn,
.chat-cta-readonly__vitals {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 2rem;
  border-radius: 0.375rem;
  border: 1px solid #7490ac;
  background: #fff;
  color: #42698e;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.25;
  text-align: center;
  user-select: none;
  pointer-events: none;
  cursor: default;
}

.chat-cta-readonly__chip {
  padding: 0.375rem 0.75rem;
}

.chat-cta-readonly__btn {
  height: 2rem;
  padding: 0 0.75rem;
  font-weight: 600;
}

.chat-cta-readonly__confirm {
  width: 100%;
}

.chat-cta-readonly__vitals {
  min-height: 2.5rem;
  padding: 0.625rem 0.875rem;
  border-radius: 0.875rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.chat-cta-readonly__chip.is-current,
.chat-cta-readonly__btn.is-current,
.chat-cta-readonly__vitals.is-current {
  background: #fff;
  border-color: #7490ac;
  color: #42698e;
}

.chat-cta-readonly__chip.is-on,
.chat-cta-readonly__btn.is-on,
.chat-cta-readonly__vitals.is-on {
  background: #f0f7fa;
  border: 1.5px solid #056487;
  color: #056487;
  font-weight: 600;
}

.chat-cta-readonly__chip.is-off,
.chat-cta-readonly__btn.is-off,
.chat-cta-readonly__vitals.is-off {
  background: #f1f4f7;
  border-color: #7490ac;
  color: #42698e;
}

.chat-cta-readonly__vitals.is-empty {
  min-height: 2.5rem;
  color: transparent;
}
</style>
