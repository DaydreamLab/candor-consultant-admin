export default defineNuxtPlugin(() => {
  const session = useSessionStore()

  function bump() {
    void session.slideIfActive()
  }

  window.addEventListener('pointerdown', bump, { passive: true })
  window.addEventListener('keydown', bump)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      bump()
    }
  })
  window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      bump()
    }
  }, 60_000)
})
