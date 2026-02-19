import { CartShippingMethodDTO } from '@medusajs/framework/types'
import { createWorkflow, transform } from '@medusajs/framework/workflows-sdk'
import {
  addShippingMethodToCartStep,
  addShippingMethodToCartWorkflow,
  useQueryGraphStep
} from '@medusajs/medusa/core-flows'

import sellerShippingOptionLink from '../../../links/seller-shipping-option'
import { validateCartShippingOptionsStep } from '../steps'

type AddSellerShippingMethodToCartWorkflowInput = {
  cart_id: string
  option: {
    id: string
    data?: Record<string, any>
  }
}

export const addSellerShippingMethodToCartWorkflow = createWorkflow(
  'add-seller-shipping-method-to-cart',
  function (input: AddSellerShippingMethodToCartWorkflowInput) {
    console.log('🔵 [WORKFLOW] add-seller-shipping-method-to-cart started')
    console.log('🔵 [WORKFLOW] input:', JSON.stringify(input, null, 2))
    
    const { data: carts } = useQueryGraphStep({
      entity: 'cart',
      filters: {
        id: input.cart_id
      },
      fields: ['id', 'shipping_methods.*'],
      options: { throwIfKeyNotFound: true }
    }).config({ name: 'cart-query' })
    
    const { data: shippingOptionDetails } = useQueryGraphStep({
      entity: 'shipping_option',
      filters: {
        id: input.option.id
      },
      fields: ['id', 'name', 'price_type', 'provider_id', '*prices'],
      options: { throwIfKeyNotFound: true }
    }).config({ name: 'shipping-option-query' })
    
    const logShippingOption = transform(
      { shippingOptionDetails },
      ({ shippingOptionDetails: [shippingOption] }) => {
        console.log('📦 [WORKFLOW] Shipping Option Details:')
        console.log('📦 [WORKFLOW] ID:', shippingOption.id)
        console.log('📦 [WORKFLOW] Name:', shippingOption.name)
        console.log('📦 [WORKFLOW] Price Type:', shippingOption.price_type)
        console.log('📦 [WORKFLOW] Provider ID:', shippingOption.provider_id)
        console.log('📦 [WORKFLOW] Prices:', JSON.stringify((shippingOption as Record<string, unknown>).prices, null, 2))
        return true
      }
    )

    const validateCartShippingOptionsInput = transform(
      { carts, option: input.option },
      ({ carts: [cart], option }) => ({
        cart_id: cart.id,
        option_ids: [
          // @ts-ignore excessive stack depth
          ...(cart.shipping_methods ?? []).filter(Boolean).map((m) => m!.shipping_option_id),
          option.id
        ]
      })
    )

    validateCartShippingOptionsStep(validateCartShippingOptionsInput as any)

    const addShippingMethodToCartInput = transform(
      input,
      ({ cart_id, option }) => {
        console.log('🟠 [WORKFLOW] Preparing input for addShippingMethodToCartWorkflow')
        console.log('🟠 [WORKFLOW] cart_id:', cart_id)
        console.log('🟠 [WORKFLOW] option:', JSON.stringify(option, null, 2))
        
        const transformedInput = {
          cart_id,
          options: [
            {
              ...option,
              data: {
                ...option.data,
                cart_id
              }
            }
          ]
        }
        
        console.log('🟠 [WORKFLOW] Transformed input:', JSON.stringify(transformedInput, null, 2))
        return transformedInput
      }
    )

    // default addShippingMethodToCartWorkflow will replace all existing shippings methods in the cart
    console.log('🟠 [WORKFLOW] Calling addShippingMethodToCartWorkflow.runAsStep')
    addShippingMethodToCartWorkflow.runAsStep({
      input: addShippingMethodToCartInput
    })
    console.log('🟠 [WORKFLOW] addShippingMethodToCartWorkflow.runAsStep completed')

    const shippingOptions = transform(
      { carts, newShippingOption: input.option },
      ({ carts: [cart], newShippingOption }) => {
        return [
          ...(cart.shipping_methods ?? []).filter(Boolean).map((sm) => sm!.shipping_option_id),
          newShippingOption.id
        ]
      }
    )

    const { data: sellerShippingOptions } = useQueryGraphStep({
      entity: sellerShippingOptionLink.entryPoint,
      fields: ['shipping_option.*', 'seller_id'],
      filters: {
        shipping_option_id: shippingOptions
      }
    }).config({ name: 'seller-shipping-option-query' })

    const shippingMethodsToAddInput = transform(
      { carts, sellerShippingOptions, newShippingOption: input.option },
      ({ carts: [cart], sellerShippingOptions, newShippingOption }) => {
        const shippingOptionToSellerMap = new Map(
          sellerShippingOptions.map((option) => [
            option.shipping_option.id,
            option.seller_id
          ])
        )

        const existingShippingMethodsBySeller = new Map<
          string,
          CartShippingMethodDTO
        >()

        for (const method of cart.shipping_methods ?? []) {
          if (!method) continue
          const sellerId = shippingOptionToSellerMap.get(
            method.shipping_option_id
          )!
          existingShippingMethodsBySeller.set(sellerId, method as any)
        }

        const newOptionSellerId = shippingOptionToSellerMap.get(
          newShippingOption.id
        )!

        // Remove any existing shipping method for the same seller
        // since we're replacing it with the new option
        if (existingShippingMethodsBySeller.has(newOptionSellerId)) {
          existingShippingMethodsBySeller.delete(newOptionSellerId)
        }

        return Array.from(existingShippingMethodsBySeller.values()).map(
          (method) => ({
            shipping_option_id: method.shipping_option_id,
            cart_id: cart.id,
            name: method.name,
            data: method.data,
            amount: method.amount,
            is_tax_inclusive: method.is_tax_inclusive
          })
        )
      }
    )

    addShippingMethodToCartStep({
      shipping_methods: shippingMethodsToAddInput
    })
  }
)
