export const IRAN_PAYMENT_GATEWAY_REFERENCE_PDF_URLS = {
  parsianSaleService:
    'https://f005.backblazeb2.com/file/banktest/Parsian/2020/SaleService.pdf',
  parsianConfirmService:
    'https://f005.backblazeb2.com/file/banktest/Parsian/2020/ConfirmService.pdf',
  parsianPgwStatusCodes:
    'https://f005.backblazeb2.com/file/banktest/Parsian/2020/PGWStatusCodes.pdf',
  sepOnlinePgMerchant:
    'https://f005.backblazeb2.com/file/banktest/Saman/1402_SEP_OnlinePG_Merchant%20Document_Minimal_Current%203.3.pdf',
} as const

export const IRAN_BANKTEST_SEP_CREDENTIALS = {
  terminalId: '134759086',
  username: 'user134759085',
  password: '5897972',
} as const

const SEP_PROD = {
  tokenUrl: 'https://sep.shaparak.ir/onlinepg/onlinepg',
  paymentGatewayPostUrl: 'https://sep.shaparak.ir/OnlinePG/OnlinePG',
  sendTokenUrl: 'https://sep.shaparak.ir/OnlinePG/SendToken',
  verifyUrl: 'https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/VerifyTransaction',
  reverseUrl: 'https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/ReverseTransaction',
} as const

const SEP_BANKTEST = {
  tokenUrl: 'https://sandbox.banktest.ir/saman/sep.shaparak.ir/onlinepg/onlinepg',
  paymentGatewayPostUrl:
    'https://sandbox.banktest.ir/saman/sep.shaparak.ir/OnlinePG/OnlinePG',
  sendTokenUrl:
    'https://sandbox.banktest.ir/saman/sep.shaparak.ir/OnlinePG/SendToken',
  verifyUrl:
    'https://sandbox.banktest.ir/saman/sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/VerifyTransaction',
  reverseUrl:
    'https://sandbox.banktest.ir/saman/sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/ReverseTransaction',
} as const

export type SepIpgResolvedEndpoints = {
  tokenUrl: string
  paymentGatewayPostUrl: string
  sendTokenUrl: string
  verifyUrl: string
  reverseUrl: string
}

export function resolveSepIpgEndpoints(sandbox: boolean): SepIpgResolvedEndpoints {
  if (!sandbox) {
    return {
      tokenUrl: process.env.SEP_PROD_TOKEN_URL?.trim() || SEP_PROD.tokenUrl,
      paymentGatewayPostUrl:
        process.env.SEP_PROD_PAYMENT_POST_URL?.trim() ||
        SEP_PROD.paymentGatewayPostUrl,
      sendTokenUrl:
        process.env.SEP_PROD_SEND_TOKEN_URL?.trim() || SEP_PROD.sendTokenUrl,
      verifyUrl: process.env.SEP_PROD_VERIFY_URL?.trim() || SEP_PROD.verifyUrl,
      reverseUrl: process.env.SEP_PROD_REVERSE_URL?.trim() || SEP_PROD.reverseUrl,
    }
  }

  return {
    tokenUrl:
      process.env.SEP_BANKTEST_TOKEN_URL?.trim() || SEP_BANKTEST.tokenUrl,
    paymentGatewayPostUrl:
      process.env.SEP_BANKTEST_PAYMENT_POST_URL?.trim() ||
      SEP_BANKTEST.paymentGatewayPostUrl,
    sendTokenUrl:
      process.env.SEP_BANKTEST_SEND_TOKEN_URL?.trim() ||
      SEP_BANKTEST.sendTokenUrl,
    verifyUrl:
      process.env.SEP_BANKTEST_VERIFY_URL?.trim() || SEP_BANKTEST.verifyUrl,
    reverseUrl:
      process.env.SEP_BANKTEST_REVERSE_URL?.trim() || SEP_BANKTEST.reverseUrl,
  }
}

export const IRAN_BANKTEST_PARSIAN_MERCHANT_ID = 'KtONZc504EpMCNIdb9N3' as const

export const IRAN_BANKTEST_PARSIAN_DEFAULT_SOAP_LOGIN_ACCOUNT = '14083669' as const

export const IRAN_BANKTEST_PARSIAN_WSDL_REFERENCE_URLS = {
  saleWsdl:
    'https://sandbox.banktest.ir/parsian/pec.shaparak.ir/NewIPGServices/Sale/SaleService.asmx?wsdl',
  confirmWsdl:
    'https://sandbox.banktest.ir/parsian/pec.shaparak.ir/NewIPGServices/Confirm/ConfirmService.asmx?wsdl',
  reversalWsdl:
    'https://sandbox.banktest.ir/parsian/pec.shaparak.ir/NewIPGServices/Reverse/ReversalService.asmx?wsdl',
  multiplexSaleWsdl:
    'https://sandbox.banktest.ir/parsian/pec.shaparak.ir/NewIPGServices/MultiplexedSale/OnlineMultiplexedSalePaymentService.asmx?wsdl',
} as const

const PARSIAN_PROD = {
  saleSoapUrl: 'https://pec.shaparak.ir/NewIPGServices/Sale/SaleService.asmx',
  confirmSoapUrl:
    'https://pec.shaparak.ir/NewIPGServices/Confirm/ConfirmService.asmx',
  paymentPageTokenPrefix: 'https://pec.shaparak.ir/NewIPG/?Token=',
} as const

const PARSIAN_BANKTEST = {
  saleSoapUrl:
    'https://sandbox.banktest.ir/parsian/pec.shaparak.ir/NewIPGServices/Sale/SaleService.asmx',
  confirmSoapUrl:
    'https://sandbox.banktest.ir/parsian/pec.shaparak.ir/NewIPGServices/Confirm/ConfirmService.asmx',
  paymentPageTokenPrefix:
    'https://sandbox.banktest.ir/parsian/pec.shaparak.ir/NewIPG/?Token=',
} as const

export type ParsianSoapResolvedUrls = {
  saleSoapUrl: string
  confirmSoapUrl: string
  paymentPageTokenPrefix: string
}

export function resolveParsianSoapUrls(sandbox: boolean): ParsianSoapResolvedUrls {
  if (!sandbox) {
    return {
      saleSoapUrl:
        process.env.PARSIAN_PROD_SALE_SOAP_URL?.trim() || PARSIAN_PROD.saleSoapUrl,
      confirmSoapUrl:
        process.env.PARSIAN_PROD_CONFIRM_SOAP_URL?.trim() ||
        PARSIAN_PROD.confirmSoapUrl,
      paymentPageTokenPrefix:
        process.env.PARSIAN_PROD_PAYMENT_TOKEN_PREFIX?.trim() ||
        PARSIAN_PROD.paymentPageTokenPrefix,
    }
  }

  return {
    saleSoapUrl:
      process.env.PARSIAN_SANDBOX_SALE_URL?.trim() || PARSIAN_BANKTEST.saleSoapUrl,
    confirmSoapUrl:
      process.env.PARSIAN_SANDBOX_CONFIRM_URL?.trim() ||
      PARSIAN_BANKTEST.confirmSoapUrl,
    paymentPageTokenPrefix:
      process.env.PARSIAN_SANDBOX_PAYMENT_TOKEN_PREFIX?.trim() ||
      PARSIAN_BANKTEST.paymentPageTokenPrefix,
  }
}
