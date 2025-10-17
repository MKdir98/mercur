import { MedusaRequest } from "@medusajs/framework";

declare module "@medusajs/framework" {
  interface MedusaRequest {
    apiClient?: {
      id: string;
      name: string;
      api_key: string;
      is_active: boolean;
      rate_limit?: number;
      metadata?: Record<string, any>;
    };
    accessibleSellerIds?: string[];
  }
}

