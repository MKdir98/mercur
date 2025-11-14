export const defaultVendorStateFields = [
  'id',
  'name',
  'country_code',
  'postex_province_code',
  'created_at',
  'updated_at'
]

export const vendorStatesQueryConfig = {
  list: {
    defaults: defaultVendorStateFields,
    isList: true
  },
  retrieve: {
    defaults: defaultVendorStateFields,
    isList: false
  }
}








