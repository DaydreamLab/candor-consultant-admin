import type {
  AccountStatus,
  CaseStatus,
  InvoiceStatus,
  LabStatus,
  PlanId,
  Role,
  ShipStatus
} from '~/types/admin'

export function useSelectOptions() {
  const { t } = useI18n()
  const { platform } = useOrgScope()

  function items<T extends string>(values: T[], prefix: string) {
    return values.map(value => ({
      label: t(`${prefix}.${value}`),
      value
    }))
  }

  const planOptions = computed(() => items<PlanId>(['basic', 'mid', 'premium'], 'plan'))
  const caseStatusOptions = computed(() => items<CaseStatus>([
    'received',
    'lab_pending',
    'lab_scheduled',
    'awaiting_report',
    'progress_due',
    'keyin_due',
    'ship_due',
    'shipped',
    'invoice_due',
    'invoiced'
  ], 'status'))
  const labStatusOptions = computed(() => items<LabStatus>([
    'unscheduled',
    'scheduled',
    'awaiting_report',
    'report_ready'
  ], 'status'))
  const shipStatusOptions = computed(() => items<ShipStatus>([
    'picking',
    'labeling',
    'in_transit',
    'delivered'
  ], 'status'))
  const invoiceStatusOptions = computed(() => items<InvoiceStatus>(['draft', 'sent', 'paid'], 'status'))
  const accountStatusOptions = computed(() => items<AccountStatus>(['active', 'invited'], 'status'))

  const staffRoleOptions = computed(() => {
    const roles: Role[] = platform.value
      ? ['platform_viewer', 'platform_assist', 'consultant_admin', 'consultant_ops']
      : ['consultant_admin', 'consultant_ops']
    return roles.map(value => ({
      label: t(`login.roles.${value}`),
      value
    }))
  })

  return {
    planOptions,
    caseStatusOptions,
    labStatusOptions,
    shipStatusOptions,
    invoiceStatusOptions,
    accountStatusOptions,
    staffRoleOptions
  }
}
