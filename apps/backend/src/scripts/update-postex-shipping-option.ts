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
    const updatedOption = await fulfillmentModule.updateShippingOptions({
      id: shippingOptionId,
      price_type: 'calculated',
      provider_id: 'postex'
    })

    console.log('✅ Updated shipping option:', updatedOption)
    return updatedOption
  } catch (error) {
    console.error('❌ Error updating shipping option:', error)
    throw error
  }
}

const run = async () => {
  const { getContainer } = await import('@medusajs/framework')
  const container = await getContainer({
    directory: process.cwd()
  })

  const shippingOptionId = process.argv[2] || 'so_01K9ETRPKZT05FV7976ZH5ZVWK'

  await updateShippingOptionToPostex(container, shippingOptionId)

  console.log('✅ Done!')
  process.exit(0)
}

run()







