export function useOpsFeedback() {
  const { t } = useI18n()
  const toast = useToast()
  const { platform } = useOrgScope()

  function notify(options: {
    title: string
    description?: string
    color?: 'success' | 'warning' | 'error' | 'neutral'
  }) {
    toast.add({
      title: options.title,
      description: options.description,
      color: options.color ?? 'success',
      progress: false,
      duration: 2500
    })
  }

  function saved(target?: string) {
    notify({
      title: t('actions.saved'),
      description: target
    })
  }

  function deleted(target?: string) {
    notify({
      title: t('actions.deleted'),
      description: target
    })
  }

  function blocked() {
    notify({
      title: t('actions.readOnly'),
      color: 'warning'
    })
  }

  function warned(title: string, description?: string) {
    notify({
      title,
      description,
      color: 'warning'
    })
  }

  function auditNote() {
    if (platform.value) {
      return
    }
  }

  return { saved, deleted, blocked, warned, notify, auditNote }
}
