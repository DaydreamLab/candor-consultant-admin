import { describe, expect, it } from 'vitest'
import {
  AdminApiError,
  EXPERT_CASE_ALREADY_FINALIZED_CODE,
  EXPERT_PLAN_FIELD_FORBIDDEN_CODE,
  REFUND_REQUEST_PENDING_CODE,
  isExpertCaseAlreadyFinalizedError,
  isExpertPlanFieldForbiddenError,
  isRefundRequestPendingError
} from './admin-api'

describe('expert-plan API error codes (core #143)', () => {
  it('detects expert_case_already_finalized', () => {
    expect(isExpertCaseAlreadyFinalizedError(
      new AdminApiError(409, '這個案件已由其他專家定稿', EXPERT_CASE_ALREADY_FINALIZED_CODE)
    )).toBe(true)
    expect(isExpertCaseAlreadyFinalizedError(new AdminApiError(409, '', ''))).toBe(true)
    expect(isExpertCaseAlreadyFinalizedError(new AdminApiError(400, '', ''))).toBe(false)
  })

  it('detects expert_plan_field_forbidden', () => {
    expect(isExpertPlanFieldForbiddenError(
      new AdminApiError(403, '', EXPERT_PLAN_FIELD_FORBIDDEN_CODE)
    )).toBe(true)
    expect(isExpertPlanFieldForbiddenError(new AdminApiError(403, '', 'other'))).toBe(false)
  })

  it('detects refund_request_pending', () => {
    expect(isRefundRequestPendingError(
      new AdminApiError(409, '', REFUND_REQUEST_PENDING_CODE)
    )).toBe(true)
  })
})
