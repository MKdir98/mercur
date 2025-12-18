import WalletModuleService from './service'
import { Module } from '@medusajs/framework/utils'

export default Module('wallet', {
  service: WalletModuleService,
})

export * from './models/wallet'
export * from './models/wallet-transaction'
export * from './models/withdraw-request'





