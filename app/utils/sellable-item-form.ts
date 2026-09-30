export function isBottlePriceSaveError(message: string) {
  return /bottle_price/i.test(message)
}
