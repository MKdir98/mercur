import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const resNumRaw = req.query.res_num
  const resNum = typeof resNumRaw === 'string' ? resNumRaw : ''

  if (!resNum) {
    res.status(400).send('missing res_num')
    return
  }

  const paymentModule = req.scope.resolve(Modules.PAYMENT) as {
    listPaymentSessions: (q: { data: Record<string, string> }) => Promise<
      { data?: Record<string, unknown> }[]
    >
  }

  const sessions = await paymentModule.listPaymentSessions({
    data: { res_num: resNum },
  })

  const session = sessions?.[0]
  const data = session?.data as Record<string, unknown> | undefined
  const token = data?.sep_token as string | undefined
  const postUrl = data?.sep_post_url as string | undefined

  if (!token || !postUrl) {
    res.status(404).send('payment session not found')
    return
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Redirect</title>
</head>
<body>
<form id="f" action="${postUrl}" method="POST">
<input type="hidden" name="Token" value="${String(token).replace(/"/g, '&quot;')}">
<input type="hidden" name="GetMethod" value="">
</form>
<script>document.getElementById('f').submit();</script>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
}

export const AUTHENTICATE = false
