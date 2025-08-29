import { z } from 'zod'

export const AdminGetCitiesParams = z
  .object({
    fields: z.string().optional(),
    offset: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    country_code: z.string().optional(),
    name: z.string().optional()
  })
  .strict()

export type AdminGetCitiesParamsType = z.infer<typeof AdminGetCitiesParams>

export const AdminCreateCity = z
  .object({
    name: z.string(),
    country_code: z.string().length(2)
  })
  .strict()

export type AdminCreateCityType = z.infer<typeof AdminCreateCity>

export const AdminUpdateCity = z
  .object({
    name: z.string().optional(),
    country_code: z.string().length(2).optional()
  })
  .strict()

export type AdminUpdateCityType = z.infer<typeof AdminUpdateCity>

export const AdminGetCityParams = z
  .object({
    fields: z.string().optional()
  })
  .strict()

export type AdminGetCityParamsType = z.infer<typeof AdminGetCityParams> 