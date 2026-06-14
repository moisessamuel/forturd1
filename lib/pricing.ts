/**
 * Calculate discounted price per ticket based on quantity purchased.
 * Volume discount tiers:
 * - 1-3: 100% (no discount)
 * - 4-9: ~83.33% (discount ~16.67%)
 * - 10+: ~66.67% (discount ~33.33%)
 */
export function getDiscountedPrice(
  basePrice: number,
  quantity: number
): number {
  const qty = Math.max(1, quantity)
  
  if (qty >= 10) {
    // 10+ boletos: 66.67% (200/300 for DOP, 3.33/5 for USD)
    return (basePrice * 2) / 3
  } else if (qty >= 4) {
    // 4-9 boletos: 83.33% (250/300 for DOP, 4.17/5 for USD)
    return (basePrice * 5) / 6
  } else {
    // 1-3 boletos: 100% (no discount)
    return basePrice
  }
}

/**
 * Calculate total amount for a purchase with volume discount.
 */
export function calculateTotalWithDiscount(
  basePrice: number,
  quantity: number
): number {
  const discountedPrice = getDiscountedPrice(basePrice, quantity)
  return discountedPrice * quantity
}
