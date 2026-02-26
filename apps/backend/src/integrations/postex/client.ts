import axios, { AxiosInstance } from 'axios'
import { PostexParcelDetailResponse } from './types'
import { logPostexError, logPostexRequest, logPostexResponse } from './logger'

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

interface BulkParcelRequest {
  sender: {
    name: string
    mobile: string
    address: string
    city_code: number
    postal_code: string
  }
  collection_type: string
  parcels: Array<{
    receiver: {
      name: string
      mobile: string
      address: string
      city_code: number
      postal_code: string
    }
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

interface BulkParcelResponse {
  order_no?: number
  pick_up_price?: number
  shipping_price?: number
  total_price?: number
  result?: Array<{
    isSuccess: boolean
    message?: string
    data?: {
      sequence_number?: number
      parcel_no?: number
      custom_order_no?: string | null
      custom_reference_no?: string | null
      is_oversized?: boolean
      shipments?: Array<{
        step?: number
        tracking?: {
          barcode?: string
          tracking_number?: string
          tracking_url?: string
        }
        shipping_rate?: {
          currency?: string
          amount?: number
          total_amount?: number
        }
      }>
      order_id?: number
    }
  }>
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
      weight_kg: 500,
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
            total_weight: Math.round(parcel.weight_kg),
            is_fragile: false,
            is_liquid: false,
            total_value: parcel.total_value,
            pre_paid_amount: 0,
            total_value_currency: 'IRR',
            box_type_id: 1
          }
        }))
      }

      const endpoint = '/api/v1/shipping/quotes'
      logPostexRequest(endpoint, requestBody)

      const response = await this.client.post<ShippingQuoteResponse>(endpoint, requestBody)

      logPostexResponse(endpoint, response.data)

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
      logPostexError('/api/v1/shipping/quotes', {
        status: error.response?.status,
        message: error.response?.data?.message,
        invalid_fields: error.response?.data?.invalid_fields,
        data: error.response?.data
      })
      throw error
    }
  }

  async createBulkParcels(params: {
    sender: {
      name: string
      phone: string
      address: string
      city_code: number
      postal_code: string
    }
    receiver: {
      name: string
      phone: string
      address: string
      city_code: number
      postal_code: string
    }
    parcels: Array<{
      weight_kg: number
      length_cm: number
      width_cm: number
      height_cm: number
      total_value: number
    }>
    collection_type?: string
  }): Promise<{
    tracking_code: string
    parcel_id: string
  } | null> {
    try {
      const isProduction = process.env.NODE_ENV === 'production'
      if (!isProduction) {
        const mockResponse = {
          order_no: 707075,
          pick_up_price: 0,
          shipping_price: 485936,
          total_price: 485936,
          result: [{
            isSuccess: true,
            data: {
              sequence_number: 1,
              parcel_no: 1613499993813,
              custom_order_no: null,
              custom_reference_no: null,
              is_oversized: false,
              shipments: [{
                step: 1,
                courier: {
                  paymentType: null,
                  paymentName: null,
                  courierServiceName: null,
                  courierCode: null,
                  courierName: 'IR_POST',
                  courierServiceCode: 'EXPRESS',
                  days: null,
                  slaHours: 0
                },
                tracking: {
                  barcode: '210160434305978670000147',
                  tracking_number: '210160434305978670000147',
                  tracking_url: 'https://postex.ir/service/rahgiri?barcode=**********'
                },
                shipping_rate: {
                  currency: 'IRR',
                  discount: 60874,
                  vat: 0,
                  amount: 395736,
                  vas_amount: 90200,
                  total_amount: 485936,
                  pre_discount_amount: 546810
                },
                is_duplicated: false,
                created_at: '2026-02-26T15:38:58.8385212+03:30'
              }],
              order_id: 707075
            }
          }],
          jobID: null,
          createdAt: null
        }
        const endpoint = '/api/v1/parcels/bulk'
        logPostexRequest(endpoint, params)
        logPostexResponse(endpoint, mockResponse)
        const result = mockResponse.result[0]
        const parcelNo = result.data.parcel_no
        const tracking = result.data.shipments[0].tracking
        return {
          tracking_code: tracking.tracking_number,
          parcel_id: parcelNo.toString()
        }
      }

      if (!this.options.apiKey) {
        console.warn('⚠️  [POSTEX CLIENT] No API key provided')
        throw new Error('API key is required')
      }

      const [senderFirstName, ...senderLastNameParts] = params.sender.name.split(' ')
      const senderLastName = senderLastNameParts.join(' ') || senderFirstName

      const [receiverFirstName, ...receiverLastNameParts] = params.receiver.name.split(' ')
      const receiverLastName = receiverLastNameParts.join(' ') || receiverFirstName

      const collectionType = params.collection_type || 'pick_up'
      const requestBody = {
        collection_type: collectionType,
        parcels: params.parcels.map(parcel => ({
          courier: {
            name: 'IR_POST',
            payment_type: 'SENDER',
            service_type: 'EXPRESS'
          },
          from: {
            contact: {
              first_name: senderFirstName,
              last_name: senderLastName,
              mobile_no: params.sender.phone,
              telephone_no: params.sender.phone,
              email_address: 'sender@example.com',
              company_name: params.sender.name,
              national_code: '0000000000'
            },
            location: {
              address: params.sender.address,
              city_id: params.sender.city_code.toString(),
              post_code: params.sender.postal_code,
              country: 'IR',
              city_name: '',
              lat: '35.6892',
              lon: '51.3890'
            }
          },
          to: {
            contact: {
              first_name: receiverFirstName,
              last_name: receiverLastName,
              mobile_no: params.receiver.phone,
              telephone_no: params.receiver.phone,
              email_address: 'receiver@example.com',
              company_name: '',
              national_code: '0000000000'
            },
            location: {
              address: params.receiver.address,
              city_id: params.receiver.city_code.toString(),
              post_code: params.receiver.postal_code,
              country: 'IR',
              city_name: '',
              lat: '35.6892',
              lon: '51.3890'
            }
          },
          parcel_properties: {
            length: Math.round(parcel.length_cm),
            width: Math.round(parcel.width_cm),
            height: Math.round(parcel.height_cm),
            total_weight: Math.round(parcel.weight_kg),
            is_fragile: false,
            is_liquid: false,
            total_value: parcel.total_value,
            pre_paid_amount: 0,
            total_value_currency: 'IRR',
            box_type_id: 1
          },
          added_service: {
            request_label: true,
            request_packaging: false,
            request_sms_notification: true
          },
          ready_to_accept: false
        }))
      }

      const endpoint = '/api/v1/parcels/bulk'
      logPostexRequest(endpoint, requestBody)

      const response = await this.client.post<BulkParcelResponse>(endpoint, requestBody)

      logPostexResponse(endpoint, response.data)

      if (response.data?.result?.[0]) {
        const result = response.data.result[0]
        
        if (!result.isSuccess) {
          const errorMessage = result.message || 'Unknown error'
          console.error('❌ [POSTEX CLIENT] Parcel creation error:', errorMessage)
          throw new Error(`Postex error: ${errorMessage}`)
        }

        if (result.data) {
          const parcelNo = result.data.parcel_no
          const tracking = result.data.shipments?.[0]?.tracking
          
          if (tracking && parcelNo) {
            const trackingCode = tracking.tracking_number || tracking.barcode
            
            if (trackingCode) {
              console.log('✅ [POSTEX CLIENT] Parcel created successfully:', {
                tracking_code: trackingCode,
                parcel_id: parcelNo,
                tracking_url: tracking.tracking_url
              })
              
              return {
                tracking_code: trackingCode,
                parcel_id: parcelNo.toString()
              }
            }
          }
        }
      }

      console.warn('⚠️  [POSTEX CLIENT] No tracking code in response')
      console.warn('⚠️  [POSTEX CLIENT] Response data:', JSON.stringify(response.data, null, 2))
      throw new Error('Postex did not return tracking information')

    } catch (error) {
      logPostexError('/api/v1/parcels/bulk', {
        status: error.response?.status,
        message: error.response?.data?.message,
        invalid_fields: error.response?.data?.invalid_fields,
        data: error.response?.data
      })
      throw error
    }
  }

  async getParcelLabel(parcelNo: string): Promise<ArrayBuffer | null> {
    const endpoint = `/api/v1/parcels/${parcelNo}/label`
    try {
      const isProduction = process.env.NODE_ENV === 'production'
      if (!isProduction) {
        const mockPdfBase64 = 'JVBERi0xLjQKMSAwIG9iCjw8IC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUiA+PgplbmRvYm9iCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSA+PgplbmRvYm8KdHJhaWxlcgo8PCAvU2l6ZSA0IC9Sb290IDEgMCA+PgpxdWFkegp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAwIG4gCjAwMDAwMDAwOTcgMDAwMDAwIG4gCjAwMDAwMDAxNTYgMDAwMDAwIG4gCg=='
        const mockPdfBuffer = Buffer.from(mockPdfBase64, 'base64')
        logPostexRequest(endpoint, { parcelNo, mock: true })
        logPostexResponse(endpoint, { byteLength: mockPdfBuffer.byteLength, mock: true })
        return new Uint8Array(mockPdfBuffer).buffer
      }

      if (!this.options.apiKey) {
        throw new Error('API key is required')
      }

      logPostexRequest(endpoint, { parcelNo })

      const response = await this.client.get(endpoint, {
        responseType: 'arraybuffer'
      })

      logPostexResponse(endpoint, { byteLength: response.data?.byteLength })

      if (response.data && response.data.byteLength > 0) {
        return response.data as ArrayBuffer
      }

      return null
    } catch (error) {
      logPostexError(endpoint, {
        status: error.response?.status,
        message: error.response?.data?.message,
        data: error.response?.data
      })
      throw error
    }
  }

  async getParcelDetail(parcelId: string): Promise<PostexParcelDetailResponse | null> {
    const endpoint = `/api/v1/parcels/${parcelId}`
    try {
      if (!this.options.apiKey) {
        throw new Error('API key is required')
      }

      logPostexRequest(endpoint, { parcelId })

      const response = await this.client.get<PostexParcelDetailResponse>(endpoint)

      logPostexResponse(endpoint, response.data)

      return response.data
    } catch (error) {
      logPostexError(endpoint, {
        status: error.response?.status,
        message: error.response?.data?.message,
        data: error.response?.data
      })
      throw error
    }
  }
}

