export type DeliveryMode = 'delivery' | 'pickup'

export enum PostexStatusCode {
  PAYMENT_PENDING = 1,
  PENDING_SELLER = 2,
  ON_THE_WAY = 3,
  FULL_DELIVERED = 4,
  RETURNED = 5,
  DELIVERING = 7,
  CANCELED = 8,
  READY_TO_ACCEPT = 9,
  OTHER = 10
}

export interface PostexParcelDetailResponse {
  isSuccess: boolean
  current_status: {
    group: {
      code: number
    }
    code: string
  }
  tracking_code?: string
  parcel_id?: string
}

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