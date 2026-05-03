import SepProvider from '../core/sep-provider'

type SepOptions = {
  terminalId: string
  sandbox: boolean
}

class SepGatewayProviderService extends SepProvider {
  static identifier = 'sep-gateway'

  constructor(container: unknown, options: SepOptions) {
    super(container, options)
  }
}

export default SepGatewayProviderService
