import { AbstractFulfillmentProviderService, Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PostexClient } from "../../integrations/postex/client"

class PostexService extends AbstractFulfillmentProviderService {
  static identifier = "postex"
  static LIFE_TIME = "SCOPED"

  private static globalContainer_: any = null

  static setGlobalContainer(container: unknown) {
    PostexService.globalContainer_ = container
  }

  protected container_: any
  protected options_: any
  protected manager_: any

  constructor(container, options) {
    super()
    this.container_ = container
    this.options_ = options
    this.manager_ = null
  }

  private getDbContainer() {
    return PostexService.globalContainer_ || this.container_
  }

  getManager() {
    return this.manager_
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

      // 4. Get Postex codes from city table using knex
      const knex = this.getDbContainer().resolve(ContainerRegistrationKeys.PG_CONNECTION)
      
      if (!knex) {
        throw new Error('خطا در استعلام هزینه ارسال: سرویس پایگاه داده در دسترس نیست')
      }

      // Helper function to get Postex code by city name and province name
      const getPostexCodeByName = async (cityName: string, provinceName: string) => {
        try {
          const result = await knex.raw(
            `SELECT c.postex_city_code 
             FROM city c
             INNER JOIN state s ON c.state_id = s.id
             WHERE c.name = ? AND s.name = ? 
             AND c.deleted_at IS NULL AND s.deleted_at IS NULL
             LIMIT 1`,
            [cityName, provinceName]
          )
          
          if (!result.rows || result.rows.length === 0) {
            return null
          }
          
          const postexCode = result.rows[0].postex_city_code
          
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
        
        if ((!weight || !length || !width || !height) && item.product_id) {
          const product = await knex.raw(
            `SELECT weight, length, width, height 
             FROM product 
             WHERE id = ? AND deleted_at IS NULL 
             LIMIT 1`,
            [item.product_id]
          )
          
          if (product?.rows?.[0]) {
            weight = weight || product.rows[0].weight
            length = length || product.rows[0].length
            width = width || product.rows[0].width
            height = height || product.rows[0].height
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
      console.log(error)
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

  async createPostexShipment(
    orderId: string,
    fulfillmentId: string,
    locationId?: string,
    deps?: { query?: any; knex?: any; stockLocationModule?: any; isBulk?: boolean }
  ) {
    try {
      const query = deps?.query ?? this.getDbContainer().resolve(ContainerRegistrationKeys.QUERY)
      const knex = deps?.knex ?? this.getDbContainer().resolve(ContainerRegistrationKeys.PG_CONNECTION)
      const stockLocationModule = deps?.stockLocationModule ?? this.getDbContainer().resolve(Modules.STOCK_LOCATION)
      
      if (!knex) {
        throw new Error('خطا در ثبت مرسوله پستکس: سرویس پایگاه داده در دسترس نیست')
      }

      const {
        data: [order]
      } = await query.graph({
        entity: 'order',
        fields: [
          'id',
          'shipping_address.*',
          'items.*',
          'items.variant_id',
          'items.product_id',
          'items.unit_price',
          'items.quantity',
          'shipping_methods.*',
          'shipping_methods.shipping_option_id'
        ],
        filters: {
          id: orderId
        }
      })

      console.log('🔹 [POSTEX SERVICE] Order data:', {
        orderId,
        hasShippingAddress: !!order?.shipping_address,
        itemsCount: order?.items?.length,
        shippingMethodsCount: order?.shipping_methods?.length
      })

      if (!order) {
        throw new Error('خطا در ثبت مرسوله پستکس: سفارش یافت نشد')
      }

      const deliveryAddress = order.shipping_address

      if (!deliveryAddress) {
        throw new Error('خطا در ثبت مرسوله پستکس: آدرس مقصد یافت نشد')
      }

      const shippingMethod = order.shipping_methods?.[0]
      
      console.log('🔹 [POSTEX SERVICE] Shipping method:', {
        shippingMethod: JSON.stringify(shippingMethod, null, 2)
      })
      
      if (!shippingMethod) {
        throw new Error('خطا در ثبت مرسوله پستکس: روش ارسال یافت نشد')
      }

      if (!locationId) {
        const {
          data: [shippingOption]
        } = await query.graph({
          entity: 'shipping_option',
          fields: ['id', 'provider_id'],
          filters: {
            id: shippingMethod.shipping_option_id
          }
        })

        console.log('🔹 [POSTEX SERVICE] Shipping option:', {
          shippingOptionId: shippingMethod.shipping_option_id,
          shippingOption: JSON.stringify(shippingOption, null, 2)
        })

        if (!shippingOption?.provider_id?.includes('postex')) {
          throw new Error('این سفارش از نوع پستکس نیست')
        }

        throw new Error('خطا در ثبت مرسوله پستکس: انبار مبدأ یافت نشد (location_id باید در request ارسال شود)')
      }

      console.log('🔹 [POSTEX SERVICE] Using location ID:', locationId)

      const stockLocation = await stockLocationModule.retrieveStockLocation(locationId, {
        relations: ['address']
      })

      if (!stockLocation?.address) {
        throw new Error('خطا در ثبت مرسوله پستکس: آدرس انبار یافت نشد')
      }

      const locationAddress = stockLocation.address

      const sellerStockLocationResult = await knex.raw(
        `SELECT seller_id 
         FROM seller_seller_stock_location_stock_location 
         WHERE stock_location_id = ? 
         AND deleted_at IS NULL 
         LIMIT 1`,
        [locationId]
      )

      if (!sellerStockLocationResult.rows || sellerStockLocationResult.rows.length === 0) {
        throw new Error('خطا در ثبت مرسوله پستکس: فروشنده یافت نشد')
      }

      const sellerId = sellerStockLocationResult.rows[0].seller_id

      const sellerResult = await knex.raw(
        `SELECT name, phone, postal_code 
         FROM seller 
         WHERE id = ? 
         AND deleted_at IS NULL 
         LIMIT 1`,
        [sellerId]
      )

      if (!sellerResult.rows || sellerResult.rows.length === 0) {
        throw new Error('خطا در ثبت مرسوله پستکس: اطلاعات فروشنده یافت نشد')
      }

      const seller = sellerResult.rows[0]

      console.log('🔹 [POSTEX SERVICE] Seller info:', {
        name: seller.name,
        phone: seller.phone,
        postal_code: seller.postal_code
      })

      console.log('🔹 [POSTEX SERVICE] Location address:', {
        address_1: locationAddress.address_1,
        address_2: locationAddress.address_2,
        city: locationAddress.city,
        province: locationAddress.province,
        postal_code: locationAddress.postal_code,
        phone: locationAddress.phone
      })

      const getPostexCodeByName = async (cityName: string, provinceName: string) => {
        try {
          const result = await knex.raw(
            `SELECT c.postex_city_code 
             FROM city c
             INNER JOIN state s ON c.state_id = s.id
             WHERE c.name = ? AND s.name = ? 
             AND c.deleted_at IS NULL AND s.deleted_at IS NULL
             LIMIT 1`,
            [cityName, provinceName]
          )
          
          if (!result.rows || result.rows.length === 0) {
            return null
          }
          
          const postexCode = result.rows[0].postex_city_code
          
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

      const parcels = await Promise.all(order.items.map(async (item) => {
        let weight, length, width, height
        
        if (item.variant_id) {
          const variant = await knex.raw(
            `SELECT weight, length, width, height 
             FROM product_variant 
             WHERE id = ? AND deleted_at IS NULL 
             LIMIT 1`,
            [item.variant_id]
          )
          
          if (variant?.rows?.[0]) {
            weight = variant.rows[0].weight
            length = variant.rows[0].length
            width = variant.rows[0].width
            height = variant.rows[0].height
          }
        }
        
        if ((!weight || !length || !width || !height) && item.product_id) {
          const product = await knex.raw(
            `SELECT weight, length, width, height 
             FROM product 
             WHERE id = ? AND deleted_at IS NULL 
             LIMIT 1`,
            [item.product_id]
          )
          
          if (product?.rows?.[0]) {
            weight = weight || product.rows[0].weight
            length = length || product.rows[0].length
            width = width || product.rows[0].width
            height = height || product.rows[0].height
          }
        }

        weight = weight || 0.5
        length = length || 20
        width = width || 15
        height = height || 10

        const unitPrice = item.unit_price || 0
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
      
      const isValidPostalCode = (code: string) => code && code.length === 10
      
      let senderPostalCode = '0000000000'
      if (isValidPostalCode(locationAddress.postal_code)) {
        senderPostalCode = locationAddress.postal_code
      } else if (isValidPostalCode(seller.postal_code)) {
        senderPostalCode = seller.postal_code
      }
      
      const receiverPhone = deliveryAddress.phone || '09000000000'
      const receiverPostalCode = isValidPostalCode(deliveryAddress.postal_code) 
        ? deliveryAddress.postal_code 
        : '0000000000'

      console.log('🔹 [POSTEX SERVICE] Postal codes:', {
        seller_postal_code: seller.postal_code,
        location_postal_code: locationAddress.postal_code,
        final_sender_postal_code: senderPostalCode,
        receiver_postal_code: receiverPostalCode
      })

      const postexClient = new PostexClient(this.options_)
      const isBulk = deps?.isBulk ?? false
      const collectionType = isBulk ? 'pick_up' : 'courier_drop_off'

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
        collection_type: collectionType
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

      await knex.raw(
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

  async getParcelStatus(parcelId: string): Promise<number | null> {
    try {
      const postexClient = new PostexClient(this.options_)
      const response = await postexClient.getParcelDetail(parcelId)
      
      if (response?.isSuccess && response.current_status?.group?.code) {
        return response.current_status.group.code
      }
      
      return null
    } catch (error) {
      console.error('❌ [POSTEX SERVICE] Error getting parcel status', {
        message: error.message,
        parcelId
      })
      return null
    }
  }

  async canCancelFulfillment(fulfillmentId: string): Promise<boolean> {
    try {
      const knex = this.getDbContainer().resolve(ContainerRegistrationKeys.PG_CONNECTION)
      
      if (!knex) {
        console.warn('⚠️ [POSTEX SERVICE] Knex not available for canCancelFulfillment')
        return true
      }
      
      const result = await knex.raw(
        `SELECT postex_parcel_id, status 
         FROM postex_shipment 
         WHERE fulfillment_id = ? 
         LIMIT 1`,
        [fulfillmentId]
      )
      
      if (!result.rows || result.rows.length === 0) {
        console.log('ℹ️ [POSTEX SERVICE] No Postex shipment found, allowing cancel')
        return true
      }
      
      const parcelId = result.rows[0].postex_parcel_id
      
      if (!parcelId) {
        console.log('ℹ️ [POSTEX SERVICE] No parcel_id found, allowing cancel')
        return true
      }
      
      const statusCode = await this.getParcelStatus(parcelId)
      
      if (!statusCode) {
        console.warn('⚠️ [POSTEX SERVICE] Could not get status from Postex, denying cancel for safety')
        return false
      }
      
      const canCancel = statusCode === 1 || statusCode === 2
      
      console.log('🔹 [POSTEX SERVICE] Cancel check result', {
        fulfillmentId,
        parcelId,
        statusCode,
        canCancel
      })
      
      return canCancel
    } catch (error) {
      console.error('❌ [POSTEX SERVICE] Error checking if can cancel', {
        message: error.message,
        fulfillmentId
      })
      return false
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