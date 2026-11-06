export type OperatorRole = 'expert' | 'ops' | 'admin'

export type OperatorStatus = 'active' | 'suspended'

export interface Operator {
  id: string
  /** Primary role from core login（單一 role 契約）。 */
  role: OperatorRole
  /**
   * Optional multi-role set. When present, access guards use this instead of
   * only `role`. Core 目前多半只回 `role`；雙角色帳號可帶 `roles`。
   */
  roles?: OperatorRole[]
  email: string
  name: string
  status: OperatorStatus | null
  last_login_at: string | null
}

export interface OperatorLoginData {
  token: string
  expires_in: number
  operator: Operator
}

export interface AdminSuccess<T> {
  status: 'success'
  data: T
}

export interface AdminFailure {
  status: 'failed'
  error_message: string
  error_code?: string | number | null
  error_data?: Record<string, unknown> | null
}
