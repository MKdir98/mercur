import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ArrowDownTray, XMark, ChevronUpMini, ChevronDownMini } from "@medusajs/icons";
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Text,
  toast,
} from "@medusajs/ui";
import { useMemo, useRef, useState, useCallback } from "react";
import {
  useHomepageMedia,
  useUpdateHomepageMedia,
  type HomepageMediaItem,
} from "../../../hooks/api/homepage-media";
import { useProductCategories } from "../../../hooks/api/product_category";
import { clx } from "@medusajs/ui";
import { resolveImageUrl } from "../../../utils";
import { mercurQuery } from "../../../lib/client";

const ACCEPT_IMAGE = "image/jpeg,image/png,image/gif,image/webp,image/svg+xml";
const ACCEPT_VIDEO = "video/mp4,video/webm";

const uploadFile = async (file: File): Promise<string | undefined> => {
  const bearer =
    (typeof window !== "undefined" &&
      window.localStorage.getItem("medusa_auth_token")) ||
    "";
  const formData = new FormData();
  formData.append("files", file);
  const res = await fetch("/admin/uploads", {
    method: "POST",
    credentials: "include",
    headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || "Upload failed");
  }
  const data = await res.json();
  return data.files?.[0]?.url;
};

const NONE_CATEGORY = "__none__";

const CategoryBannerSlotCard = ({
  item,
  categories,
  onLinkChange,
}: {
  item: HomepageMediaItem;
  categories: { id: string; name?: string | null; handle?: string | null }[];
  onLinkChange: (key: string, link: string | null) => void;
}) => {
  const withHandle = useMemo(
    () =>
      categories.filter(
        (c): c is { id: string; name?: string | null; handle: string } =>
          Boolean(c.handle)
      ),
    [categories]
  );
  const handleSet = useMemo(
    () => new Set(withHandle.map((c) => c.handle)),
    [withHandle]
  );
  const selected = item.link?.trim();
  const value =
    selected && handleSet.has(selected) ? selected : NONE_CATEGORY;

  return (
    <div
      className={clx(
        "rounded-lg border border-ui-border-base p-4",
        "bg-ui-bg-component"
      )}
    >
      <Text weight="plus" className="mb-2 block">
        {item.label}
      </Text>
      <Text size="small" className="text-ui-fg-subtle mb-3 block">
        Storefront homepage: one horizontal row of products per selected category
        (order follows slots 1–3). Leave all as None to use the first three root
        categories automatically.
      </Text>
      <div>
        <Label className="mb-1 block">Product category</Label>
        <Select
          value={value}
          onValueChange={(v) =>
            onLinkChange(item.key, v === NONE_CATEGORY ? null : v)
          }
        >
          <Select.Trigger>
            <Select.Value placeholder="None" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value={NONE_CATEGORY}>
              None (automatic top categories)
            </Select.Item>
            {withHandle.map((c) => (
              <Select.Item key={c.id} value={c.handle}>
                {c.name ?? c.handle}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>
    </div>
  );
};

interface AdminProduct {
  id: string;
  title: string;
  thumbnail: string | null;
}

const ProductsSlotCard = ({
  item,
  onProductIdsChange,
}: {
  item: HomepageMediaItem;
  onProductIdsChange: (key: string, ids: string[]) => void;
}) => {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<AdminProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [productMap, setProductMap] = useState<Record<string, AdminProduct>>({});
  const selectedIds: string[] = item.product_ids ?? [];

  const handleSearch = useCallback(async (q: string) => {
    setSearch(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const data: any = await mercurQuery("/admin/products", {
        method: "GET",
        query: { q, limit: 20, fields: "id,title,thumbnail" },
      });
      setSearchResults(
        (data?.products || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          thumbnail: p.thumbnail ?? null,
        }))
      );
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const addProduct = (product: AdminProduct) => {
    if (selectedIds.includes(product.id)) return;
    setProductMap((prev) => ({ ...prev, [product.id]: product }));
    onProductIdsChange(item.key, [...selectedIds, product.id]);
    setSearch("");
    setSearchResults([]);
  };

  const removeProduct = (id: string) => {
    onProductIdsChange(item.key, selectedIds.filter((pid) => pid !== id));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...selectedIds];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onProductIdsChange(item.key, next);
  };

  const moveDown = (index: number) => {
    if (index === selectedIds.length - 1) return;
    const next = [...selectedIds];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onProductIdsChange(item.key, next);
  };

  return (
    <div className={clx("rounded-lg border border-ui-border-base p-4 bg-ui-bg-component")}>
      <Text weight="plus" className="mb-1 block">{item.label}</Text>
      <Text size="small" className="text-ui-fg-subtle mb-3 block">
        Selected products are shown on the storefront in this order. Leave empty to show nothing.
      </Text>

      <div className="mb-3 relative">
        <Label className="mb-1 block">Search products</Label>
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Type to search…"
        />
        {(searchResults.length > 0 || searching) && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-ui-border-base bg-ui-bg-base shadow-lg max-h-60 overflow-y-auto">
            {searching && (
              <div className="p-3 text-ui-fg-subtle text-small-regular">Searching…</div>
            )}
            {!searching && searchResults.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addProduct(p)}
                disabled={selectedIds.includes(p.id)}
                className={clx(
                  "flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-ui-bg-base-hover",
                  selectedIds.includes(p.id) && "opacity-40 cursor-not-allowed"
                )}
              >
                {p.thumbnail ? (
                  <img src={p.thumbnail} alt="" className="h-8 w-8 rounded object-cover border flex-shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded border bg-ui-bg-subtle flex-shrink-0" />
                )}
                <Text size="small" className="truncate">{p.title}</Text>
                {selectedIds.includes(p.id) && (
                  <Text size="small" className="ml-auto text-ui-fg-subtle flex-shrink-0">Added</Text>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedIds.length > 0 ? (
        <div className="space-y-2">
          <Label className="block">Selected ({selectedIds.length})</Label>
          {selectedIds.map((id, index) => {
            const product = productMap[id];
            return (
            <div
              key={id}
              className="flex items-center gap-2 rounded-md border border-ui-border-base bg-ui-bg-subtle px-2 py-1"
            >
              <Text size="small" className="text-ui-fg-subtle w-5 text-center flex-shrink-0">
                {index + 1}
              </Text>
              {product?.thumbnail ? (
                <img src={product.thumbnail} alt="" className="h-7 w-7 rounded object-cover border flex-shrink-0" />
              ) : (
                <div className="h-7 w-7 rounded border bg-ui-bg-base flex-shrink-0" />
              )}
              <Text size="small" className="flex-1 truncate">
                {product?.title ?? id}
              </Text>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="rounded p-0.5 hover:bg-ui-bg-base disabled:opacity-30"
                  title="Move up"
                >
                  <ChevronUpMini />
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(index)}
                  disabled={index === selectedIds.length - 1}
                  className="rounded p-0.5 hover:bg-ui-bg-base disabled:opacity-30"
                  title="Move down"
                >
                  <ChevronDownMini />
                </button>
                <button
                  type="button"
                  onClick={() => removeProduct(id)}
                  className="rounded p-0.5 hover:bg-ui-bg-base text-ui-fg-subtle hover:text-ui-fg-error"
                  title="Remove"
                >
                  <XMark />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <Text size="small" className="text-ui-fg-subtle italic">No products selected — section will be hidden.</Text>
      )}
    </div>
  );
};

const MediaCard = ({
  item,
  onImageChange,
  onVideoChange,
  onLinkChange,
  onAltChange,
}: {
  item: HomepageMediaItem;
  onImageChange: (key: string, url: string | null) => void;
  onVideoChange: (key: string, url: string | null) => void;
  onLinkChange: (key: string, link: string | null) => void;
  onAltChange: (key: string, alt: string | null) => void;
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadFile(file);
      if (url) onImageChange(item.key, url);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const url = await uploadFile(file);
      if (url) onVideoChange(item.key, url);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingVideo(false);
      e.target.value = "";
    }
  };

  const displayUrl = resolveImageUrl(item.image_url);

  return (
    <div
      className={clx(
        "rounded-lg border border-ui-border-base p-4",
        "bg-ui-bg-component"
      )}
    >
      <Text weight="plus" className="mb-2 block">
        {item.label}
      </Text>
      <Text size="small" className="text-ui-fg-subtle mb-3 block">
        Image / Video
      </Text>

      <div className="space-y-3">
        <div>
          <Label className="mb-1 block">
            Image / Poster
          </Label>
          <input
            ref={imageInputRef}
            type="file"
            accept={ACCEPT_IMAGE}
            className="hidden"
            onChange={handleImageUpload}
          />
          {displayUrl ? (
            <div className="flex items-center gap-2">
              <img
                src={displayUrl}
                alt={item.alt || item.label}
                className="h-20 w-20 rounded object-cover border"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="small"
                  variant="secondary"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? "Uploading..." : "Change"}
                </Button>
                <Button
                  type="button"
                  size="small"
                  variant="transparent"
                  onClick={() => onImageChange(item.key, null)}
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploadingImage}
              className={clx(
                "flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-4",
                "border-ui-border-strong bg-ui-bg-subtle",
                "hover:border-ui-border-interactive"
              )}
            >
              <ArrowDownTray className="text-ui-fg-subtle" />
              <Text size="small" className="text-ui-fg-subtle">
                {uploadingImage ? "Uploading..." : "Upload image"}
              </Text>
            </button>
          )}
        </div>

        <div>
          <Label className="mb-1 block">Video (optional)</Label>
          <input
            ref={videoInputRef}
            type="file"
            accept={ACCEPT_VIDEO}
            className="hidden"
            onChange={handleVideoUpload}
          />
          {item.video_url ? (
            <div className="flex items-center gap-2">
              <video
                src={resolveImageUrl(item.video_url) ?? undefined}
                className="h-16 w-24 rounded object-cover border"
                muted
                playsInline
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="small"
                  variant="secondary"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploadingVideo}
                >
                  {uploadingVideo ? "Uploading..." : "Change"}
                </Button>
                <Button
                  type="button"
                  size="small"
                  variant="transparent"
                  onClick={() => onVideoChange(item.key, null)}
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploadingVideo}
              className={clx(
                "flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-4",
                "border-ui-border-strong bg-ui-bg-subtle",
                "hover:border-ui-border-interactive"
              )}
            >
              <Text size="small" className="text-ui-fg-subtle">
                {uploadingVideo ? "Uploading..." : "Upload video (mp4, webm)"}
              </Text>
            </button>
          )}
        </div>

        <div>
          <Label htmlFor={`link-${item.key}`}>Link (optional)</Label>
          <Input
            id={`link-${item.key}`}
            value={item.link || ""}
            onChange={(e) =>
              onLinkChange(item.key, e.target.value || null)
            }
            placeholder="/products"
          />
        </div>
        <div>
          <Label htmlFor={`alt-${item.key}`}>Alt text (optional)</Label>
          <Input
            id={`alt-${item.key}`}
            value={item.alt || ""}
            onChange={(e) => onAltChange(item.key, e.target.value || null)}
            placeholder="Description for accessibility"
          />
        </div>
      </div>
    </div>
  );
};

const HomepageMediaPage = () => {
  const { homepage_media, isLoading, refetch } = useHomepageMedia();
  const { product_categories, isLoading: categoriesLoading } =
    useProductCategories({ limit: 500 });
  const { mutateAsync: updateMedia, isPending: isSaving } =
    useUpdateHomepageMedia({});

  const [localItems, setLocalItems] = useState<Record<string, HomepageMediaItem>>(
    {}
  );

  const items = (homepage_media || []).map((item) => ({
    ...item,
    ...localItems[item.key],
  }));

  const categoryBannerItems = useMemo(
    () => items.filter((i) => i.type === "category"),
    [items]
  );
  const productSlotItems = useMemo(
    () => items.filter((i) => i.type === "products"),
    [items]
  );
  const mediaOnlyItems = useMemo(
    () => items.filter((i) => i.type !== "category" && i.type !== "products"),
    [items]
  );

  const handleImageChange = (key: string, url: string | null) => {
    setLocalItems((prev) => ({
      ...prev,
      [key]: { ...prev[key], key, image_url: url } as HomepageMediaItem,
    }));
  };

  const handleVideoChange = (key: string, url: string | null) => {
    setLocalItems((prev) => ({
      ...prev,
      [key]: { ...prev[key], key, video_url: url } as HomepageMediaItem,
    }));
  };

  const handleLinkChange = (key: string, link: string | null) => {
    setLocalItems((prev) => ({
      ...prev,
      [key]: { ...prev[key], key, link } as HomepageMediaItem,
    }));
  };

  const handleAltChange = (key: string, alt: string | null) => {
    setLocalItems((prev) => ({
      ...prev,
      [key]: { ...prev[key], key, alt } as HomepageMediaItem,
    }));
  };

  const handleProductIdsChange = (key: string, ids: string[]) => {
    setLocalItems((prev) => ({
      ...prev,
      [key]: { ...prev[key], key, product_ids: ids } as HomepageMediaItem,
    }));
  };

  const handleSave = async () => {
    const payload = items.map((item) => ({
      key: item.key,
      image_url: item.image_url,
      video_url: item.video_url,
      link: item.link,
      alt: item.alt,
      product_ids: item.product_ids ?? null,
    }));
    try {
      await updateMedia({ items: payload });
      setLocalItems({});
      refetch();
      toast.success("Saved");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const hasChanges = Object.keys(localItems).length > 0;

  return (
    <Container>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Homepage Media</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage homepage media and which product categories power the
            storefront category banner
          </Text>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      {isLoading ? (
        <Text>Loading...</Text>
      ) : (
        <div className="flex flex-col gap-8 p-6">
          {categoryBannerItems.length > 0 && (
            <div>
              <Heading level="h2" className="mb-1 text-base">
                Homepage category banner
              </Heading>
              <Text size="small" className="text-ui-fg-subtle mb-4 block">
                Pick up to three categories (by handle). Saved with the same
                button as media below.
              </Text>
              {categoriesLoading ? (
                <Text size="small">Loading categories…</Text>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {categoryBannerItems.map((item) => (
                    <CategoryBannerSlotCard
                      key={item.key}
                      item={item}
                      categories={product_categories || []}
                      onLinkChange={handleLinkChange}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {productSlotItems.length > 0 && (
            <div>
              <Heading level="h2" className="mb-1 text-base">
                Homepage product sections
              </Heading>
              <Text size="small" className="text-ui-fg-subtle mb-4 block">
                Pin specific products for each section. Order is preserved on the storefront. Leave empty to hide the section.
              </Text>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {productSlotItems.map((item) => (
                  <ProductsSlotCard
                    key={item.key}
                    item={item}
                    onProductIdsChange={handleProductIdsChange}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <Heading level="h2" className="mb-4 text-base">
              Images and videos
            </Heading>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mediaOnlyItems.map((item) => (
                <MediaCard
                  key={item.key}
                  item={item}
                  onImageChange={handleImageChange}
                  onVideoChange={handleVideoChange}
                  onLinkChange={handleLinkChange}
                  onAltChange={handleAltChange}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Homepage Media",
});

export default HomepageMediaPage;
