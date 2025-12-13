import { z } from 'zod'

export const VendorGetStatesParams = z
  .object({
    fields: z.string().optional(),
    offset: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    country_code: z.string().optional()
  })
  .strict()

export type VendorGetStatesParamsType = z.infer<typeof VendorGetStatesParams>















