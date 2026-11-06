import { canViewExpertBookingProduct } from '~/utils/expert-booking-product-access'

function isExpertBookingProductPath(path: string) {
  const stripped = path.replace(/^\/en(?=\/|$)/, '') || '/'
  return stripped === '/expert-booking-product' || stripped.startsWith('/expert-booking-product/')
}

export default defineNuxtRouteMiddleware((to) => {
  if (!isExpertBookingProductPath(to.path)) {
    return
  }

  const session = useSessionStore()
  const localePath = useLocalePath()
  if (!canViewExpertBookingProduct(session.operator?.role)) {
    return navigateTo(localePath('/expert-bookings'))
  }
})
