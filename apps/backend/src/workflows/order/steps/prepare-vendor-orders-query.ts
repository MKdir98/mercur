import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

const SAFE_ORDER_FIELDS_LIST = [
  'id',
  'display_id',
  'email',
  'status',
  'version',
  'currency_code',
  'total',
  'subtotal',
  'metadata',
  'created_at',
  'updated_at',
  'region_id',
  'fulfillments.id',
  'fulfillments.packed_at',
  'fulfillments.shipped_at',
  'fulfillments.delivered_at',
  'fulfillments.canceled_at'
]

const SAFE_ORDER_FIELDS_RETRIEVE = [
  ...SAFE_ORDER_FIELDS_LIST,
  'items.id',
  'items.quantity',
  'items.requires_shipping',
  'items.title',
  'items.variant_sku',
  'items.unit_price',
  'items.subtotal',
  'items.thumbnail',
  'items.detail',
  'items.created_at',
  'fulfillments.items',
  'fulfillments.location_id',
  'fulfillments.provider_id',
  'fulfillments.requires_shipping',
  'fulfillments.created_at',
  'fulfillments.canceled_at',
  'fulfillments.shipped_at',
  'fulfillments.delivered_at',
  'fulfillments.labels'
]

type PrepareInput = {
  fields?: string[]
  variables: Record<string, unknown>
}

const isRetrieve = (variables: Record<string, unknown>) => {
  const filters = variables?.filters as { id?: string | string[] } | undefined
  const id = filters?.id
  return typeof id === 'string'
}

export const prepareVendorOrdersQueryStep = createStep(
  'prepare-vendor-orders-query',
  async (input: PrepareInput) => {
    const fields = isRetrieve(input.variables)
      ? SAFE_ORDER_FIELDS_RETRIEVE
      : SAFE_ORDER_FIELDS_LIST
    return new StepResponse({
      fields,
      variables: input.variables
    })
  }
)
