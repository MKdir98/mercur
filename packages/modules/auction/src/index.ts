import AuctionModuleService from './service'
import { Module } from '@medusajs/framework/utils'

export default Module('auction', {
  service: AuctionModuleService,
})

export * from './models/auction'
export * from './models/auction-party'
export * from './models/bid'






