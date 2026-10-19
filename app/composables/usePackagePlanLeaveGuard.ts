export function usePackagePlanLeaveGuard(
  dirty: Ref<boolean>,
  confirmMessage: () => string
) {
  const skipNextLeaveConfirm = ref(false)

  function confirmLeave(): boolean {
    if (!import.meta.client || !dirty.value) {
      return true
    }
    return window.confirm(confirmMessage())
  }

  function allowNavigationWithoutConfirm() {
    skipNextLeaveConfirm.value = true
  }

  onBeforeRouteLeave(() => {
    if (skipNextLeaveConfirm.value) {
      skipNextLeaveConfirm.value = false
      return
    }
    if (!dirty.value) {
      return
    }
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

  return { confirmLeave, allowNavigationWithoutConfirm }
}
