import { canManageUsers, canWrite, isPlatformRole } from '~/types/admin'

export function useOrgScope() {
  const session = useSessionStore()
  const ops = useOpsStore()
  const { t, locale } = useI18n()

  const platform = computed(() => {
    const role = session.role
    return role ? isPlatformRole(role) : false
  })

  const writable = computed(() => canWrite(session.role ?? 'platform_viewer'))
  const usersWritable = computed(() => canManageUsers(session.role ?? 'platform_viewer'))
  const showOrg = computed(() => platform.value)

  function scoped<T extends { orgId: string | null }>(rows: T[]) {
    const user = session.session
    if (!user) {
      return []
    }
    if (isPlatformRole(user.role) || !user.orgId) {
      return rows
    }
    return rows.filter(row => row.orgId === user.orgId)
  }

  function orgLabel(orgId: string | null | undefined) {
    if (!orgId) {
      return t('brand')
    }
    const org = ops.orgs.find(item => item.id === orgId)
    if (!org) {
      return orgId
    }
    return locale.value === 'en' ? org.nameEn : org.name
  }

  function orgOptions() {
    const user = session.session
    const list = user && !isPlatformRole(user.role) && user.orgId
      ? ops.orgs.filter(org => org.id === user.orgId)
      : ops.orgs
    return list.map(org => ({
      label: locale.value === 'en' ? org.nameEn : org.name,
      value: org.id
    }))
  }

  function currentOrg() {
    const orgId = session.session?.orgId
    return orgId ? ops.orgs.find(org => org.id === orgId) : undefined
  }

  return {
    platform,
    writable,
    usersWritable,
    showOrg,
    scoped,
    orgLabel,
    orgOptions,
    currentOrg
  }
}
