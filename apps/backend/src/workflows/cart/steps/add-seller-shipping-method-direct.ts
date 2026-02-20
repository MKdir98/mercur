import {
  ContainerRegistrationKeys,
  Modules
} from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

type AddSellerShippingMethodDirectInput = {
  cart_id: string
  option_id: string
  option_data?: Record<string, unknown>
}

export const addSellerShippingMethodDirectStep = createStep(
  'add-seller-shipping-method-direct',
  async (input: AddSellerShippingMethodDirectInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const cartModule = container.resolve(Modules.CART)
    const fulfillmentModule = container.resolve(Modules.FULFILLMENT)

    const {
      data: [cart]
    } = await query.graph({
      entity: 'cart',
      fields: [
        'id',
        'items.*',
        'items.variant.id',
        'items.variant.weight',
        'items.variant.length',
        'items.variant.height',
        'items.variant.width',
        'items.product.id',
        'shipping_address.*',
        'region_id',
        'currency_code',
        'sales_channel_id',
        'shipping_methods.*'
      ],
      filters: { id: input.cart_id }
    })

    if (!cart) {
      throw new Error(`Cart ${input.cart_id} not found`)
    }

    const {
      data: [shippingOption]
    } = await query.graph({
      entity: 'shipping_option',
      fields: [
        'id',
        'name',
        'price_type',
        'provider_id',
        'data',
        'service_zone_id',
        'service_zone.fulfillment_set_id'
      ],
      filters: { id: input.option_id }
    })

    if (!shippingOption) {
      throw new Error(`Shipping option ${input.option_id} not found`)
    }

    const serviceZone = (shippingOption as Record<string, unknown>)
      .service_zone as { fulfillment_set_id?: string } | undefined
    const fulfillmentSetId = serviceZone?.fulfillment_set_id
    if (!fulfillmentSetId) {
      throw new Error(
        `Shipping option ${input.option_id} has no fulfillment set`
      )
    }

    const {
      data: [fulfillmentSet]
    } = await query.graph({
      entity: 'fulfillment_set',
      fields: ['id', 'location.id', 'location.name', 'location.address.*'],
      filters: { id: fulfillmentSetId }
    })

    const stockLocation = (fulfillmentSet as Record<string, unknown>)
      ?.location as { id?: string; name?: string; address?: unknown } | undefined

    if (!stockLocation?.address) {
      throw new Error(
        `Stock location for fulfillment set ${fulfillmentSetId} not found or has no address`
      )
    }

    const fromLocation = {
      id: stockLocation.id ?? '',
      name: stockLocation.name ?? '',
      address: stockLocation.address
    }

    const context = {
      ...cart,
      from_location: fromLocation
    }

    const optionData =
      ((shippingOption as Record<string, unknown>).data ?? {}) as Record<
        string,
        unknown
      >
    const methodData = {
      ...(input.option_data ?? {}),
      cart_id: input.cart_id
    } as Record<string, unknown>

    const providerId = (shippingOption as Record<string, unknown>)
      .provider_id as string
    if (!providerId) {
      throw new Error(
        `Shipping option ${input.option_id} has no provider_id`
      )
    }

    await fulfillmentModule.validateFulfillmentData(
      providerId,
      optionData,
      methodData,
      context as unknown as Parameters<typeof fulfillmentModule.validateFulfillmentData>[3]
    )

    const priceType = (shippingOption as Record<string, unknown>)
      .price_type as string
    let amount: number
    let isTaxInclusive: boolean

    if (priceType === 'flat') {
      const {
        data: [priceData]
      } = await query.graph({
        entity: 'shipping_option',
        fields: [
          'id',
          'prices.*',
          'prices.price_set_id',
          'prices.price_rules.*'
        ],
        filters: { id: input.option_id }
      })

      const prices = (priceData as Record<string, unknown>)?.prices as Array<{
        amount: number
        currency_code?: string
      }>
      const regionPrice = prices?.find(
        (p) =>
          (p as Record<string, unknown>).region_id === cart.region_id
      )
      const currencyPrice = prices?.find(
        (p) => p.currency_code === cart.currency_code
      )
      const price = regionPrice ?? currencyPrice ?? prices?.[0]
      if (!price?.amount) {
        throw new Error(
          `Shipping option ${input.option_id} has no price for region ${cart.region_id} or currency ${cart.currency_code}`
        )
      }
      amount = price.amount
      isTaxInclusive = false
    } else {
      const [calculatedPrice] =
        await fulfillmentModule.calculateShippingOptionsPrices([
          {
            id: shippingOption.id,
            provider_id: providerId,
            optionData,
            data: methodData,
            context: {
              ...context,
              from_location: fromLocation
            } as unknown as Parameters<typeof fulfillmentModule.calculateShippingOptionsPrices>[0][0]['context']
          }
        ])
      if (!calculatedPrice?.calculated_amount) {
        throw new Error(
          `Could not calculate price for shipping option ${input.option_id}`
        )
      }
      amount = calculatedPrice.calculated_amount
      isTaxInclusive = !!calculatedPrice.is_calculated_price_tax_inclusive
    }

    const shippingMethods = (cart.shipping_methods ?? []).filter(Boolean)
    const currentMethodIds = shippingMethods.map((m) => (m as { id: string }).id)

    if (currentMethodIds.length > 0) {
      await cartModule.deleteShippingMethods(currentMethodIds)
    }

    const [createdMethod] = await cartModule.addShippingMethods([
      {
        shipping_option_id: shippingOption.id,
        cart_id: input.cart_id,
        name: (shippingOption as Record<string, unknown>).name as string,
        amount,
        data: {}
      } as never
    ])

    return new StepResponse(
      { createdMethodIds: [createdMethod.id] },
      { createdMethodIds: [createdMethod.id] }
    )
  },
  async (compensation, { container }) => {
    if (!compensation?.createdMethodIds?.length) return
    const cartModule = container.resolve(Modules.CART)
    await cartModule.deleteShippingMethods(compensation.createdMethodIds)
  }
)
