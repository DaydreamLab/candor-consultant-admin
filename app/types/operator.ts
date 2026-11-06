export type OperatorRole = 'expert' | 'ops' | 'admin'

export type OperatorStatus = 'active' | 'suspended'

export interface Operator {
  id: string
  /**
   * Operator 角色集合（core `roles TEXT[]`）。
   * 非空、去重；合法值 `expert`｜`ops`｜`admin`。
   * `admin` 在權限上含 expert 與 ops 能力。
   */
  roles: OperatorRole[]
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
