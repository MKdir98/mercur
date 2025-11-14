import axios, { AxiosInstance } from 'axios'

interface PostexOptions {
  apiKey?: string
  apiUrl?: string
}

interface ShippingQuoteRequest {
  query?: string
  collection_type: string
  from_city_code: number
  value_added_service?: {}
  courier?: {
    courier_code?: string
    service_type?: string
  }
  parcels: Array<{
    custom_parcel_id?: string
    to_city_code: number
    payment_type: string
    parcel_properties: {
      length: number
      width: number
      height: number
      total_weight: number
      is_fragile?: boolean
      is_liquid?: boolean
      total_value?: number
      pre_paid_amount?: number
      total_value_currency?: string
      box_type_id?: number
    }
  }>
}

interface ShippingQuoteResponse {
  parcel_count?: number
  currency?: string
  pickup_price?: number
  shipping_price?: number
  shipping_price_vat?: number
  value_added_service_price?: number
  total_cost?: number
  shipping_prices?: Array<{
    custom_parcel_id?: string
    to_city_name?: string
    shipping_price?: number
    shipping_price_vat?: number
    total_shipping_price?: number
    estimated_delivery?: string
    service_price?: Array<{
      courierLogo?: string
      courierName?: string
      courierCode?: string
      courierNameAlias?: string
      courierCodeAlias?: string
      serviceType?: string
      serviceName?: string
      slaDays?: string
      slaHours?: number
      vat?: number
      discountAmount?: number
      totalPrice?: number
      initPrice?: number
    }>
    value_added_service_price?: {}
  }>
  success?: boolean
  message?: string
}

export class PostexClient {
  private client: AxiosInstance
  private options: PostexOptions

  constructor(options: PostexOptions) {
    this.options = options
    
    const baseURL = options.apiUrl || 'https://api.postex.ir'
    
    console.log('🔑 [POSTEX CLIENT] API Key configured:', options.apiKey ? `${options.apiKey.substring(0, 15)}...` : 'NOT SET')
    
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(options.apiKey && { 
          'Authorization': `Bearer ${options.apiKey}`,
          'Api-Key': options.apiKey,
          'X-API-Key': options.apiKey
        })
      }
    })
    
    console.log('🔑 [POSTEX CLIENT] Authorization header:', this.client.defaults.headers['Authorization'])
    console.log('🔑 [POSTEX CLIENT] Api-Key header:', this.client.defaults.headers['Api-Key'])
  }

  getDefaultParcel() {
    return {
      weight_kg: 0.5,
      length_cm: 20,
      width_cm: 15,
      height_cm: 10
    }
  }

  async calculateRates(params: {
    from_city_code: number
    to_city_code: number
    parcels: Array<{
      weight_kg: number
      length_cm: number
      width_cm: number
      height_cm: number
      total_value: number
    }>
    collection_type?: string
  }): Promise<{ price: number } | null> {
    try {
      if (!this.options.apiKey) {
        console.warn('⚠️  [POSTEX CLIENT] No API key provided')
        throw new Error('API key is required')
      }

      const requestBody: ShippingQuoteRequest = {
        query: 'calculate',
        collection_type: params.collection_type || 'pick_up',
        from_city_code: params.from_city_code,
        value_added_service: {},
        courier: {
          courier_code: '',
          service_type: 'EXPRESS'
        },
        parcels: params.parcels.map(parcel => ({
          custom_parcel_id: '',
          to_city_code: params.to_city_code,
          payment_type: 'SENDER',
          parcel_properties: {
            length: Math.round(parcel.length_cm),
            width: Math.round(parcel.width_cm),
            height: Math.round(parcel.height_cm),
            total_weight: Math.round(parcel.weight_kg * 1000),
            is_fragile: false,
            is_liquid: false,
            total_value: parcel.total_value,
            pre_paid_amount: 0,
            total_value_currency: 'IRR',
            box_type_id: 1
          }
        }))
      }

      console.log('🔹 [POSTEX CLIENT] Calling shipping quotes API')
      console.log('🔹 [POSTEX CLIENT] Request:', JSON.stringify(requestBody, null, 2))

      const response = await this.client.post<ShippingQuoteResponse>(
        '/api/v1/shipping/quotes',
        requestBody
      )

      console.log('🔹 [POSTEX CLIENT] Response:', JSON.stringify(response.data, null, 2))

      if (response.data?.shipping_prices?.[0]?.service_price?.[0]?.totalPrice) {
        const price = response.data.shipping_prices[0].service_price[0].totalPrice
        console.log('✅ [POSTEX CLIENT] Found price from service_price:', price)
        return { price }
      }

      if (response.data?.shipping_price) {
        console.log('✅ [POSTEX CLIENT] Found price from shipping_price:', response.data.shipping_price)
        return { price: response.data.shipping_price }
      }

      if (response.data?.total_cost) {
        console.log('✅ [POSTEX CLIENT] Found price from total_cost:', response.data.total_cost)
        return { price: response.data.total_cost }
      }

      console.warn('⚠️  [POSTEX CLIENT] No price in response')
      return null

    } catch (error) {
      console.error('❌ [POSTEX CLIENT] Error calling API')
      console.error('❌ [POSTEX CLIENT] Status:', error.response?.status)
      console.error('❌ [POSTEX CLIENT] Message:', error.response?.data?.message)
      
      if (error.response?.data?.invalid_fields) {
        console.error('❌ [POSTEX CLIENT] Invalid fields:')
        console.error(JSON.stringify(error.response.data.invalid_fields, null, 2))
      }
      
      if (error.response?.data) {
        console.error('❌ [POSTEX CLIENT] Full response data:')
        console.error(JSON.stringify(error.response.data, null, 2))
      }
      
      throw error
    }
  }
}

