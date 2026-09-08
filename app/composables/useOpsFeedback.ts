export function useOpsFeedback() {
  const { t } = useI18n()
  const toast = useToast()
  const { platform } = useOrgScope()

  function saved(target?: string) {
    toast.add({
      title: t('actions.saved'),
      description: target,
      color: 'success'
    })
  }

  function deleted(target?: string) {
    toast.add({
      title: t('actions.deleted'),
      description: target,
      color: 'success'
    })
  }

  function blocked() {
    toast.add({
      title: t('actions.readOnly'),
      color: 'warning'
    })
  }

  function warned(title: string, description?: string) {
    toast.add({
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

  return { saved, deleted, blocked, warned, auditNote }
}
