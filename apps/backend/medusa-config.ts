import { defineConfig, loadEnv } from '@medusajs/framework/utils'

import { IRAN_BANKTEST_SEP_CREDENTIALS } from '@mercurjs/framework'

import { buildDomesticIranPaymentProviders } from './src/lib/build-domestic-iran-payment-providers'
import {
  effectiveRemitationSandbox,
  effectiveSepSandbox,
  effectiveZarinpalSandbox
} from './src/lib/iran-payment-sandbox'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const useRemitationPaymentGateway =
  process.env.USE_REMITATION_PAYMENT_GATEWAY === 'true'

const domesticPaymentProviders = useRemitationPaymentGateway
  ? [
      {
        resolve: '@mercurjs/payment-remitation',
        id: 'remitation',
        options: {
          accessKey: process.env.REMITATION_ACCESS_KEY || '',
          secretKey: process.env.REMITATION_SECRET_KEY || '',
          baseUrl:
            process.env.REMITATION_API_BASE_URL ||
            'https://api.merchant.remitation.com/api',
          provider:
            process.env.REMITATION_PAYMENT_PROVIDER === 'mollie'
              ? 'mollie'
              : 'stripe',
          currency: process.env.REMITATION_PAYMENT_CURRENCY || 'USD',
          rialPerUsd: process.env.REMITATION_RIAL_PER_USD
            ? parseFloat(process.env.REMITATION_RIAL_PER_USD)
            : undefined,
          sandbox: effectiveRemitationSandbox()
        }
      }
    ]
  : buildDomesticIranPaymentProviders()

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      // @ts-expect-error: vendorCors is not a valid config
      vendorCors: process.env.VENDOR_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || 'supersecret',
      cookieSecret: process.env.COOKIE_SECRET || 'supersecret'
    }
  },
  admin: {
    vite: () => ({
      server: {
        allowedHosts: true
      }
    })
  },
  modules: [
    { resolve: '@mercurjs/service-log' },
    { resolve: '@mercurjs/seller' },
    { resolve: '@mercurjs/reviews' },
    { resolve: '@mercurjs/marketplace' },
    { resolve: '@mercurjs/configuration' },
    { resolve: '@mercurjs/translations' },
    { resolve: '@mercurjs/homepage-media' },
    { resolve: '@mercurjs/order-return-request' },
    { resolve: '@mercurjs/requests' },
    { resolve: '@mercurjs/brand' },
    { resolve: '@mercurjs/wishlist' },
    { resolve: '@mercurjs/wallet' },
    { resolve: '@mercurjs/auction' },
    {
      resolve: '@mercurjs/zarinpal',
      options: {
        merchantId: process.env.ZARINPAL_MERCHANT_ID,
        sandbox: effectiveZarinpalSandbox()
      }
    },
    {
      resolve: '@mercurjs/sep',
      options: {
        terminalId:
          process.env.SEP_TERMINAL_ID ||
          (effectiveSepSandbox()
            ? IRAN_BANKTEST_SEP_CREDENTIALS.terminalId
            : ''),
        sandbox: effectiveSepSandbox()
      }
    },
    { resolve: '@mercurjs/split-order-payment' },
    { resolve: '@mercurjs/attribute' },
    { resolve: '@mercurjs/article' },
    { resolve: '@mercurjs/city' },
    { resolve: '@mercurjs/support-ticket' },
    // TODO: Fix TypeScript errors before enabling
    // { resolve: '@mercurjs/api-client' },
    {
      resolve: '@mercurjs/taxcode',
      options: {
        apiKey: process.env.STRIPE_SECRET_API_KEY
      }
    },
    {
      resolve: '@medusajs/medusa/file',
      options: {
        providers: [
          // Switch to S3 when S3_FILE_ACCESS_KEY_ID is set; fall back to local for dev.
          ...(process.env.S3_FILE_ACCESS_KEY_ID
            ? [
                {
                  resolve: '@medusajs/medusa/file-s3',
                  id: 's3',
                  options: {
                    file_url: process.env.S3_FILE_URL,           // https://bucket.s3.region.amazonaws.com
                    access_key_id: process.env.S3_FILE_ACCESS_KEY_ID,
                    secret_access_key: process.env.S3_FILE_SECRET_ACCESS_KEY,
                    region: process.env.S3_FILE_REGION,          // e.g. eu-central-1
                    bucket: process.env.S3_FILE_BUCKET,
                    prefix: process.env.S3_FILE_PREFIX || ''     // optional subfolder inside the bucket
                  }
                }
              ]
            : [
                {
                  resolve: '@medusajs/medusa/file-local',
                  id: 'local',
                  options: {
                    upload_dir: 'static',
                    backend_url: `${process.env.BACKEND_URL}/static`
                  }
                }
              ])
        ]
      }
    },
    { resolve: '@mercurjs/commission' },
    {
      resolve: '@mercurjs/payout',
      options: {
        apiKey: process.env.STRIPE_SECRET_API_KEY,
        webhookSecret: process.env.STRIPE_CONNECTED_ACCOUNTS_WEBHOOK_SECRET
      }
    },
    ...(process.env.ELASTICSEARCH_NODE
      ? [
          {
            resolve: '@mercurjs/elasticsearch',
            options: { node: process.env.ELASTICSEARCH_NODE }
          }
        ]
      : []),

    {
      resolve: '@medusajs/medusa/payment',
      options: {
        providers: [
          {
            resolve: '@mercurjs/payment-stripe-connect',
            id: 'stripe-connect',
            options: {
              apiKey: process.env.STRIPE_SECRET_API_KEY
            }
          },
          ...domesticPaymentProviders
        ]
      }
    },
    {
      resolve: '@medusajs/medusa/notification',
      options: {
        providers: [
          {
            resolve: '@mercurjs/resend',
            id: 'resend',
            options: {
              channels: ['email'],
              api_key: process.env.RESEND_API_KEY,
              from: process.env.RESEND_FROM_EMAIL
            }
          },
          {
            resolve: '@medusajs/medusa/notification-local',
            id: 'local',
            options: {
              channels: ['feed', 'seller_feed']
            }
          }
        ]
      }
    },
    {
      resolve: '@medusajs/medusa/fulfillment',
      options: {
        providers: [
          {
            resolve: '@medusajs/medusa/fulfillment-manual',
            id: 'manual'
          },
          {
            resolve: './src/modules/postex',
            id: 'postex',
            options: {
              apiKey: process.env.POSTEX_API_KEY
            }
          }
        ]
      }
    }
  ]
})
