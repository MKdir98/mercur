/**
 * Disable the load-test customers created by seed-load-test-users.ts.
 * Run: npx medusa exec src/scripts/disable-load-test-users.ts
 *
 * Clears metadata.password_hash for all loadtest_*@doorfestival.test
 * customers. /store/auth/login rejects login when password_hash is
 * missing (see api/store/auth/login/route.ts), so this blocks the
 * load-test accounts without deleting them. Run seed-load-test-users.ts
 * again before the next load test to re-enable them.
 */
import { ExecArgs } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'

export default async function disableLoadTestUsers({ container }: ExecArgs) {
  const customerModule = container.resolve(Modules.CUSTOMER)

  const customers = await customerModule.listCustomers({
    email: { $like: 'loadtest_%@doorfestival.test' }
  })

  if (customers.length === 0) {
    console.log('No load-test customers found.')
    return
  }

  for (const customer of customers) {
    const { password_hash, ...restMetadata } = customer.metadata ?? {}

    await customerModule.updateCustomers(customer.id, {
      metadata: restMetadata
    })
    console.log(`[disabled] ${customer.email} (id: ${customer.id})`)
  }

  console.log(`\nDone. ${customers.length} load-test users disabled.`)
}
