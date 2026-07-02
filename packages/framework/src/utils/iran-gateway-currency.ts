import { MedusaError } from '@medusajs/framework/utils'

const toNumber = (val: unknown): number => {
  if (val == null) return 0
  if (typeof val === 'number') return val
  if (typeof val === 'object' && val !== null && 'numeric_' in val)
    return (val as { numeric_?: number }).numeric_ ?? 0
  if (
    typeof val === 'object' &&
    val !== null &&
    typeof (val as { toNumber?: () => number }).toNumber === 'function'
  )
    return (val as { toNumber: () => number }).toNumber()
  return Number(val) || 0
}

/**
 * Shared USD<->IRR rate for every Iran domestic gateway (zarinpal/sep/parsian)
 * and remitation. Deliberately reuses REMITATION_RIAL_PER_USD instead of a
 * per-gateway rate so all gateways convert consistently.
 */
export function getIranGatewayRialPerUsdRate(): number | undefined {
  const raw = process.env.REMITATION_RIAL_PER_USD
  if (!raw) return undefined
  const n = parseFloat(raw)
  return n > 0 ? n : undefined
}

/**
 * Resolves the Rial amount to send to an Iran domestic gateway (zarinpal/sep/parsian)
 * for a cart whose currency is either irr or usd. Throws for any other currency
 * instead of silently sending a foreign-currency amount as if it were Rial.
 */
export function computeIranGatewayRialAmount(
  gatewayName: string,
  fallbackAmount: number,
  currencyCode: string | undefined,
  cart: Record<string, unknown> | undefined
): number {
  const cc = (currencyCode || '').toLowerCase()

  if (cc === 'irr') {
    if (cart && typeof cart === 'object') {
      const itemSubtotal = toNumber(cart.item_subtotal)
      const shippingTotal = toNumber(cart.shipping_total)
      const taxTotal = toNumber(cart.tax_total)
      const computedAmount = itemSubtotal + shippingTotal + taxTotal
      if (computedAmount > 0) {
        return computedAmount
      }
    }
    return fallbackAmount
  }

  if (cc === 'usd') {
    const rate = getIranGatewayRialPerUsdRate()
    if (!rate) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `REMITATION_RIAL_PER_USD is required to convert USD carts for the ${gatewayName} gateway`
      )
    }
    const usdMajor = fallbackAmount / 100
    return Math.round(usdMajor * rate)
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `${gatewayName} gateway does not support cart currency: ${currencyCode}`
  )
}
