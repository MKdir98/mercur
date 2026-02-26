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

  const shipmentResult = await knex.raw(
    `SELECT postex_parcel_id 
     FROM postex_shipment 
     WHERE fulfillment_id = ? AND order_id = ? 
     LIMIT 1`,
    [fulfillmentId, orderId]
  )

  if (!shipmentResult?.rows?.[0]?.postex_parcel_id) {
    return res.status(404).json({
      message: 'لیبل مرسوله پستکس یافت نشد'
    })
  }

  const parcelNo = shipmentResult.rows[0].postex_parcel_id

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
