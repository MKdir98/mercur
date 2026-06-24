import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { MedusaContainer } from '@medusajs/framework/types'

import { ensureSellerPostexShipping } from '../shared/infra/http/utils'
import sellerStockLocationLink from '../links/seller-stock-location'

export default async function fixSellerShippingSetup(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  // Get all sellers with their stock locations
  const { data: sellers } = await query.graph({
    entity: 'seller',
    fields: ['id', 'name']
  })

  console.log(`\n🔧 Found ${sellers.length} sellers. Running fix...\n`)

  // Get Default Sales Channel
  const { data: salesChannels } = await query.graph({
    entity: 'sales_channel',
    fields: ['id', 'name']
  })
  const defaultSc = salesChannels[0]
  if (!defaultSc) {
    console.error('❌ No sales channel found — aborting')
    return
  }
  console.log(`📡 Default sales channel: ${defaultSc.name} (${defaultSc.id})`)

  for (const seller of sellers as any[]) {
    console.log(`\n--- Seller: ${seller.name} (${seller.id}) ---`)

    // Get their stock locations via the proper link entryPoint
    const { data: sellerLocations } = await query.graph({
      entity: sellerStockLocationLink.entryPoint,
      fields: ['stock_location.id', 'stock_location.name'],
      filters: { seller_id: seller.id }
    })

    const locations = (sellerLocations as any[]).map((sl) => sl.stock_location).filter(Boolean)

    if (!locations.length) {
      console.log('  ⚠️  No stock locations found')
      continue
    }

    for (const location of locations) {
      console.log(`  📍 Location: ${location.name} (${location.id})`)

      // 1. Link to Default Sales Channel
      try {
        await remoteLink.create({
          [Modules.SALES_CHANNEL]: { sales_channel_id: defaultSc.id },
          [Modules.STOCK_LOCATION]: { stock_location_id: location.id }
        })
        console.log('    ✅ Linked to Default Sales Channel')
      } catch (e: any) {
        if (e?.message?.includes('duplicate') || e?.code?.includes('23505')) {
          console.log('    ℹ️  Already linked to Default Sales Channel')
        } else {
          console.error('    ❌ Failed to link sales channel:', e?.message)
        }
      }

      // 2. Ensure PostEx shipping is set up
      try {
        await ensureSellerPostexShipping(seller.id, location.id, container)
        console.log('    ✅ PostEx shipping setup complete')
      } catch (e: any) {
        console.error('    ❌ PostEx setup failed:', e?.message)
      }
    }
  }

  console.log('\n✅ Fix complete!\n')
}
