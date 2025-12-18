import ZarinpalModuleService from './service'
import { Module } from '@medusajs/framework/utils'

export default Module('zarinpal', {
  service: ZarinpalModuleService,
})

export * from './models/zarinpal-transaction'





