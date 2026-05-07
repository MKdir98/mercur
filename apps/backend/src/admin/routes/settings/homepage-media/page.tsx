import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ArrowDownTray } from "@medusajs/icons";
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
import { useMemo, useRef, useState } from "react";
import {
  useHomepageMedia,
  useUpdateHomepageMedia,
  type HomepageMediaItem,
} from "../../../hooks/api/homepage-media";
import { useProductCategories } from "../../../hooks/api/product_category";
import { clx } from "@medusajs/ui";

const ACCEPT_IMAGE = "image/jpeg,image/png,image/gif,image/webp,image/svg+xml";
const ACCEPT_VIDEO = "video/mp4,video/webm";

/** Rewrites absolute URLs saved with a local backend host to the current admin origin. */
function resolveMediaPreviewUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (typeof window === "undefined") {
    return url;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const parsed = new URL(url);
      const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
      if (localHosts.has(parsed.hostname)) {
        return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
      return url;
    } catch {
      return url;
    }
  }
  return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

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

  const displayUrl = resolveMediaPreviewUrl(item.image_url);

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
        {item.type === "video" ? "Video + Poster" : "Image"}
      </Text>

      <div className="space-y-3">
        <div>
          <Label className="mb-1 block">
            {item.type === "video" ? "Poster / Image" : "Image"}
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

        {item.type === "video" && (
          <div>
            <Label className="mb-1 block">Video</Label>
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
                  src={resolveMediaPreviewUrl(item.video_url) ?? undefined}
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
        )}

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
  const mediaOnlyItems = useMemo(
    () => items.filter((i) => i.type !== "category"),
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

  const handleSave = async () => {
    const payload = items.map((item) => ({
      key: item.key,
      image_url: item.image_url,
      video_url: item.video_url,
      link: item.link,
      alt: item.alt,
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
