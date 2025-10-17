# Phone Authentication - Backend Implementation Guide

This guide explains how to implement phone-based authentication endpoints in the Medusa backend.

## Required Endpoints

### 1. Check Phone Availability

**Endpoint**: `GET /store/customers/phone/:phone`

**Purpose**: Check if a phone number is already registered

**Implementation**:

```typescript
// File: apps/backend/src/api/store/customers/phone/[phone]/route.ts

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const phone = req.params.phone
  
  const query = req.scope.resolve("query")
  
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "first_name", "last_name", "phone"],
    filters: {
      phone: phone
    }
  })
  
  const customer = customers[0] || null
  
  res.json({
    customer: customer ? {
      first_name: customer.first_name,
      last_name: customer.last_name,
    } : null
  })
}
```

### 2. Phone-Based Authentication

**Endpoint**: `POST /store/auth/phone`

**Purpose**: Authenticate user by phone number after OTP verification

**Implementation**:

```typescript
// File: apps/backend/src/api/store/auth/phone/route.ts

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { phone } = req.body
  
  if (!phone) {
    res.status(400).json({
      message: "Phone number is required"
    })
    return
  }
  
  const query = req.scope.resolve("query")
  const authModule = req.scope.resolve(Modules.AUTH)
  
  // Find customer by phone
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
    filters: {
      phone: phone
    }
  })
  
  const customer = customers[0]
  
  if (!customer) {
    res.status(404).json({
      message: "Customer not found"
    })
    return
  }
  
  // Generate auth token
  // Note: Since customer was registered with emailpass provider,
  // we need to authenticate using their email
  const authUser = await authModule.authenticate("customer", "emailpass", {
    email: customer.email,
    // For phone-authenticated users, you might want to implement
    // a custom auth provider or use a token-based approach
  })
  
  if (!authUser.success) {
    res.status(401).json({
      message: "Authentication failed"
    })
    return
  }
  
  res.json({
    token: authUser.authIdentity?.app_metadata?.token
  })
}
```

## Alternative Implementation: Custom Auth Provider

For a more robust solution, create a custom authentication provider:

### 1. Create Phone Auth Provider Module

```typescript
// File: packages/modules/phone-auth/src/index.ts

import { Module } from "@medusajs/framework/utils"
import { PhoneAuthService } from "./service"

export default Module("phone-auth", {
  service: PhoneAuthService,
})
```

### 2. Phone Auth Service

```typescript
// File: packages/modules/phone-auth/src/service.ts

import { AuthenticationInput, AuthenticationResponse } from "@medusajs/framework/types"

export class PhoneAuthService {
  async authenticate(
    phone: string,
    options?: Record<string, any>
  ): Promise<AuthenticationResponse> {
    // Validate phone number
    if (!phone || !this.isValidPhone(phone)) {
      return {
        success: false,
        error: "Invalid phone number"
      }
    }
    
    // Find customer by phone
    const customer = await this.findCustomerByPhone(phone)
    
    if (!customer) {
      return {
        success: false,
        error: "Customer not found"
      }
    }
    
    // Generate JWT token
    const token = await this.generateToken(customer.id)
    
    return {
      success: true,
      authIdentity: {
        id: customer.id,
        provider: "phone",
        entity_id: customer.id,
        app_metadata: {
          token
        }
      }
    }
  }
  
  private isValidPhone(phone: string): boolean {
    // Iranian phone validation
    return /^09\d{9}$/.test(phone)
  }
  
  private async findCustomerByPhone(phone: string) {
    // Implementation depends on your data layer
    // Use query or repository to find customer
  }
  
  private async generateToken(customerId: string): Promise<string> {
    // Generate JWT token
    // Use your JWT service
  }
}
```

### 3. Register Provider

```typescript
// File: apps/backend/medusa-config.ts

export default defineConfig({
  // ... other config
  modules: [
    // ... other modules
    {
      resolve: "./packages/modules/phone-auth",
    }
  ]
})
```

### 4. Use Phone Auth Provider

```typescript
// File: apps/backend/src/api/store/auth/phone/route.ts

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { phone } = req.body
  
  const phoneAuthService = req.scope.resolve("phone-auth")
  
  const result = await phoneAuthService.authenticate(phone)
  
  if (!result.success) {
    res.status(401).json({
      message: result.error || "Authentication failed"
    })
    return
  }
  
  res.json({
    token: result.authIdentity.app_metadata.token
  })
}
```

## Database Migration

Add phone field to customer if not exists:

```typescript
// File: apps/backend/src/migrations/[timestamp]-add-phone-to-customer.ts

import { Migration } from "@mikro-orm/migrations"

export class AddPhoneToCustomer extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "customer" 
      ADD COLUMN IF NOT EXISTS "phone" VARCHAR(20);
    `)
    
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_customer_phone" 
      ON "customer" ("phone");
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      DROP INDEX IF EXISTS "idx_customer_phone";
    `)
    
    this.addSql(`
      ALTER TABLE "customer" 
      DROP COLUMN IF EXISTS "phone";
    `)
  }
}
```

## Customer Registration with Phone

Update customer registration to handle phone-based registration:

```typescript
// File: apps/backend/src/api/store/customers/route.ts

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { phone, first_name, last_name, email } = req.body
  
  // For phone-based registration, generate a unique email
  const generatedEmail = email || `${phone.replace(/\+/g, "")}@phone.temp`
  
  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  
  // Create customer
  const customer = await customerModule.createCustomers({
    email: generatedEmail,
    phone: phone,
    first_name: first_name,
    last_name: last_name,
  })
  
  res.json({ customer })
}
```

## Testing

### Test Check Phone Endpoint

```bash
curl -X GET http://localhost:9000/store/customers/phone/09123456789 \
  -H "x-publishable-api-key: YOUR_KEY"
```

### Test Phone Authentication

```bash
curl -X POST http://localhost:9000/store/auth/phone \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: YOUR_KEY" \
  -d '{"phone": "09123456789"}'
```

## Security Considerations

1. **Phone Validation**: Always validate phone format on backend
2. **Rate Limiting**: Implement rate limiting on auth endpoints
3. **Token Expiry**: Set appropriate JWT token expiry (e.g., 7 days)
4. **Phone Uniqueness**: Ensure phone numbers are unique in database
5. **Audit Logging**: Log all authentication attempts

## Next Steps

1. Implement the endpoints above
2. Run database migration
3. Test with frontend
4. Deploy to staging
5. Test with real SMS.ir account
6. Deploy to production

