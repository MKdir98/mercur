/**
 * PostEx delivery flow — HTTP mock test with real DB
 *
 * What's real:  PostgreSQL (postex_shipment, seller, city tables via knex.raw)
 * What's nocked: PostEx HTTP API (https://api.postex.ir)
 * What's mocked: Medusa query.graph, stockLocationModule, fulfillmentModule,
 *                completeOrderWorkflow (these require a full Medusa server)
 */
import nock from 'nock'

import { completeOrderWorkflow } from '@medusajs/medusa/core-flows'

import syncPostexStatusJob from '../../src/jobs/sync-postex-status'
import PostexService from '../../src/modules/postex/service'
import {
  TEST_FULFILLMENT_ID,
  TEST_LOCATION_ID,
  TEST_ORDER_ID,
  cleanupTestData,
  createDb,
  makeMedusaQuery,
  makeMockFulfillmentModule,
  makeMockStockLocation,
  seedFulfillment,
  seedOrder,
  seedPostexShipment,
  seedSeller,
  seedStockLocationLink
} from './fixtures'

// Module-level ref set in beforeAll so the workflow mock can write to real DB
let capturedDb: ReturnType<typeof createDb> | null = null

jest.mock('@medusajs/medusa/core-flows', () => ({
  completeOrderWorkflow: jest.fn().mockImplementation(() => ({
    run: jest
      .fn()
      .mockImplementation(
        async ({ input }: { input: { orderIds: string[] } }) => {
          if (capturedDb) {
            for (const orderId of input.orderIds) {
              await capturedDb.raw(
                `UPDATE "order" SET status = 'completed', updated_at = NOW() WHERE id = ?`,
                [orderId]
              )
            }
          }
        }
      )
  }))
}))

const POSTEX_BASE = 'https://api.postex.ir'
const PARCEL_ID = '6214961595965'
const TRACKING_NUMBER = '210160508400961930000147'

// ─── PostEx API response fixtures ────────────────────────────────────────────

const postexBulkCreateResponse = {
  order_no: 813510,
  pick_up_price: 1200000,
  shipping_price: 895400,
  total_price: 2095400,
  result: [
    {
      isSuccess: true,
      data: {
        sequence_number: 1,
        parcel_no: Number(PARCEL_ID),
        custom_order_no: null,
        custom_reference_no: null,
        is_oversized: false,
        shipments: [
          {
            step: 0,
            tracking: {
              barcode: TRACKING_NUMBER,
              tracking_number: TRACKING_NUMBER,
              tracking_url: null
            },
            shipping_rate: {
              currency: 'IRR',
              amount: 940000,
              total_amount: 1034000
            }
          }
        ],
        order_id: 813510
      }
    }
  ]
}

const postexParcelRegistered = {
  isSuccess: true,
  parcel_no: Number(PARCEL_ID),
  current_status: {
    code: 11112,
    name: 'REGISTREDED',
    group: { code: 2, name: 'IN_PROCESS', title: 'در حال بررسی' }
  }
}

const postexParcelPickedUp = {
  isSuccess: true,
  parcel_no: Number(PARCEL_ID),
  current_status: {
    code: 11201,
    name: 'PICKED_UP',
    group: { code: 3, name: 'COURIER', title: 'تحویل پیک' }
  }
}

const postexParcelDelivered = {
  isSuccess: true,
  parcel_no: Number(PARCEL_ID),
  current_status: {
    code: 11301,
    name: 'APPROVAL_DELIVERED',
    group: { code: 4, name: 'DELIVERED', title: 'تحویل شده' }
  }
}

// ─── Container helper — uses Medusa's real key '__pg_connection__' ─────────────

function makeContainer(
  opts: {
    db?: any
    query?: any
    fulfillmentModule?: any
  } = {}
) {
  return {
    resolve: jest.fn((key: string) => {
      // Medusa uses ContainerRegistrationKeys.PG_CONNECTION = '__pg_connection__'
      if (key === '__pg_connection__') return opts.db ?? null
      if (key === 'query') return opts.query ?? null
      if (key === 'fulfillment') return opts.fulfillmentModule ?? null
      return null
    })
  }
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('PostEx delivery flow — real DB + nocked HTTP', () => {
  const db = createDb()

  const postexOptions = {
    apiKey: process.env.POSTEX_API_KEY || 'test-api-key',
    apiUrl: POSTEX_BASE
  }

  beforeAll(async () => {
    capturedDb = db
    await seedSeller(db)
    await seedStockLocationLink(db)
    await seedFulfillment(db)
    await seedOrder(db)
  })

  afterAll(async () => {
    await cleanupTestData(db)
    await db.destroy()
    nock.restore()
  })

  beforeEach(async () => {
    nock.cleanAll()
    jest.clearAllMocks()
    // PostexClient skips real HTTP in createBulkParcels when NODE_ENV !== 'production'
    process.env.NODE_ENV = 'production'
    // Clear by order_id AND parcel_id — stray rows from prior runs with different order_id
    // would otherwise be picked up by the sync job and consume nock interceptors
    await db.raw(
      `DELETE FROM postex_shipment WHERE order_id = ? OR postex_parcel_id = ?`,
      [TEST_ORDER_ID, PARCEL_ID]
    )
    // Reset fulfillment timestamps and order status so each test starts clean
    await db.raw(
      `UPDATE fulfillment SET shipped_at = NULL, delivered_at = NULL WHERE id = ?`,
      [TEST_FULFILLMENT_ID]
    )
    await db.raw(`UPDATE "order" SET status = 'pending' WHERE id = ?`, [
      TEST_ORDER_ID
    ])
  })

  afterEach(() => {
    process.env.NODE_ENV = 'test'
    nock.cleanAll()
  })

  // ── 1. createPostexShipment ─────────────────────────────────────────────────

  it('creates shipment: nock returns parcel + tracking code is saved in DB', async () => {
    nock(POSTEX_BASE)
      .post('/api/v1/parcels/bulk')
      .reply(200, postexBulkCreateResponse)

    const query = makeMedusaQuery()
    const stockLocationModule = makeMockStockLocation()
    const container = makeContainer({ db, query })

    PostexService.setGlobalContainer(container)
    const service = new PostexService(container, postexOptions)

    const result = await service.createPostexShipment(
      TEST_ORDER_ID,
      TEST_FULFILLMENT_ID,
      TEST_LOCATION_ID,
      { query, knex: db, stockLocationModule }
    )

    expect(result.tracking_number).toBe(TRACKING_NUMBER)
    expect(result.postex_parcel_id).toBe(PARCEL_ID)

    // Verify row exists in real DB
    const { rows } = await db.raw(
      `SELECT * FROM postex_shipment WHERE order_id = ? AND postex_parcel_id = ?`,
      [TEST_ORDER_ID, PARCEL_ID]
    )
    expect(rows.length).toBeGreaterThan(0)
    expect(rows[0].postex_tracking_code).toBe(TRACKING_NUMBER)
    expect(rows[0].status).toBe('confirmed')
  })

  // ── 2. getParcelStatus — IN_PROCESS ────────────────────────────────────────

  it('getParcelStatus returns group code 2 when PostEx says IN_PROCESS', async () => {
    nock(POSTEX_BASE)
      .get(`/api/v1/parcels/${PARCEL_ID}`)
      .reply(200, postexParcelRegistered)

    const container = makeContainer({ db })
    PostexService.setGlobalContainer(container)
    const service = new PostexService(container, postexOptions)

    expect(await service.getParcelStatus(PARCEL_ID)).toBe(2)
  })

  // ── 3. getParcelStatus — DELIVERED ─────────────────────────────────────────

  it('getParcelStatus returns group code 4 when PostEx says DELIVERED', async () => {
    nock(POSTEX_BASE)
      .get(`/api/v1/parcels/${PARCEL_ID}`)
      .reply(200, postexParcelDelivered)

    const container = makeContainer({ db })
    PostexService.setGlobalContainer(container)
    const service = new PostexService(container, postexOptions)

    expect(await service.getParcelStatus(PARCEL_ID)).toBe(4)
  })

  // ── 4. sync job — DELIVERED: updates DB row + calls fulfillment + completes order ─

  it('sync job: nock DELIVERED → DB status = delivered + fulfillment.delivered_at set + order.status = completed', async () => {
    const shipment = await seedPostexShipment(db, {
      id: `ps_sync_del_${Date.now()}`
    })

    nock(POSTEX_BASE)
      .get(`/api/v1/parcels/${shipment.postex_parcel_id}`)
      .reply(200, postexParcelDelivered)

    const fulfillmentModule = makeMockFulfillmentModule(db)
    const container = makeContainer({ db, fulfillmentModule })

    PostexService.setGlobalContainer(container)
    await syncPostexStatusJob(container as any)

    // postex_shipment row
    const { rows: shipmentRows } = await db.raw(
      `SELECT status FROM postex_shipment WHERE id = ?`,
      [shipment.id]
    )
    expect(shipmentRows[0].status).toBe('delivered')

    // fulfillment.delivered_at set in real DB
    const { rows: fulRows } = await db.raw(
      `SELECT shipped_at, delivered_at FROM fulfillment WHERE id = ?`,
      [TEST_FULFILLMENT_ID]
    )
    expect(fulRows[0].delivered_at).not.toBeNull()
    expect(fulRows[0].shipped_at).toBeNull()

    // order.status = completed in real DB
    const { rows: orderRows } = await db.raw(
      `SELECT status FROM "order" WHERE id = ?`,
      [TEST_ORDER_ID]
    )
    expect(orderRows[0].status).toBe('completed')
  })

  // ── 5. sync job — PICKED_UP (group 3): shipped_at set, order NOT completed ──

  it('sync job: nock PICKED_UP → DB status = picked_up + fulfillment.shipped_at set + order stays pending', async () => {
    const shipment = await seedPostexShipment(db, {
      id: `ps_sync_pu_${Date.now()}`
    })

    nock(POSTEX_BASE)
      .get(`/api/v1/parcels/${shipment.postex_parcel_id}`)
      .reply(200, postexParcelPickedUp)

    const fulfillmentModule = makeMockFulfillmentModule(db)
    const container = makeContainer({ db, fulfillmentModule })

    PostexService.setGlobalContainer(container)
    await syncPostexStatusJob(container as any)

    // postex_shipment row
    const { rows: shipmentRows } = await db.raw(
      `SELECT status FROM postex_shipment WHERE id = ?`,
      [shipment.id]
    )
    expect(shipmentRows[0].status).toBe('picked_up')

    // fulfillment.shipped_at set, delivered_at still null
    const { rows: fulRows } = await db.raw(
      `SELECT shipped_at, delivered_at FROM fulfillment WHERE id = ?`,
      [TEST_FULFILLMENT_ID]
    )
    expect(fulRows[0].shipped_at).not.toBeNull()
    expect(fulRows[0].delivered_at).toBeNull()

    // order still pending — completeOrderWorkflow not called at pickup
    const { rows: orderRows } = await db.raw(
      `SELECT status FROM "order" WHERE id = ?`,
      [TEST_ORDER_ID]
    )
    expect(orderRows[0].status).toBe('pending')
  })

  // ── 7. sync job — IN_PROCESS: no fulfillment update ────────────────────────

  it('sync job: nock IN_PROCESS → status = pending_seller, fulfillment NOT marked delivered', async () => {
    const shipment = await seedPostexShipment(db, {
      id: `ps_sync_inp_${Date.now()}`
    })

    nock(POSTEX_BASE)
      .get(`/api/v1/parcels/${shipment.postex_parcel_id}`)
      .reply(200, postexParcelRegistered)

    const fulfillmentModule = makeMockFulfillmentModule()
    const container = makeContainer({ db, fulfillmentModule })

    PostexService.setGlobalContainer(container)
    await syncPostexStatusJob(container as any)

    expect(fulfillmentModule.updateFulfillment).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ delivered_at: expect.anything() })
    )

    const { rows } = await db.raw(
      `SELECT status FROM postex_shipment WHERE id = ?`,
      [shipment.id]
    )
    expect(rows[0].status).toBe('pending_seller')
  })

  // ── 8. full flow: create → registered → delivered ──────────────────────────

  it('full flow: create shipment → poll registered (code 2) → poll delivered (code 4)', async () => {
    nock(POSTEX_BASE)
      .post('/api/v1/parcels/bulk')
      .reply(200, postexBulkCreateResponse)

    const query = makeMedusaQuery()
    const stockLocationModule = makeMockStockLocation()
    const container = makeContainer({ db, query })

    PostexService.setGlobalContainer(container)
    const service = new PostexService(container, postexOptions)

    const created = await service.createPostexShipment(
      TEST_ORDER_ID,
      TEST_FULFILLMENT_ID,
      TEST_LOCATION_ID,
      { query, knex: db, stockLocationModule }
    )
    expect(created.tracking_number).toBe(TRACKING_NUMBER)

    nock(POSTEX_BASE)
      .get(`/api/v1/parcels/${PARCEL_ID}`)
      .reply(200, postexParcelRegistered)
    expect(await service.getParcelStatus(PARCEL_ID)).toBe(2)

    nock(POSTEX_BASE)
      .get(`/api/v1/parcels/${PARCEL_ID}`)
      .reply(200, postexParcelDelivered)
    expect(await service.getParcelStatus(PARCEL_ID)).toBe(4)
  })
})
