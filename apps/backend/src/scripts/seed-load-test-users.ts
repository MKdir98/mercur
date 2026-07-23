/**
 * Seed test customers for load testing.
 * Run: npx medusa exec src/scripts/seed-load-test-users.ts
 *
 * Configurable via env vars:
 *   LOAD_TEST_USER_COUNT=50   number of users to seed (default 50)
 *   LOAD_TEST_PASSWORD=...    password for all seeded users (default LoadTest@123)
 *   LOAD_TEST_OUTPUT_FILE=... where to write the credentials JSON (default /tmp/load-test-users.json)
 *
 * Example: LOAD_TEST_USER_COUNT=20 npx medusa exec src/scripts/seed-load-test-users.ts
 *
 * Each user gets:
 *   email: loadtest_001@doorfestival.test ... loadtest_0NN@doorfestival.test
 *   phone: +989000000001 ... +989000000NN
 *
 * Outputs a JSON credentials file for k6 scripts to consume.
 *
 * Re-running this script never creates duplicate customers: existing
 * loadtest_* customers are reused and have their password re-enabled
 * (undoing disable-load-test-users.ts), instead of being recreated.
 * Run disable-load-test-users.ts after a load test to block their login.
 */
import bcrypt from 'bcrypt'
import * as fs from 'fs'

import { ExecArgs } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'

const USER_COUNT = Number(process.env.LOAD_TEST_USER_COUNT || 50)
const PASSWORD = process.env.LOAD_TEST_PASSWORD || 'LoadTest@123'
const OUTPUT_FILE = process.env.LOAD_TEST_OUTPUT_FILE || '/tmp/load-test-users.json'

export default async function seedLoadTestUsers({ container }: ExecArgs) {
  const customerModule = container.resolve(Modules.CUSTOMER)

  const passwordHash = await bcrypt.hash(PASSWORD, 10)

  const users: {
    email: string
    phone: string
    password: string
    customerId?: string
  }[] = []

  for (let i = 1; i <= USER_COUNT; i++) {
    const index = String(i).padStart(3, '0')
    const email = `loadtest_${index}@doorfestival.test`
    const phone = `+9890000${String(i).padStart(5, '0')}`

    try {
      const existing = await customerModule.listCustomers({ email })
      if (existing.length > 0) {
        const customer = existing[0]
        await customerModule.updateCustomers(customer.id, {
          metadata: { ...customer.metadata, password_hash: passwordHash }
        })
        console.log(`[reuse] ${email} already exists (id: ${customer.id}), password re-enabled`)
        users.push({
          email,
          phone,
          password: PASSWORD,
          customerId: customer.id
        })
        continue
      }

      const [customer] = await customerModule.createCustomers([
        {
          email,
          phone,
          first_name: 'LoadTest',
          last_name: `User${index}`,
          has_account: true,
          metadata: { password_hash: passwordHash }
        }
      ])

      console.log(`[ok] created ${email} (id: ${customer.id})`)
      users.push({ email, phone, password: PASSWORD, customerId: customer.id })
    } catch (err) {
      console.error(
        `[error] ${email}:`,
        err instanceof Error ? err.message : err
      )
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(users, null, 2))
  console.log(`\nDone. ${users.length} users written to ${OUTPUT_FILE}`)
}
