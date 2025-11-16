import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { MedusaContainer } from '@medusajs/framework/types'

export async function updateShippingOptionToPostex(
  container: MedusaContainer,
  shippingOptionId: string
) {
  console.log('🔧 Updating shipping option to use Postex...')
  console.log('🔧 Shipping Option ID:', shippingOptionId)

  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)

  try {
    const updatedOption = await fulfillmentModule.updateShippingOptions(
      shippingOptionId,
      {
        price_type: 'calculated',
        provider_id: 'postex'
      }
    )

    console.log('✅ Updated shipping option:', updatedOption)
    return updatedOption
  } catch (error) {
    console.error('❌ Error updating shipping option:', error)
    throw error
  }
}

if (require.main === module) {
  console.log('This script should be run via Medusa CLI')
  console.log('Example: npx medusa exec ./src/scripts/update-postex-shipping-option.ts')
  process.exit(1)
}

export default updateShippingOptionToPostex









