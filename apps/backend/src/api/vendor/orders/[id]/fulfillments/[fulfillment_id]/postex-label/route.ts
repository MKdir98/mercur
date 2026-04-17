import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { PostexClient } from '../../../../../../../integrations/postex/client'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const fulfillmentId = req.params.fulfillment_id
  const orderId = req.params.id

  let row = await knex('postex_shipment')
    .where('fulfillment_id', fulfillmentId)
    .where('order_id', orderId)
    .select('postex_parcel_id')
    .first()

  if (!row?.postex_parcel_id) {
    row = await knex('postex_shipment')
      .where('fulfillment_id', fulfillmentId)
      .select('postex_parcel_id')
      .first()
  }

  if (!row?.postex_parcel_id) {
    row = await knex('postex_shipment')
      .where('order_id', orderId)
      .where('fulfillment_id', 'like', 'temp_%')
      .select('postex_parcel_id')
      .orderBy('created_at', 'desc')
      .first()
  }

  const parcelNo = row?.postex_parcel_id

  if (!parcelNo) {
    return res.status(404).json({
      message: 'لیبل مرسوله پستکس یافت نشد'
    })
  }

  try {
    const postexClient = new PostexClient({
      apiKey: process.env.POSTEX_API_KEY,
      apiUrl: process.env.POSTEX_API_URL || 'https://api.postex.ir'
    })

    const pdfBuffer = await postexClient.getParcelLabel(parcelNo)

    if (!pdfBuffer || pdfBuffer.byteLength === 0) {
      return res.status(404).json({
        message: 'لیبل مرسوله از پستکس دریافت نشد'
      })
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `inline; filename="postex-label-${parcelNo}.pdf"`
    )
    res.send(Buffer.from(pdfBuffer))
  } catch (error: any) {
    console.error('❌ [POSTEX LABEL] Error fetching label', {
      parcelNo,
      message: error.message
    })
    return res.status(500).json({
      message: 'خطا در دریافت لیبل مرسوله پستکس'
    })
  }
}
