export const defaultVendorCityFields = [
  'id',
  'name',
  'country_code',
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