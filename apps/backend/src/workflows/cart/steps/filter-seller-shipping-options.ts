import { ShippingOptionDTO } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import sellerProduct from '../../../links/seller-product'
import sellerShippingOption from '../../../links/seller-shipping-option'

export const filterSellerShippingOptionsStep = createStep(
  'filter-seller-shipping-options',
  async (
    input: { shipping_options: ShippingOptionDTO[]; cart_id: string },
    { container }
  ) => {
    console.log('🟩 [FILTER_STEP] Starting - cart_id:', input.cart_id)
    console.log('🟩 [FILTER_STEP] Input shipping options:', input.shipping_options?.length || 0)
    console.log('🟩 [FILTER_STEP] Input option IDs:', input.shipping_options?.map(o => o.id) || [])
    
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const {
      data: [cart]
    } = await query.graph({
      entity: 'cart',
      fields: ['items.product_id', 'shipping_methods.shipping_option_id'],
      filters: {
        id: input.cart_id
      }
    })

    console.log('🟩 [FILTER_STEP] Cart items count:', cart.items?.length || 0)
    console.log('🟩 [FILTER_STEP] Existing shipping methods:', cart.shipping_methods?.length || 0)

    if (!cart.items || cart.items.length === 0) {
      console.log('⚠️  [FILTER_STEP] No items in cart - returning empty array')
      return new StepResponse([])
    }

    const { data: sellersInCart } = await query.graph({
      entity: sellerProduct.entryPoint,
      fields: ['seller_id'],
      filters: {
        product_id: cart.items.map((i) => i.product_id)
      }
    })

    const uniqueSellersInCart = [...new Set(sellersInCart.map((s) => s.seller_id))]
    console.log('🟩 [FILTER_STEP] Sellers in cart:', uniqueSellersInCart)

    const existingShippingOptions = cart.shipping_methods.map(
      (sm) => sm.shipping_option_id
    )

    console.log('🟩 [FILTER_STEP] Existing shipping option IDs:', existingShippingOptions)

    console.log('🟩 [FILTER_STEP] Getting shipping options for all sellers in cart')

    const { data: sellerShippingOptions } = await query.graph({
      entity: sellerShippingOption.entryPoint,
      fields: ['shipping_option_id', 'seller.name', 'seller.id'],
      filters: {
        seller_id: uniqueSellersInCart
      }
    })

    console.log('🟩 [FILTER_STEP] Seller shipping options found:', sellerShippingOptions.length)
    console.log('🟩 [FILTER_STEP] Seller shipping option IDs:', sellerShippingOptions.map(so => so.shipping_option_id))

    const applicableShippingOptions = sellerShippingOptions.map(
      (so) => so.shipping_option_id
    )

    console.log('🟩 [FILTER_STEP] Applicable shipping option IDs:', applicableShippingOptions)

    const optionsAvailable = input.shipping_options
      .filter((option) => applicableShippingOptions.includes(option.id))
      .map((option) => {
        const relation = sellerShippingOptions.find(
          (o) => o.shipping_option_id === option.id
        )
        return {
          ...option,
          seller_name: relation.seller.name,
          seller_id: relation.seller.id
        }
      })

    console.log('🟩 [FILTER_STEP] Final filtered options:', optionsAvailable.length)
    console.log('🟩 [FILTER_STEP] Final option IDs:', optionsAvailable.map(o => o.id))

    return new StepResponse(optionsAvailable)
  }
)
