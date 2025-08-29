export const defaultAdminCityFields = [
  'id',
  'name',
  'country_code',
  'created_at',
  'updated_at'
]

export const listCityQueryConfig = {
  defaults: defaultAdminCityFields,
  isList: true
}

export const retrieveCityQueryConfig = {
  defaults: defaultAdminCityFields,
  isList: false
} 