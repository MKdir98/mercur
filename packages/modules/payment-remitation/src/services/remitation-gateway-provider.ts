import RemitationProvider from "../core/remitation-provider"

class RemitationGatewayProviderService extends RemitationProvider {
  static identifier = "remitation-gateway"

  constructor(container: any, options: ConstructorParameters<typeof RemitationProvider>[1]) {
    super(container, options)
  }
}

export default RemitationGatewayProviderService
