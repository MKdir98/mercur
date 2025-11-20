import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { Client } from 'pg'

export type UpdateStockLocationAddressCityIdInput = {
  stock_location_id: string
  city_id: string
}

export const updateStockLocationAddressCityIdStep = createStep(
  'update-stock-location-address-city-id',
  async (input: UpdateStockLocationAddressCityIdInput, { container }) => {
    const { stock_location_id, city_id } = input

    if (!city_id) {
      return new StepResponse(null)
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const {
      data: [stockLocation]
    } = await query.graph({
      entity: 'stock_location',
      fields: ['id', 'address_id'],
      filters: { id: stock_location_id }
    })

    if (!stockLocation?.address_id) {
      return new StepResponse(null)
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL?.replace(
        '$DB_NAME',
        process.env.DB_NAME || 'mercur'
      )
    })

    try {
      await client.connect()
      await client.query(
        'UPDATE stock_location_address SET city_id = $1 WHERE id = $2',
        [city_id, stockLocation.address_id]
      )

      return new StepResponse({ address_id: stockLocation.address_id, city_id })
    } finally {
      await client.end()
    }
  }
)












