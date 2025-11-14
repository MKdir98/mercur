export const defaultVendorCityFields = [
  'id',
  'name',
  'country_code',
  'state_id',
  'postex_city_code',
  'created_at',
  'updated_at'
]

export const vendorCitiesQueryConfig = {
  list: {
    defaults: defaultVendorCityFields,
    isList: true
  },
  retrieve: {
    defaults: defaultVendorCityFields,
    isList: false
  }
} 