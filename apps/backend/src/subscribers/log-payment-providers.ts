import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'

export default async function logPaymentProvidersHandler({ event, container }: SubscriberArgs<any>) {
  console.log('🟢 [BACKEND] Application started - checking payment providers')
  
  try {
    const paymentModule = container.resolve('paymentModuleService') as { listPaymentProviders: () => Promise<unknown[]> }
    const providers = await paymentModule.listPaymentProviders()
    
    console.log('🟢 [BACKEND] Available payment providers:', providers.map((p: any) => ({
      id: p.id,
      is_enabled: p.is_enabled
    })))
  } catch (error) {
    console.error('❌ [BACKEND] Error loading payment providers:', error)
  }
}

export const config: SubscriberConfig = {
  event: 'application.started',
}
