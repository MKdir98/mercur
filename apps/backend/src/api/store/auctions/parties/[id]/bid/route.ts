import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { z } from 'zod'
import { getBidProducerService } from '../../../../../../services/auction/bid-producer'
import { getTimerService } from '../../../../../../services/auction/timer-service'

const bidSchema = z.object({
  amount: z.number().positive(),
})

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const { id: partyId } = req.params
  const customerId = req.auth_context.actor_id

  const { amount } = bidSchema.parse(req.body)

  try {
    const bidProducer = await getBidProducerService()
    const result = await bidProducer.produceBid(partyId, customerId, amount)

    if (result.success) {
      const timerService = getTimerService()
      if (timerService) {
        await timerService.resetTimer(partyId)
      }

      res.json({
        success: true,
        message: result.message,
        correlation_id: result.correlationId,
      })
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      })
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to place bid',
      error: error.message,
    })
  }
}

