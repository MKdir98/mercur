import crypto from "crypto";

import { Context } from "@medusajs/framework/types";
import {
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils";

import { ApiClient, ClientSellerLink } from "./models";

class ApiClientModuleService extends MedusaService({
  ApiClient,
  ClientSellerLink,
}) {
  /**
   * Generate a new API key and secret for a client
   */
  generateApiCredentials(): { apiKey: string; apiSecret: string } {
    const apiKey = `ak_${crypto.randomBytes(24).toString("hex")}`;
    const apiSecret = crypto.randomBytes(32).toString("hex");
    
    return { apiKey, apiSecret };
  }

  /**
   * Hash the API secret before storing
   */
  hashSecret(secret: string): string {
    return crypto.createHash("sha256").update(secret).digest("hex");
  }

  /**
   * Verify API credentials
   */
  async verifyApiCredentials(
    apiKey: string,
    apiSecret: string
  ): Promise<any> {
    const clients = await this.listApiClients({
      filters: { api_key: apiKey, is_active: true },
    });

    if (!clients || clients.length === 0) {
      return null;
    }

    const client = clients[0];
    const hashedSecret = this.hashSecret(apiSecret);

    if (client.api_secret !== hashedSecret) {
      return null;
    }

    return client;
  }

  /**
   * Check if a client has access to a seller
   */
  async hasAccessToSeller(
    apiClientId: string,
    sellerId: string
  ): Promise<boolean> {
    const links = await this.listClientSellerLinks({
      filters: {
        api_client_id: apiClientId,
        seller_id: sellerId,
        is_active: true,
      },
    });

    return links && links.length > 0;
  }

  /**
   * Get all seller IDs that a client has access to
   */
  async getAccessibleSellerIds(apiClientId: string): Promise<string[]> {
    const links = await this.listClientSellerLinks({
      filters: {
        api_client_id: apiClientId,
        is_active: true,
      },
    });

    return links ? links.map((link) => link.seller_id) : [];
  }

  /**
   * Grant access to a seller for a client
   */
  @InjectTransactionManager()
  async grantSellerAccess(
    apiClientId: string,
    sellerId: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    // Check if link already exists
    const existingLinks = await this.listClientSellerLinks({
      filters: {
        api_client_id: apiClientId,
        seller_id: sellerId,
      },
    });

    if (existingLinks && existingLinks.length > 0) {
      // Update existing link to active
      return await this.updateClientSellerLinks({
        id: existingLinks[0].id,
        is_active: true,
      });
    }

    // Create new link
    return await this.createClientSellerLinks({
      api_client_id: apiClientId,
      seller_id: sellerId,
      is_active: true,
    });
  }

  /**
   * Revoke access to a seller for a client
   */
  @InjectTransactionManager()
  async revokeSellerAccess(
    apiClientId: string,
    sellerId: string,
    @MedusaContext() sharedContext: Context = {}
  ) {
    const links = await this.listClientSellerLinks({
      filters: {
        api_client_id: apiClientId,
        seller_id: sellerId,
      },
    });

    if (links && links.length > 0) {
      return await this.updateClientSellerLinks({
        id: links[0].id,
        is_active: false,
      });
    }

    return null;
  }
}

export default ApiClientModuleService;

