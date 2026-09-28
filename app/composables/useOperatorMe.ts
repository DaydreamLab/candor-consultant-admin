import { AdminApiError, adminGetMe } from '~/utils/admin-api'
import { readOperatorToken } from '~/utils/operator-session'

let request: { operatorId: string, promise: Promise<void> } | null = null

export function useOperatorMe(options?: { refresh?: boolean }) {
  const config = useRuntimeConfig()
  const session = useSessionStore()
  const { t } = useI18n()

  const me = useState<Record<string, unknown> | null>('candor-operator-me', () => null)
  const meOperatorId = useState<string | null>('candor-operator-me-operator-id', () => null)
  const pending = useState('candor-operator-me-pending', () => false)
  const errorKind = useState<'none' | 'failed' | 'api'>('candor-operator-me-error-kind', () => 'none')
  const apiError = useState('candor-operator-me-api-error', () => '')

  const errorMessage = computed(() => {
    if (meOperatorId.value !== (session.operator?.id ?? null)) {
      return ''
    }
    if (errorKind.value === 'api' && apiError.value.trim()) {
      return apiError.value
    }
    if (errorKind.value === 'failed' || errorKind.value === 'api') {
      return t('operatorMe.failed')
    }
    return ''
  })

  const displayName = computed(() => {
    if (meOperatorId.value === session.operator?.id) {
      const apiName = me.value?.name
      if (typeof apiName === 'string' && apiName.trim()) {
        return apiName
      }
    }
    return session.operator?.name ?? ''
  })

  function refresh() {
    const operatorId = session.operator?.id
    if (!operatorId || !import.meta.client) {
      return Promise.resolve()
    }
    if (request?.operatorId === operatorId) {
      return request.promise
    }
    const promise = load(operatorId).finally(() => {
      if (request?.promise === promise) {
        request = null
      }
    })
    request = { operatorId, promise }
    return promise
  }

  async function load(operatorId: string) {
    const token = readOperatorToken()
    if (!token) {
      if ((session.operator?.id ?? null) !== operatorId) {
        return
      }
      me.value = null
      meOperatorId.value = operatorId
      errorKind.value = 'failed'
      apiError.value = ''
      pending.value = false
      return
    }

    pending.value = true
    errorKind.value = 'none'
    apiError.value = ''
    try {
      const data = await adminGetMe(config.public.apiBase, token)
      if ((session.operator?.id ?? null) !== operatorId) {
        return
      }
      me.value = data
      meOperatorId.value = operatorId
      errorKind.value = 'none'
      apiError.value = ''
    } catch (error) {
      if ((session.operator?.id ?? null) !== operatorId) {
        return
      }
      meOperatorId.value = operatorId
      apiError.value = error instanceof AdminApiError ? error.message : ''
      errorKind.value = apiError.value.trim() ? 'api' : 'failed'
    } finally {
      if ((session.operator?.id ?? null) === operatorId) {
        pending.value = false
      }
    }
  }

  watch(() => session.operator?.id ?? null, (id, previous) => {
    if (id === previous) {
      return
    }
    me.value = null
    meOperatorId.value = null
    errorKind.value = 'none'
    apiError.value = ''
    pending.value = false
    if (id) {
      void refresh()
    }
  })

  if (import.meta.client && session.isLoggedIn && (options?.refresh || !me.value)) {
    void refresh()
  }

  return {
    me,
    pending,
    errorMessage,
    displayName
  }
}
