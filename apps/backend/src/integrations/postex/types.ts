export type DeliveryMode = 'delivery' | 'pickup'

export interface RateRequestPayload {
  delivery_mode: DeliveryMode
  destination: {
    province: string
    city: string
    postal_code: string
    address_1: string
    phone: string
  }
  parcels: Array<{
    weight_kg: number
    length_cm: number
    width_cm: number
    height_cm: number
  }>
}

export interface RateOption {
  service_code: string
  service_name: string
  price: number
  currency: string
  eta?: string
  delivery_mode: DeliveryMode
}

export interface CreateShipmentRequest {
  order_id: string
  delivery_mode: DeliveryMode
  service_code: string
  recipient: {
    first_name: string
    last_name: string
    phone: string
    email: string
    province: string
    city: string
    postal_code: string
    address_1: string
  }
  parcels: RateRequestPayload['parcels']
}

export interface CreateShipmentResponse {
  postex_shipment_id: string
  tracking_number: string
  service_code: string
  delivery_mode: DeliveryMode
  label_url?: string
  label_mime?: string
  label_base64?: string
} 