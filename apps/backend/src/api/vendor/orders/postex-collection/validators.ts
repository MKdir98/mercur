import * as z from 'zod'

export const VendorPostexCollectionBody = z.object({
  order_ids: z.array(z.string()).min(1).max(50)
})

export type VendorPostexCollectionBodyType = z.infer<
  typeof VendorPostexCollectionBody
>
