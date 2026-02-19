import ZarinpalProvider from '../core/zarinpal-provider'

class ZarinpalGatewayProviderService extends ZarinpalProvider {
  static identifier = 'zarinpal-gateway'

  constructor(_, options) {
    super(_, options)
  }
}

export default ZarinpalGatewayProviderService
