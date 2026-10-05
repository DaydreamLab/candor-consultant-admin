export type PackagePlanBudget = {
  dailyBudget: number
  remainder: number
}

/** Daily pick budget used by composition: floor(price / days); remainder is unspendable. */
export function packagePlanBudget(price: number, periodDays: number): PackagePlanBudget | null {
  if (!Number.isFinite(price) || !Number.isFinite(periodDays) || periodDays <= 0) {
    return null
  }
  const days = Math.trunc(periodDays)
  const amount = Math.trunc(price)
  if (days <= 0 || amount < 0) {
    return null
  }
  return {
    dailyBudget: Math.floor(amount / days),
    remainder: amount % days
  }
}
