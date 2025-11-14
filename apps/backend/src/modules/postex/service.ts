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
      console.log('✅ [POSTEX] EntityManager resolved from container')
    } else {
      console.warn('⚠️  [POSTEX] EntityManager not found in container')
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
    console.log('🔍 [POSTEX] canCalculate called with data:', data)
    return true
  }

  async calculatePrice(optionData, data, context) {
    console.log('🚀🚀🚀 [POSTEX] ===== calculatePrice CALLED ===== ')
    console.log('🚀 [POSTEX] Timestamp:', new Date().toISOString())
    console.log('🔹 [POSTEX] optionData:', JSON.stringify(optionData, null, 2))
    console.log('🔹 [POSTEX] data:', JSON.stringify(data, null, 2))
    console.log('🔹 [POSTEX] context keys:', Object.keys(context || {}))
    console.log('🔹 [POSTEX] context:', JSON.stringify(context, null, 2))

    try {
      // 1. Get cart_id from context or data
      const cartId = context?.id || context?.cart_id || data?.cart_id
      
      if (!cartId) {
        console.error('❌ [POSTEX] No cart_id found')
        throw new Error('خطا در استعلام هزینه ارسال: اطلاعات سبد خرید یافت نشد')
      }

      console.log('✅ [POSTEX] Cart ID found:', cartId)

      // 2. Use context data instead of querying cart again
      // Context already has all cart data including items and addresses
      const cart = context

      console.log('✅ [POSTEX] Using cart from context')
      console.log('🔹 [POSTEX] Shipping address:', {
        city: cart.shipping_address?.city,
        province: cart.shipping_address?.province
      })

      // Validate destination address
      if (!cart.shipping_address?.city || !cart.shipping_address?.province) {
        console.error('❌ [POSTEX] Cart missing shipping city/province')
        throw new Error('خطا در استعلام هزینه ارسال: آدرس مقصد کامل نیست')
      }

      // 3. Get stock location from context (already available)
      const fromLocation = context.from_location
      
      if (!fromLocation?.address) {
        console.error('❌ [POSTEX] Stock location address not found in context')
        throw new Error('خطا در استعلام هزینه ارسال: آدرس مبدأ یافت نشد')
      }

      const locationAddress = fromLocation.address
      
      console.log('✅ [POSTEX] Location address found:', {
        city: locationAddress.city,
        province: locationAddress.province
      })

      // 4. Get Postex codes from postex_city_mapping table using EntityManager
      if (!this.manager_) {
        console.error('❌ [POSTEX] EntityManager not available')
        throw new Error('خطا در استعلام هزینه ارسال: سرویس پایگاه داده در دسترس نیست')
      }
      
      const manager = this.manager_
      console.log('✅ [POSTEX] Using EntityManager to get postex city codes')

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
            console.error('❌ [POSTEX] City not found:', cityName, 'in province:', provinceName)
            return null
          }
          
          const postexCode = result[0].postex_city_code
          
          if (!postexCode) {
            console.error('❌ [POSTEX] postex_city_code is null for city:', cityName)
            return null
          }
          
          return parseInt(postexCode, 10)
        } catch (error) {
          console.error('❌ [POSTEX] Error querying city:', error)
          return null
        }
      }
      
      // Get origin code (from stock location address)
      console.log('🔹 [POSTEX] Getting origin code for:', locationAddress.city, locationAddress.province)
      const originCityCode = await getPostexCodeByName(
        locationAddress.city,
        locationAddress.province
      )
      
      // Get destination code (from customer shipping address)
      console.log('🔹 [POSTEX] Getting destination code for:', cart.shipping_address.city, cart.shipping_address.province)
      const destinationCityCode = await getPostexCodeByName(
        cart.shipping_address.city,
        cart.shipping_address.province
      )

      console.log('🔹 [POSTEX] Origin city code:', originCityCode)
      console.log('🔹 [POSTEX] Destination city code:', destinationCityCode)

      // Validate we have codes
      if (!originCityCode || !destinationCityCode) {
        console.error('❌ [POSTEX] Missing Postex city codes')
        console.error('   Origin:', originCityCode)
        console.error('   Destination:', destinationCityCode)
        throw new Error('خطا در استعلام هزینه ارسال: کد شهر مبدأ یا مقصد در سیستم پستکس یافت نشد')
      }

      // 5. Prepare parcels from cart items
      if (!cart.items || cart.items.length === 0) {
        throw new Error('خطا در استعلام هزینه ارسال: سبد خرید خالی است')
      }
      console.log('🔹 [POSTEX] Cart items:', cart.items)

      const parcels = cart.items.map((item, index) => {
        const variant = item.variant
        
        const missingFields: string[] = []
        if (!variant?.weight || variant.weight <= 0) missingFields.push('وزن')
        if (!variant?.length || variant.length <= 0) missingFields.push('طول')
        if (!variant?.width || variant.width <= 0) missingFields.push('عرض')
        if (!variant?.height || variant.height <= 0) missingFields.push('ارتفاع')
        
        if (missingFields.length > 0) {
          const productTitle = item?.title || variant?.title || `محصول ${index + 1}`
          throw new Error(
            `خطا در استعلام هزینه ارسال: مشخصات محصول "${productTitle}" ناقص است. فیلدهای مورد نیاز: ${missingFields.join('، ')}`
          )
        }

        const unitPrice = variant?.calculated_price?.calculated_amount || item.unit_price || 0
        const quantity = item.quantity || 1
        const totalValue = unitPrice * quantity

        return {
          weight_kg: variant.weight,
          length_cm: variant.length,
          width_cm: variant.width,
          height_cm: variant.height,
          total_value: totalValue
        }
      })

      console.log('🔹 [POSTEX] Parcels:', parcels)

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
        console.log('✅ [POSTEX] API returned price:', result.price)
        return {
          calculated_amount: result.price,
          is_calculated: true,
          is_calculated_price_tax_inclusive: false
        }
      }

      console.error('❌ [POSTEX] API returned no price')
      throw new Error('خطا در استعلام هزینه ارسال: پستکس قیمتی برنگرداند')

    } catch (error) {
      console.error('❌ [POSTEX] Error in calculatePrice:', error)
      // Re-throw with Persian message if it's already a user-facing error
      if (error.message && error.message.includes('خطا در استعلام')) {
        throw error
      }
      // Otherwise throw a generic error
      throw new Error('خطا در استعلام هزینه ارسال: ' + error.message)
    }
  }

  async createFulfillment(data, items, order, fulfillment) {
    const trackingNumber = `POSTEX${Date.now()}`
    
    return {
      data: {
        tracking_number: trackingNumber,
        postex_shipment_id: `PX${Date.now()}`
      },
      labels: []
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
      // Return label data for Postex
      console.log(`Label URL: https://postex.ir/labels/${fulfillmentData.postex_shipment_id}`)
      return
    }
    throw new Error(`Document type ${documentType} not supported`)
  }
}

export default PostexService 