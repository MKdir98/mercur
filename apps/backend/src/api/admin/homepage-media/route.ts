import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";

import {
  HOMEPAGE_MEDIA_MODULE,
  HomepageMediaModuleService,
} from "@mercurjs/homepage-media";
import { AdminUpdateHomepageMediaBody, AdminUpdateHomepageMediaBodyType } from "./validators";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(
    HOMEPAGE_MEDIA_MODULE
  ) as HomepageMediaModuleService;

  const items = await service.listHomepageMediaItems({});
  const formatted = (items || []).map((item: any) => ({
    id: item.id,
    key: item.key,
    label: item.label,
    type: item.type,
    image_url: item.image_url ?? null,
    video_url: item.video_url ?? null,
    link: item.link ?? null,
    alt: item.alt ?? null,
    product_ids: item.product_ids ? JSON.parse(item.product_ids) : null,
  }));

  res.json({ homepage_media: formatted });
};

export const PUT = async (
  req: MedusaRequest<AdminUpdateHomepageMediaBodyType>,
  res: MedusaResponse
) => {
  const service = req.scope.resolve(
    HOMEPAGE_MEDIA_MODULE
  ) as HomepageMediaModuleService;

  const parsedBody = AdminUpdateHomepageMediaBody.safeParse(
    req.validatedBody ?? req.body
  );

  if (!parsedBody.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Request body must include a valid items array."
    );
  }

  const { items } = parsedBody.data;

  for (const item of items) {
    const data: Record<string, unknown> = {};
    if (item.image_url !== undefined) data.image_url = item.image_url;
    if (item.video_url !== undefined) data.video_url = item.video_url;
    if (item.link !== undefined) data.link = item.link;
    if (item.alt !== undefined) data.alt = item.alt;
    if (item.product_ids !== undefined) data.product_ids = item.product_ids !== null ? JSON.stringify(item.product_ids) : null;

    if (Object.keys(data).length > 0) {
      await service.updateHomepageMediaItems({
        selector: { key: item.key },
        data,
      });
    }
  }

  const updated = await service.listHomepageMediaItems({});
  const formatted = (updated || []).map((item: any) => ({
    id: item.id,
    key: item.key,
    label: item.label,
    type: item.type,
    image_url: item.image_url ?? null,
    video_url: item.video_url ?? null,
    link: item.link ?? null,
    alt: item.alt ?? null,
    product_ids: item.product_ids ? JSON.parse(item.product_ids) : null,
  }));

  res.json({ homepage_media: formatted });
};
