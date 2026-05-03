export function iranPaymentUseSandbox(): boolean {
  return process.env.IRAN_PAYMENT_USE_SANDBOX === 'true'
}

export function effectiveZarinpalSandbox(): boolean {
  return iranPaymentUseSandbox() || process.env.ZARINPAL_SANDBOX === 'true'
}

export function effectiveSepSandbox(): boolean {
  return iranPaymentUseSandbox() || process.env.SEP_SANDBOX === 'true'
}

export function effectiveParsianSandbox(): boolean {
  return iranPaymentUseSandbox() || process.env.PARSIAN_SANDBOX === 'true'
}
