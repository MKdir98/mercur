import { AbstractFulfillmentProviderService, Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PostexClient } from "../../integrations/postex/client"

class PostexService extends AbstractFulfillmentProviderService {
  static identifier = "postex"
  static LIFE_TIME = "SCOPED"
  
  protected container_: any
  protected options_: any
  protected manager_: any

  constructor(container, options) {
    super()
    this.container_ = container
    this.options_ = options
    
    if (container.manager) {
      this.manager_ = container.manager
    } else {
      this.manager_ = null
    }
  }

  async getFulfillmentOptions() {
    return [
      {
        id: "postex-delivery",
        title: "ارسال پستکس",
        type: "postex-delivery"
      },
      {
        id: "postex-pickup",
        title: "تحویل از مرکز پستکس", 
        type: "postex-pickup"
      }
    ]
  }

  async validateFulfillmentData(optionData, data, context) {
    return true
  }

  async validateOption(data) {
    return true
  }

  async canCalculate(data) {
    return true
  }

  async calculatePrice(optionData, data, context) {
    try {
      // 1. Get cart_id from context or data
      const cartId = context?.id || context?.cart_id || data?.cart_id
      
      if (!cartId) {
        throw new Error('خطا در استعلام هزینه ارسال: اطلاعات سبد خرید یافت نشد')
      }

      const cart = context

      // Validate destination address
      if (!cart.shipping_address?.city || !cart.shipping_address?.province) {
        throw new Error('خطا در استعلام هزینه ارسال: آدرس مقصد کامل نیست')
      }

      // 3. Get stock location from context (already available)
      const fromLocation = context.from_location
      
      if (!fromLocation?.address) {
        throw new Error('خطا در استعلام هزینه ارسال: آدرس مبدأ یافت نشد')
      }

      const locationAddress = fromLocation.address

      // 4. Get Postex codes from postex_city_mapping table using EntityManager
      if (!this.manager_) {
        throw new Error('خطا در استعلام هزینه ارسال: سرویس پایگاه داده در دسترس نیست')
      }
      
      const manager = this.manager_

      // Helper function to get Postex code by city name and province name
      const getPostexCodeByName = async (cityName: string, provinceName: string) => {
        try {
          const result = await manager.execute(
            `SELECT c.postex_city_code 
             FROM city c
             INNER JOIN state s ON c.state_id = s.id
             WHERE c.name = ? AND s.name = ? 
             AND c.deleted_at IS NULL AND s.deleted_at IS NULL
             LIMIT 1`,
            [cityName, provinceName]
          )
          
          if (!result || result.length === 0) {
            return null
          }
          
          const postexCode = result[0].postex_city_code
          
          if (!postexCode) {
            return null
          }
          
          return parseInt(postexCode, 10)
        } catch (error) {
          return null
        }
      }
      
      // Get origin code (from stock location address)
      const originCityCode = await getPostexCodeByName(
        locationAddress.city,
        locationAddress.province
      )
      
      // Get destination code (from customer shipping address)
      const destinationCityCode = await getPostexCodeByName(
        cart.shipping_address.city,
        cart.shipping_address.province
      )

      // Validate we have codes
      if (!originCityCode || !destinationCityCode) {
        throw new Error('خطا در استعلام هزینه ارسال: کد شهر مبدأ یا مقصد در سیستم پستکس یافت نشد')
      }

      // 5. Prepare parcels from cart items
      if (!cart.items || cart.items.length === 0) {
        throw new Error('خطا در استعلام هزینه ارسال: سبد خرید خالی است')
      }

      const parcels = await Promise.all(cart.items.map(async (item, index) => {
        const variant = item.variant
        let weight = variant?.weight
        let length = variant?.length
        let width = variant?.width
        let height = variant?.height
        
        if ((!weight || !length || !width || !height) && item.product_id && this.manager_) {
          const product = await this.manager_.execute(
            `SELECT weight, length, width, height 
             FROM product 
             WHERE id = ? AND deleted_at IS NULL 
             LIMIT 1`,
            [item.product_id]
          )
          
          if (product?.[0]) {
            weight = weight || product[0].weight
            length = length || product[0].length
            width = width || product[0].width
            height = height || product[0].height
          }
        }

        const unitPrice = variant?.calculated_price?.calculated_amount || item.unit_price || 0
        const quantity = item.quantity || 1
        const totalValue = unitPrice * quantity

        return {
          weight_kg: weight,
          length_cm: length,
          width_cm: width,
          height_cm: height,
          total_value: totalValue
        }
      }))

      // 6. Call Postex API
      const postexClient = new PostexClient(this.options_)
      const collectionType = optionData.type === 'postex-pickup' ? 'pick_up' : 'pick_up'
      
      const result = await postexClient.calculateRates({
        from_city_code: originCityCode,
        to_city_code: destinationCityCode,
        parcels,
        collection_type: collectionType
      })

      // 7. Return calculated price
      if (result && result.price) {
        const roundedPrice = Math.ceil(result.price / 5000) * 5000
        
        console.log('✅ [POSTEX SUCCESS] Shipping price calculated:', {
          price: result.price,
          roundedPrice: roundedPrice,
          originCity: originCityCode,
          destinationCity: destinationCityCode,
          parcelsCount: parcels.length
        })
        return {
          calculated_amount: roundedPrice,
          is_calculated: true,
          is_calculated_price_tax_inclusive: false
        }
      }

      throw new Error('خطا در استعلام هزینه ارسال: پستکس قیمتی برنگرداند')

    } catch (error) {
      console.error('❌ [POSTEX ERROR]', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      // Re-throw with Persian message if it's already a user-facing error
      if (error.message && error.message.includes('خطا در استعلام')) {
        throw error
      }
      // Otherwise throw a generic error
      throw new Error('خطا در استعلام هزینه ارسال: ' + error.message)
    }
  }

  async createFulfillment(data, items, order, fulfillment) {
    return {
      data: {},
      labels: []
    }
  }

  async createPostexShipment(orderId: string, fulfillmentId: string) {
    try {
      if (!this.manager_) {
        throw new Error('خطا در ثبت مرسوله پستکس: سرویس پایگاه داده در دسترس نیست')
      }

      const manager = this.manager_
      const query = this.container_.resolve(ContainerRegistrationKeys.QUERY)

      const {
        data: [fulfillment]
      } = await query.graph({
        entity: 'fulfillment',
        fields: [
          'id',
          'location_id',
          'provider_id',
          'delivery_address.*',
          'items.*',
          'items.line_item.variant.weight',
          'items.line_item.variant.length',
          'items.line_item.variant.width',
          'items.line_item.variant.height',
          'items.line_item.product_id',
          'items.line_item.unit_price',
          'order.id'
        ],
        filters: {
          id: fulfillmentId
        }
      })

      if (!fulfillment) {
        throw new Error('خطا در ثبت مرسوله پستکس: مرسوله یافت نشد')
      }

      if (fulfillment.provider_id !== 'postex') {
        throw new Error('این مرسوله از نوع پستکس نیست')
      }

      const locationId = fulfillment.location_id
      const deliveryAddress = fulfillment.delivery_address

      if (!locationId) {
        throw new Error('خطا در ثبت مرسوله پستکس: انبار مبدأ یافت نشد')
      }

      if (!deliveryAddress) {
        throw new Error('خطا در ثبت مرسوله پستکس: آدرس مقصد یافت نشد')
      }

      const stockLocationModule = this.container_.resolve(Modules.STOCK_LOCATION)
      const stockLocation = await stockLocationModule.retrieveStockLocation(locationId, {
        relations: ['address']
      })

      if (!stockLocation?.address) {
        throw new Error('خطا در ثبت مرسوله پستکس: آدرس انبار یافت نشد')
      }

      const locationAddress = stockLocation.address

      const sellerStockLocationResult = await manager.execute(
        `SELECT seller_id 
         FROM seller_stock_location 
         WHERE stock_location_id = ? 
         AND deleted_at IS NULL 
         LIMIT 1`,
        [locationId]
      )

      if (!sellerStockLocationResult || sellerStockLocationResult.length === 0) {
        throw new Error('خطا در ثبت مرسوله پستکس: فروشنده یافت نشد')
      }

      const sellerId = sellerStockLocationResult[0].seller_id

      const sellerResult = await manager.execute(
        `SELECT name, phone, postal_code 
         FROM seller 
         WHERE id = ? 
         AND deleted_at IS NULL 
         LIMIT 1`,
        [sellerId]
      )

      if (!sellerResult || sellerResult.length === 0) {
        throw new Error('خطا در ثبت مرسوله پستکس: اطلاعات فروشنده یافت نشد')
      }

      const seller = sellerResult[0]

      const getPostexCodeByName = async (cityName: string, provinceName: string) => {
        try {
          const result = await manager.execute(
            `SELECT c.postex_city_code 
             FROM city c
             INNER JOIN state s ON c.state_id = s.id
             WHERE c.name = ? AND s.name = ? 
             AND c.deleted_at IS NULL AND s.deleted_at IS NULL
             LIMIT 1`,
            [cityName, provinceName]
          )
          
          if (!result || result.length === 0) {
            return null
          }
          
          const postexCode = result[0].postex_city_code
          
          if (!postexCode) {
            return null
          }
          
          return parseInt(postexCode, 10)
        } catch (error) {
          return null
        }
      }

      const originCityCode = await getPostexCodeByName(
        locationAddress.city,
        locationAddress.province
      )

      const destinationCityCode = await getPostexCodeByName(
        deliveryAddress.city,
        deliveryAddress.province
      )

      if (!originCityCode || !destinationCityCode) {
        throw new Error('خطا در ثبت مرسوله پستکس: کد شهر مبدأ یا مقصد در سیستم پستکس یافت نشد')
      }

      const parcels = await Promise.all(fulfillment.items.map(async (item) => {
        const lineItem = item.line_item
        let weight = lineItem?.variant?.weight
        let length = lineItem?.variant?.length
        let width = lineItem?.variant?.width
        let height = lineItem?.variant?.height
        
        if ((!weight || !length || !width || !height) && lineItem?.product_id) {
          const product = await manager.execute(
            `SELECT weight, length, width, height 
             FROM product 
             WHERE id = ? AND deleted_at IS NULL 
             LIMIT 1`,
            [lineItem.product_id]
          )
          
          if (product?.[0]) {
            weight = weight || product[0].weight
            length = length || product[0].length
            width = width || product[0].width
            height = height || product[0].height
          }
        }

        weight = weight || 0.5
        length = length || 20
        width = width || 15
        height = height || 10

        const unitPrice = lineItem?.unit_price || 0
        const quantity = item.quantity || 1
        const totalValue = unitPrice * quantity

        return {
          weight_kg: weight,
          length_cm: length,
          width_cm: width,
          height_cm: height,
          total_value: totalValue
        }
      }))

      const senderPhone = seller.phone || locationAddress.phone || '09000000000'
      const senderPostalCode = seller.postal_code || locationAddress.postal_code || '0000000000'
      const receiverPhone = deliveryAddress.phone || '09000000000'
      const receiverPostalCode = deliveryAddress.postal_code || '0000000000'

      const postexClient = new PostexClient(this.options_)

      const requestData = {
        sender: {
          name: seller.name,
          phone: senderPhone,
          address: `${locationAddress.address_1 || ''} ${locationAddress.address_2 || ''}`.trim(),
          city_code: originCityCode,
          postal_code: senderPostalCode
        },
        receiver: {
          name: `${deliveryAddress.first_name || ''} ${deliveryAddress.last_name || ''}`.trim() || 'مشتری',
          phone: receiverPhone,
          address: `${deliveryAddress.address_1 || ''} ${deliveryAddress.address_2 || ''}`.trim(),
          city_code: destinationCityCode,
          postal_code: receiverPostalCode
        },
        parcels,
        collection_type: 'pick_up'
      }

      console.log('🔹 [POSTEX SERVICE] Creating shipment with Postex', {
        orderId,
        fulfillmentId,
        sender: requestData.sender.name,
        receiver: requestData.receiver.name
      })

      const result = await postexClient.createBulkParcels(requestData)

      if (!result) {
        throw new Error('خطا در ثبت مرسوله پستکس: پاسخی از سرور دریافت نشد')
      }

      const shipmentId = `postex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      await manager.execute(
        `INSERT INTO postex_shipment (
          id, 
          fulfillment_id, 
          order_id, 
          postex_parcel_id, 
          postex_tracking_code, 
          postex_request_data, 
          postex_response_data, 
          pickup_requested_at, 
          status, 
          created_at, 
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), NOW())`,
        [
          shipmentId,
          fulfillmentId,
          orderId,
          result.parcel_id,
          result.tracking_code,
          JSON.stringify(requestData),
          JSON.stringify(result),
          'confirmed'
        ]
      )

      console.log('✅ [POSTEX SERVICE] Shipment created successfully', {
        shipmentId,
        tracking_code: result.tracking_code,
        parcel_id: result.parcel_id
      })

      return {
        tracking_number: result.tracking_code,
        tracking_url: `https://tracking.postex.ir/${result.tracking_code}`,
        label_url: '#',
        postex_parcel_id: result.parcel_id
      }

    } catch (error) {
      console.error('❌ [POSTEX SERVICE] Error creating shipment', {
        message: error.message,
        stack: error.stack
      })

      if (this.manager_) {
        try {
          const shipmentId = `postex_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          await this.manager_.execute(
            `INSERT INTO postex_shipment (
              id, 
              fulfillment_id, 
              order_id, 
              status, 
              error_message, 
              created_at, 
              updated_at
            ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              shipmentId,
              fulfillmentId,
              orderId,
              'failed',
              error.message
            ]
          )
        } catch (dbError) {
          console.error('❌ [POSTEX SERVICE] Failed to save error to database', dbError)
        }
      }

      if (error.message && error.message.includes('خطا در')) {
        throw error
      }
      throw new Error('خطا در ثبت مرسوله پستکس: ' + error.message)
    }
  }

  async cancelFulfillment(fulfillment) {
    return {}
  }

  async createReturnFulfillment(fromData) {
    return {
      data: {},
      labels: []
    }
  }

  async retrieveDocuments(fulfillmentData: Record<string, unknown>, documentType: string): Promise<void> {
    if (documentType === "label") {
      return
    }
    throw new Error(`Document type ${documentType} not supported`)
  }
}

export default PostexService 