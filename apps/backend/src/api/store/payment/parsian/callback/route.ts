import { MedusaRequest, MedusaResponse } from '@medusajs/framework'

import { handleParsianPaymentCallback } from '../../../../../lib/handle-parsian-payment-callback'

export const GET = (req: MedusaRequest, res: MedusaResponse) =>
  handleParsianPaymentCallback(req, res)

export const POST = (req: MedusaRequest, res: MedusaResponse) =>
  handleParsianPaymentCallback(req, res)

export const AUTHENTICATE = false
