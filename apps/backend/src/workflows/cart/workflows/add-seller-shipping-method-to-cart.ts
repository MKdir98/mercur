import { CartShippingMethodDTO } from '@medusajs/framework/types'
import { createWorkflow, transform } from '@medusajs/framework/workflows-sdk'
import {
  addShippingMethodToCartStep,
  refreshCartItemsWorkflow,
  useQueryGraphStep
} from '@medusajs/medusa/core-flows'

import sellerShippingOptionLink from '../../../links/seller-shipping-option'
import {
  addSellerShippingMethodDirectStep,
  validateCartShippingOptionsStep
} from '../steps'

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
    const { data: carts } = useQueryGraphStep({
      entity: 'cart',
      filters: {
        id: input.cart_id
      },
      fields: ['id', 'shipping_methods.*'],
      options: { throwIfKeyNotFound: true }
    }).config({ name: 'cart-query' })

    const validateCartShippingOptionsInput = transform(
      { carts, option: input.option },
      ({ carts: [cart], option }) => {
        // @ts-expect-error excessive stack depth in WorkflowData transform
        const methods = (cart.shipping_methods ?? []).filter(Boolean)
        const optionIds = methods.map((m) => (m as { shipping_option_id: string }).shipping_option_id)
        return {
          cart_id: cart.id,
          option_ids: [...optionIds, option.id]
        }
      }
    )

    validateCartShippingOptionsStep(validateCartShippingOptionsInput as any)

    const addDirectResult = addSellerShippingMethodDirectStep({
      cart_id: input.cart_id,
      option_id: input.option.id,
      option_data: input.option.data
    })

    refreshCartItemsWorkflow.runAsStep({
      input: transform(
        { addDirectResult, input },
        ({ addDirectResult, input }) => ({
          cart_id: input.cart_id,
          shipping_methods: addDirectResult?.createdMethodIds ?? []
        })
      )
    })

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
