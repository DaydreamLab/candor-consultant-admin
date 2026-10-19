export function usePackagePlanLeaveGuard(
  dirty: Ref<boolean>,
  confirmMessage: () => string
) {
  function confirmLeave(): boolean {
    if (!import.meta.client || !dirty.value) {
      return true
    }
    return window.confirm(confirmMessage())
  }

  onBeforeRouteLeave(() => {
    if (!confirmLeave()) {
      return false
    }
  })

  if (import.meta.client) {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty.value) {
        return
      }
      event.preventDefault()
    }
    onMounted(() => {
      window.addEventListener('beforeunload', onBeforeUnload)
    })
    onUnmounted(() => {
      window.removeEventListener('beforeunload', onBeforeUnload)
    })
  }

  return { confirmLeave }
}
