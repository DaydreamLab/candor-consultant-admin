import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminApiError } from './admin-api'
import {
  adminCreateOperator,
  adminGetOperator,
  adminListOperators,
  adminPatchOperator,
  adminResetOperatorPassword
} from './operators-api'

const fetchMock = vi.fn()

vi.stubGlobal('$fetch', fetchMock)

afterEach(() => {
  fetchMock.mockReset()
})

const sample = {
  id: 'op-1',
  email: 'admin@example.com',
  name: '管理員',
  roles: ['expert', 'admin'],
  status: 'active',
  last_login_at: '2026-11-01T00:00:00Z',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z'
}

describe('operators-api', () => {
  it('lists operators and sorts roles admin→ops→expert', async () => {
    fetchMock.mockResolvedValue({
      status: 'success',
      data: { operators: [sample] }
    })
    const rows = await adminListOperators('https://example.test/api/v1', 'tok')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/api/v1/admin/operators',
      expect.objectContaining({
        headers: { Authorization: 'Bearer tok' }
      })
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]!.roles).toEqual(['admin', 'expert'])
  })

  it('gets one operator', async () => {
    fetchMock.mockResolvedValue({ status: 'success', data: sample })
    const row = await adminGetOperator('https://example.test/api/v1', 'tok', 'op-1')
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://example.test/api/v1/admin/operators/op-1'
    )
    expect(row.id).toBe('op-1')
    expect(row.roles).toEqual(['admin', 'expert'])
  })

  it('creates operator with sorted roles', async () => {
    fetchMock.mockResolvedValue({
      status: 'success',
      data: { ...sample, id: 'op-2', roles: ['ops', 'expert'] }
    })
    const created = await adminCreateOperator('https://example.test/api/v1', 'tok', {
      email: 'dual@example.com',
      name: '雙角色',
      roles: ['expert', 'ops'],
      password: 'StrongPass1!'
    })
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({
      method: 'POST',
      body: {
        email: 'dual@example.com',
        name: '雙角色',
        roles: ['ops', 'expert'],
        password: 'StrongPass1!'
      }
    })
    expect(created.roles).toEqual(['ops', 'expert'])
  })

  it('patches operator and maps 409 cannot_modify_self', async () => {
    fetchMock.mockRejectedValue({
      statusCode: 409,
      data: {
        status: 'failed',
        error_message: 'cannot modify self',
        error_code: 'cannot_modify_self'
      }
    })
    await expect(
      adminPatchOperator('https://example.test/api/v1', 'tok', 'op-1', {
        roles: ['ops']
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'cannot_modify_self'
    })
  })

  it('maps 409 cannot_remove_last_admin and 422 invalid_request', async () => {
    fetchMock.mockRejectedValueOnce({
      statusCode: 409,
      data: {
        status: 'failed',
        error_message: 'last admin',
        error_code: 'cannot_remove_last_admin'
      }
    })
    await expect(
      adminPatchOperator('https://example.test/api/v1', 'tok', 'op-1', {
        roles: ['ops']
      })
    ).rejects.toBeInstanceOf(AdminApiError)

    fetchMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        status: 'failed',
        error_message: 'invalid',
        error_code: 'invalid_request'
      }
    })
    await expect(
      adminCreateOperator('https://example.test/api/v1', 'tok', {
        email: 'x@example.com',
        name: 'x',
        roles: [],
        password: 'weak'
      })
    ).rejects.toMatchObject({
      statusCode: 422,
      code: 'invalid_request'
    })
  })

  it('resets password', async () => {
    fetchMock.mockResolvedValue({
      status: 'success',
      data: { id: 'op-1', status: 'password_reset' }
    })
    const result = await adminResetOperatorPassword(
      'https://example.test/api/v1',
      'tok',
      'op-1',
      'NewStrongPass1!'
    )
    expect(result).toEqual({ id: 'op-1', status: 'password_reset' })
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://example.test/api/v1/admin/operators/op-1/password'
    )
  })
})
