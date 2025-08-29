import { ExecArgs } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { createIranStatesAndCities } from './seed/seed-functions'

export default async function seedCities({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  logger.info('Seeding Iran states & cities...')
  await createIranStatesAndCities(container)
  logger.info('Done seeding Iran states & cities')
} 