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
        console.log('✅ [POSTEX SUCCESS] Shipping price calculated:', {
          price: result.price,
          originCity: originCityCode,
          destinationCity: destinationCityCode,
          parcelsCount: parcels.length
        })
        return {
          calculated_amount: result.price,
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
      return
    }
    throw new Error(`Document type ${documentType} not supported`)
  }
}

export default PostexService 