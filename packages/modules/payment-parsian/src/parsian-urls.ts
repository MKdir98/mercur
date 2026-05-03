import type { ParsianSoapResolvedUrls } from '@mercurjs/framework'
import { resolveParsianSoapUrls } from '@mercurjs/framework'

export type ParsianGatewayUrls = ParsianSoapResolvedUrls

export function getParsianGatewayUrls(sandbox: boolean): ParsianGatewayUrls {
  return resolveParsianSoapUrls(sandbox)
}
