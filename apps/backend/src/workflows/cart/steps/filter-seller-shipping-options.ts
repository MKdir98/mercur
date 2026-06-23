import { ShippingOptionDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import sellerProduct from '../../../links/seller-product'
import sellerShippingOption from '../../../links/seller-shipping-option'

export type SellerShippingOptionMeta = {
  shipping_option_id: string
  seller_id: string
  seller_name: string
}

export type GetSellerShippingOptionIdsOutput = {
  cart_id: string
  option_ids: string[]
  seller_options: SellerShippingOptionMeta[]
}

export const getSellerShippingOptionIdsStep = createStep(
  'get-seller-shipping-option-ids',
  async (
    input: { cart_id: string; is_return: boolean },
    { container }
  ): Promise<StepResponse<GetSellerShippingOptionIdsOutput>> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const {
      data: [cart]
    } = await query.graph({
      entity: 'cart',
      fields: ['items.product_id'],
      filters: {
        id: input.cart_id
      }
    })

    if (!cart?.items?.length) {
      return new StepResponse({
        cart_id: input.cart_id,
        option_ids: [],
        seller_options: []
      })
    }

    const productIds = cart.items.filter(Boolean).map((i) => i!.product_id)
    console.log('🔍 [STEP:getSellerShippingOptionIds] productIds:', productIds)

    const { data: sellersInCart } = await query.graph({
      entity: sellerProduct.entryPoint,
      fields: ['seller_id'],
      filters: {
        product_id: productIds
      }
    })
    console.log(
      '🔍 [STEP:getSellerShippingOptionIds] sellersInCart raw:',
      JSON.stringify(sellersInCart)
    )

    const uniqueSellersInCart = [
      ...new Set(sellersInCart.map((s) => s.seller_id))
    ]
    console.log(
      '🔍 [STEP:getSellerShippingOptionIds] uniqueSellersInCart:',
      uniqueSellersInCart
    )

    const { data: sellerShippingOptions } = await query.graph({
      entity: sellerShippingOption.entryPoint,
      fields: ['shipping_option_id', 'seller.name', 'seller.id'],
      filters: {
        seller_id: uniqueSellersInCart
      }
    })
    console.log(
      '🔍 [STEP:getSellerShippingOptionIds] sellerShippingOptions raw:',
      JSON.stringify(sellerShippingOptions)
    )

    const option_ids = sellerShippingOptions.map((so) => so.shipping_option_id)
    const seller_options: SellerShippingOptionMeta[] =
      sellerShippingOptions.map((so) => ({
        shipping_option_id: so.shipping_option_id,
        seller_id: so.seller.id,
        seller_name: so.seller.name
      }))
    console.log(
      '🔍 [STEP:getSellerShippingOptionIds] result → option_ids:',
      option_ids,
      'seller_options:',
      JSON.stringify(seller_options)
    )

    return new StepResponse({
      cart_id: input.cart_id,
      option_ids,
      seller_options
    })
  }
)

export const filterSellerShippingOptionsStep = createStep(
  'filter-seller-shipping-options',
  async (
    input: {
      shipping_options: ShippingOptionDTO[]
      cart_id: string
      seller_options: SellerShippingOptionMeta[]
    },
    { container }
  ) => {
    console.log(
      '🔍 [STEP:filterSellerShippingOptions] input.shipping_options count:',
      input.shipping_options?.length ?? 0
    )
    console.log(
      '🔍 [STEP:filterSellerShippingOptions] input.seller_options:',
      JSON.stringify(input.seller_options)
    )

    let optionsToUse: ShippingOptionDTO[] = input.shipping_options ?? []

    if (!optionsToUse.length && input.seller_options?.length) {
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const optionIds = input.seller_options.map((o) => o.shipping_option_id)
      console.log(
        '🔍 [STEP:filterSellerShippingOptions] medusa returned 0 — fallback query for optionIds:',
        optionIds
      )
      const { data: fallbackOptions } = await query.graph({
        entity: 'shipping_option',
        fields: [
          'id',
          'name',
          'price_type',
          'provider_id',
          '*prices',
          '*shipping_option_type'
        ],
        filters: { id: optionIds }
      })
      console.log(
        '🔍 [STEP:filterSellerShippingOptions] fallback results:',
        JSON.stringify(fallbackOptions)
      )
      optionsToUse = (fallbackOptions ?? []) as unknown as ShippingOptionDTO[]
    }

    if (!optionsToUse.length) {
      console.log(
        '🔍 [STEP:filterSellerShippingOptions] FINAL: empty — returning []'
      )
      return new StepResponse([])
    }

    const optionsAvailable = optionsToUse.map((option) => {
      const relation = input.seller_options.find(
        (o) => o.shipping_option_id === option.id
      )
      return {
        ...option,
        seller_name: relation?.seller_name ?? '',
        seller_id: relation?.seller_id ?? ''
      }
    })

    console.log(
      '🔍 [STEP:filterSellerShippingOptions] FINAL options:',
      optionsAvailable.map((o) => ({
        id: o.id,
        seller_id: o.seller_id,
        seller_name: o.seller_name
      }))
    )
    return new StepResponse(optionsAvailable)
  }
)
