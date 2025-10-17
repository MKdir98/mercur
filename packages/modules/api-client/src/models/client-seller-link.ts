import { model } from "@medusajs/framework/utils";

export const ClientSellerLink = model.define("client_seller_link", {
  id: model.id({ prefix: "csl" }).primaryKey(),
  api_client_id: model.text(),
  seller_id: model.text(),
  is_active: model.boolean().default(true),
  metadata: model.json().nullable(),
}).indexes([
  {
    on: ["api_client_id", "seller_id"],
    unique: true,
  },
]);

