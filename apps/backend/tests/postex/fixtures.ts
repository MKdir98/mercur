/**
 * DB fixtures for PostEx tests.
 * Uses real DB (knex direct) — seeds test rows and tears them down after each test.
 * Medusa internals (query.graph, stockLocationModule, fulfillmentModule) are mocked
 * because they need a full Medusa server. Our custom tables hit the real DB.
 */
import knex, { Knex } from 'knex'

export const TEST_SELLER_ID = 'seller_postex_test_01'
export const TEST_LOCATION_ID = 'loc_postex_test_01'
export const TEST_ORDER_ID = 'order_postex_test_01'
export const TEST_FULFILLMENT_ID = 'ful_postex_test_01'

export function createDb(): Knex {
  const url =
    process.env.DATABASE_URL ||
    'postgres://mercuruser:password@localhost:5434/mercur'

  return knex({
    client: 'pg',
    connection: url
  })
}

export async function seedSeller(db: Knex) {
  await db.raw(
    `INSERT INTO seller (id, name, handle, phone, postal_code, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [
      TEST_SELLER_ID,
      'Uott Test Seller',
      'uott-test-seller',
      '09128877401',
      '1111111111'
    ]
  )
}

export async function seedStockLocationLink(db: Knex) {
  await db.raw(
    `INSERT INTO seller_seller_stock_location_stock_location
       (id, seller_id, stock_location_id, deleted_at)
     VALUES (?, ?, ?, NULL)
     ON CONFLICT DO NOTHING`,
    ['link_postex_test_01', TEST_SELLER_ID, TEST_LOCATION_ID]
  )
}

export async function seedPostexShipment(
  db: Knex,
  overrides: Partial<{
    id: string
    fulfillment_id: string
    order_id: string
    postex_parcel_id: string
    postex_tracking_code: string
    status: string
  }> = {}
) {
  const row = {
    id: overrides.id ?? `ps_test_${Date.now()}`,
    fulfillment_id: overrides.fulfillment_id ?? TEST_FULFILLMENT_ID,
    order_id: overrides.order_id ?? TEST_ORDER_ID,
    postex_parcel_id: overrides.postex_parcel_id ?? '6214961595965',
    postex_tracking_code:
      overrides.postex_tracking_code ?? '210160508400961930000147',
    status: overrides.status ?? 'confirmed'
  }

  await db.raw(
    `INSERT INTO postex_shipment
       (id, fulfillment_id, order_id, postex_parcel_id, postex_tracking_code,
        postex_request_data, postex_response_data, pickup_requested_at, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), NOW())`,
    [
      row.id,
      row.fulfillment_id,
      row.order_id,
      row.postex_parcel_id,
      row.postex_tracking_code,
      JSON.stringify({ mode: 'test' }),
      JSON.stringify({ mode: 'test' }),
      row.status
    ]
  )

  return row
}

export async function seedFulfillment(db: Knex) {
  await db.raw(
    `INSERT INTO fulfillment (id, location_id, requires_shipping, created_at, updated_at)
     VALUES (?, ?, true, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [TEST_FULFILLMENT_ID, TEST_LOCATION_ID]
  )
}

export async function seedOrder(db: Knex) {
  await db.raw(
    `INSERT INTO "order" (id, status, currency_code, version, is_draft_order, created_at, updated_at)
     VALUES (?, 'pending', 'IRR', 1, false, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [TEST_ORDER_ID]
  )
}

export async function cleanupTestData(db: Knex) {
  await db.raw(`DELETE FROM postex_shipment WHERE order_id = ?`, [
    TEST_ORDER_ID
  ])
  await db.raw(`DELETE FROM fulfillment WHERE id = ?`, [TEST_FULFILLMENT_ID])
  await db.raw(`DELETE FROM "order" WHERE id = ?`, [TEST_ORDER_ID])
  await db.raw(
    `DELETE FROM seller_seller_stock_location_stock_location WHERE id = ?`,
    ['link_postex_test_01']
  )
  await db.raw(`DELETE FROM seller WHERE id = ?`, [TEST_SELLER_ID])
}

// ─── Medusa internals: still mocked (need full Medusa server) ──────────────────

export function makeMedusaQuery(orderOverride = {}) {
  const baseOrder = {
    id: TEST_ORDER_ID,
    shipping_address: {
      first_name: 'مهدی',
      last_name: 'کرمی',
      address_1: 'بزرگراه فتح',
      address_2: '',
      city: 'تهران',
      province: 'تهران',
      postal_code: '1378679119',
      phone: '09379612324'
    },
    items: [
      {
        id: 'item_01',
        variant_id: 'var_01',
        product_id: 'prod_01',
        unit_price: 3500000,
        quantity: 1
      }
    ],
    shipping_methods: [{ id: 'sm_01', shipping_option_id: 'so_01' }],
    customer: { phone: '09379612324', first_name: 'مهدی', last_name: 'کرمی' }
  }

  const order = { ...baseOrder, ...orderOverride }

  return {
    graph: jest.fn(({ entity }) => {
      if (entity === 'order') return Promise.resolve({ data: [order] })
      if (entity === 'shipping_option')
        return Promise.resolve({
          data: [{ id: 'so_01', provider_id: 'pp_postex' }]
        })
      return Promise.resolve({ data: [] })
    })
  }
}

export function makeMockStockLocation() {
  return {
    retrieveStockLocation: jest.fn().mockResolvedValue({
      id: TEST_LOCATION_ID,
      address: {
        address_1: 'میدان ونک خ خدامی',
        address_2: '',
        city: 'تهران',
        province: 'تهران',
        postal_code: '1111111111',
        phone: '09128877401'
      }
    })
  }
}

export function makeMockFulfillmentModule(db?: Knex) {
  return {
    updateFulfillment: jest
      .fn()
      .mockImplementation(
        async (id: string, updates: Record<string, unknown>) => {
          if (db) {
            const setClauses = Object.keys(updates)
              .map((k) => `${k} = ?`)
              .join(', ')
            await db.raw(
              `UPDATE fulfillment SET ${setClauses}, updated_at = NOW() WHERE id = ?`,
              [...Object.values(updates), id]
            )
          }
          return {}
        }
      )
  }
}
