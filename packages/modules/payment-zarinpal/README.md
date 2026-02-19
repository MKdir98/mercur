# Zarinpal Payment Provider for Medusa

Payment provider integration for Zarinpal gateway in Medusa v2.

## Installation

This package is part of the Mercur monorepo.

## Configuration

Add the following environment variables to your `.env` file:

```bash
ZARINPAL_MERCHANT_ID=your-merchant-id
ZARINPAL_SANDBOX=true
ZARINPAL_CALLBACK_URL=http://localhost:9000/store/payment/zarinpal/callback
```

For production:
```bash
ZARINPAL_SANDBOX=false
ZARINPAL_CALLBACK_URL=https://your-domain.com/store/payment/zarinpal/callback
```

## Usage

The provider is automatically registered in `medusa-config.ts`:

```typescript
{
  resolve: '@medusajs/medusa/payment',
  options: {
    providers: [
      {
        resolve: '@mercurjs/payment-zarinpal',
        id: 'zarinpal',
        options: {
          merchantId: process.env.ZARINPAL_MERCHANT_ID,
          sandbox: process.env.ZARINPAL_SANDBOX === 'true'
        }
      }
    ]
  }
}
```

## Features

- Full Medusa v2 payment provider implementation
- Sandbox and production mode support
- Automatic redirect to Zarinpal gateway
- Payment verification and callback handling
- Integration with Medusa payment collection

## Payment Flow

1. Customer selects Zarinpal as payment method
2. Payment session is initiated with callback URL
3. Customer is redirected to Zarinpal gateway
4. After payment, Zarinpal redirects back to callback URL
5. Backend verifies payment and updates session
6. Customer is redirected to order confirmation
