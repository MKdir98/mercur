export const vendorStockLocationFields = [
  'id',
  'metadata',
  'name',
  'address.id',
  'address.address_1',
  'address.address_2',
  'address.city',
  'address.city_id',
  'address.country_code',
  'address.phone',
  'address.province',
  'address.postal_code',
  'address.metadata',
  'fulfillment_sets.id',
  'fulfillment_sets.type',
  'fulfillment_sets.service_zones.id',
  'fulfillment_sets.service_zones.shipping_options.id',
  'fulfillment_sets.service_zones.shipping_options.provider_id'
]

export const vendorStockLocationQueryConfig = {
  list: {
    defaults: vendorStockLocationFields,
    isList: true
  },
  retrieve: {
    defaults: vendorStockLocationFields,
    isList: false
  }
}
