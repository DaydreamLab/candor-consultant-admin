<script setup lang="ts">
import { AdminApiError } from '~/utils/admin-api'
import {
  needsPrivacyConsent,
  writeConsentedPrivacyVersion
} from '~/utils/cookie-consent'
import { getPublicPrivacyPolicy } from '~/utils/privacy-policy-api'

const config = useRuntimeConfig()
const localePath = useLocalePath()

const visible = ref(false)
const policyVersion = ref<number | null>(null)
const loading = ref(false)

if (import.meta.client) {
  void refreshConsent()
}

async function refreshConsent() {
  loading.value = true
  try {
    const policy = await getPublicPrivacyPolicy(config.public.apiBase)
    policyVersion.value = policy.version
    visible.value = needsPrivacyConsent(policy.version)
  } catch (err) {
    // Fail closed on network/API errors: do not block the app with a broken banner.
    if (err instanceof AdminApiError) {
      visible.value = false
    }
    visible.value = false
  } finally {
    loading.value = false
  }
}

function accept() {
  if (policyVersion.value === null) {
    return
  }
  writeConsentedPrivacyVersion(policyVersion.value)
  visible.value = false
}
</script>

<template>
  <div
    v-if="visible && !loading"
    class="fixed inset-x-0 bottom-0 z-50 border-t border-default bg-elevated/95 p-4 shadow-lg backdrop-blur sm:p-5"
    role="dialog"
    aria-live="polite"
    data-testid="cookie-consent-banner"
  >
    <div class="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-default">
        {{ $t('cookieConsent.message') }}
        <NuxtLink
          class="font-medium text-primary underline underline-offset-2"
          :to="localePath('/privacy-policy')"
          data-testid="cookie-consent-privacy-link"
        >
          {{ $t('cookieConsent.privacyLink') }}
        </NuxtLink>
      </p>
      <UButton
        color="primary"
        size="sm"
        class="shrink-0 self-end sm:self-auto"
        data-testid="cookie-consent-accept"
        @click="accept"
      >
        {{ $t('cookieConsent.accept') }}
      </UButton>
    </div>
  </div>
</template>
