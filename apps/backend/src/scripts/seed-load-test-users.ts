/**
 * Seed 50 test customers for load testing.
 * Run: npx medusa exec src/scripts/seed-load-test-users.ts
 *
 * Each user gets:
 *   email: loadtest_001@doorfestival.test ... loadtest_050@doorfestival.test
 *   password: LoadTest@123
 *   phone: +989000000001 ... +989000000050
 *
 * Outputs /tmp/load-test-users.json for k6 scripts to consume.
 */
import bcrypt from 'bcrypt'
import * as fs from 'fs'

import { ExecArgs } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'

const USER_COUNT = 50
const PASSWORD = 'LoadTest@123'
const OUTPUT_FILE = '/tmp/load-test-users.json'

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
        console.log(`[skip] ${email} already exists (id: ${existing[0].id})`)
        users.push({
          email,
          phone,
          password: PASSWORD,
          customerId: existing[0].id
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
