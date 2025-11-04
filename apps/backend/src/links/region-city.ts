import { defineLink } from '@medusajs/framework/utils'
import RegionModule from '@medusajs/medusa/region'

import CityModule from '@mercurjs/city'

/**
 * Link definition between Region and City modules
 * This allows querying city information when fetching regions
 */
export default defineLink(
  RegionModule.linkable.region,
  CityModule.linkable.city
)

