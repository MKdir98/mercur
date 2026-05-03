import {
  IRAN_BANKTEST_PARSIAN_DEFAULT_SOAP_LOGIN_ACCOUNT,
  IRAN_BANKTEST_SEP_CREDENTIALS,
} from '@mercurjs/framework'

import {
  effectiveParsianSandbox,
  effectiveSepSandbox,
  effectiveZarinpalSandbox,
} from './iran-payment-sandbox'

type ProviderEntry = {
  resolve: string
  id: string
  options: Record<string, unknown>
}

/**
 * Registers every domestic (Iran card) Medusa payment provider in the container.
 *
 * `IRAN_PAYMENT_GATEWAY_PROVIDERS` only controls which gateways appear in the
 * storefront list (`applyGatewayEnvFilter`); it must NOT drop providers from
 * registration, or Awilix cannot resolve ids on existing payment sessions
 * (e.g. pp_zarinpal-gateway_zarinpal) when carts refresh or sessions delete.
 */
export function buildDomesticIranPaymentProviders(): ProviderEntry[] {
  return [
    {
      resolve: '@mercurjs/payment-zarinpal',
      id: 'zarinpal',
      options: {
        merchantId: process.env.ZARINPAL_MERCHANT_ID,
        sandbox: effectiveZarinpalSandbox(),
      },
    },
    {
      resolve: '@mercurjs/payment-sep',
      id: 'sep',
      options: {
        terminalId:
          process.env.SEP_TERMINAL_ID ||
          (effectiveSepSandbox() ? IRAN_BANKTEST_SEP_CREDENTIALS.terminalId : ''),
        sandbox: effectiveSepSandbox(),
      },
    },
    {
      resolve: '@mercurjs/payment-parsian',
      id: 'parsian',
      options: {
        loginAccount:
          process.env.PARSIAN_PIN ||
          (effectiveParsianSandbox()
            ? IRAN_BANKTEST_PARSIAN_DEFAULT_SOAP_LOGIN_ACCOUNT
            : ''),
        sandbox: effectiveParsianSandbox(),
      },
    },
  ]
}
