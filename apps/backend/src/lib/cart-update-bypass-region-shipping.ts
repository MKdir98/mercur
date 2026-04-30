import type { MedusaContainer } from '@medusajs/framework'
import { refreshCartItemsWorkflowId } from '@medusajs/core-flows'
import { Modules } from '@medusajs/framework/utils'

function isCartShippingCountryOutsideRegionError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : String(error)
  return msg.includes('not within region')
}

function shouldLogCrossRegionCart(): boolean {
  return process.env.LOG_CROSS_REGION_CART === 'true'
}

function buildCartModuleUpdateData(
  input: Record<string, unknown>
): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  const keys = [
    'region_id',
    'customer_id',
    'sales_channel_id',
    'email',
    'currency_code',
    'metadata',
    'shipping_address',
    'billing_address',
  ] as const
  for (const key of keys) {
    if (input[key] !== undefined) {
      data[key] = input[key]
    }
  }
  return data
}

export async function runUpdateCartWorkflowOrBypassForExtraShippingCountries(
  container: MedusaContainer,
  updateCartWorkflowId: string,
  input: Record<string, unknown>,
  allowBypassForShippingCountry: boolean
): Promise<void> {
  const we = container.resolve(Modules.WORKFLOW_ENGINE)
  try {
    await we.run(updateCartWorkflowId, {
      input,
      transactionId: 'cart-update-' + String(input.id),
    })
  } catch (error) {
    if (
      !allowBypassForShippingCountry ||
      !isCartShippingCountryOutsideRegionError(error)
    ) {
      throw error
    }
    if (shouldLogCrossRegionCart()) {
      console.warn('[cart] updateCartWorkflow failed on region/shipping country; using cart module + refresh', {
        cartId: input.id,
        shipping_country: (input.shipping_address as { country_code?: string } | undefined)?.country_code,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    const cartModule = container.resolve(Modules.CART)
    const cartId = String(input.id)
    const { promo_codes, additional_data: _a, id: _i, ...rest } = input
    const moduleData = buildCartModuleUpdateData(rest)
    await cartModule.updateCarts(cartId, moduleData as never)
    await we.run(refreshCartItemsWorkflowId, {
      input: {
        cart_id: cartId,
        promo_codes: Array.isArray(promo_codes) ? promo_codes : undefined,
        force_refresh: moduleData.region_id !== undefined,
      },
      transactionId: 'refresh-after-shipping-bypass-' + cartId + '-' + Date.now(),
    })
  }
}
