import ParsianProvider from '../core/parsian-provider'

type ParsianOptions = {
  loginAccount: string
  sandbox: boolean
}

class ParsianGatewayProviderService extends ParsianProvider {
  static identifier = 'parsian-gateway'

  constructor(container: unknown, options: ParsianOptions) {
    super(container, options)
  }
}

export default ParsianGatewayProviderService
