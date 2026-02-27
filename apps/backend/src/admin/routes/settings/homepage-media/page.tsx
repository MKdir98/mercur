import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ArrowDownTray } from "@medusajs/icons";
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui";
import { useRef, useState } from "react";
import {
  useHomepageMedia,
  useUpdateHomepageMedia,
  type HomepageMediaItem,
} from "../../../hooks/api/homepage-media";
import { clx } from "@medusajs/ui";

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

  const displayUrl = item.image_url?.startsWith("http")
    ? item.image_url
    : item.image_url
      ? `${window.location.origin}${item.image_url.startsWith("/") ? "" : "/"}${item.image_url}`
      : null;

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
                  src={
                    item.video_url.startsWith("http")
                      ? item.video_url
                      : `${window.location.origin}${item.video_url.startsWith("/") ? "" : "/"}${item.video_url}`
                  }
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
  const { mutateAsync: updateMedia, isPending: isSaving } =
    useUpdateHomepageMedia({});

  const [localItems, setLocalItems] = useState<Record<string, HomepageMediaItem>>(
    {}
  );

  const items = (homepage_media || []).map((item) => ({
    ...item,
    ...localItems[item.key],
  }));

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
            Manage images and videos displayed on the storefront homepage
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {items.map((item) => (
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
      )}
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Homepage Media",
});

export default HomepageMediaPage;
