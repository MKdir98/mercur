import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { z } from 'zod'

const depositSchema = z.object({
  amount: z.number().positive(),
  callback_url: z.string().url(),
  cell_number: z.string().optional(),
})

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const walletModule = req.scope.resolve('walletModuleService') as any
  const sepModule = req.scope.resolve('sepModuleService') as any
  const customerId = req.auth_context.actor_id

  const { amount, callback_url, cell_number } = depositSchema.parse(req.body)

  let wallet = await walletModule.getWalletByCustomerId(customerId)

  if (!wallet) {
    wallet = await walletModule.createWalletForCustomer(customerId)
  }

  const resNum = `W${wallet.id}-${Date.now()}`

  const payment = await sepModule.requestPayment(
    amount,
    resNum,
    callback_url,
    {
      wallet_id: wallet.id,
      customer_id: customerId,
      type: 'deposit',
      description: 'شارژ کیف پول',
    },
    cell_number
  )

  const htmlForm = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>انتقال به درگاه پرداخت</title>
    </head>
    <body>
      <form id="sepPaymentForm" action="${payment.paymentUrl}" method="POST">
        <input type="hidden" name="Token" value="${payment.token}">
        <input type="hidden" name="GetMethod" value="">
      </form>
      <script>
        document.getElementById('sepPaymentForm').submit();
      </script>
    </body>
    </html>
  `

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(htmlForm)
}


