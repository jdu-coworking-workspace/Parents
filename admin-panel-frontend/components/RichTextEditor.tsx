"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type NodeViewProps,
} from "@tiptap/react";
import { mergeAttributes, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold as BoldIcon,
  ChevronLeft,
  ChevronRight,
  GalleryHorizontalEnd,
  Image as ImageIcon,
  Italic as ItalicIcon,
  LayoutGrid,
  Link as LinkIcon,
  Loader2,
  Plus,
  Rows3,
  Trash2,
  Underline as UnderlineIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import ImageLightbox from "@/components/ImageLightbox";
import { apiClient } from "@/lib/apiClient";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  MAX_IMAGE_BYTES,
  getPostImageSrc,
  readFileAsDataUrl,
} from "@/lib/postImages";
import { ImageGroupLayout } from "@/components/MessageImageGroupView";
import { cn } from "@/lib/utils";

// Legacy single image node view for backward compatibility
const DescriptionImageView = ({
  node,
  deleteNode,
  selected,
}: NodeViewProps) => (
  <NodeViewWrapper className="relative my-3 inline-block max-w-full">
    <button
      type="button"
      contentEditable={false}
      className="absolute right-0 top-0 z-10 -translate-y-1/4 translate-x-1/4"
      onClick={deleteNode}
      aria-label="Delete"
    >
      <X className="h-7 w-7 rounded-full bg-red-500 p-1 text-white hover:bg-red-600 shadow-md" />
    </button>
    <img
      src={getPostImageSrc(node.attrs.src)}
      alt=""
      className={`max-h-[360px] max-w-full rounded-md border object-contain ${
        selected ? "ring-2 ring-primary" : ""
      }`}
    />
  </NodeViewWrapper>
);

const DescriptionImage = Node.create({
  name: "descriptionImage",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]:not([data-in-group])" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(HTMLAttributes, {
        src: getPostImageSrc(HTMLAttributes.src),
        class: "max-w-full rounded-md border object-contain",
      }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(DescriptionImageView);
  },
});

// Rich multi-image group node view inside TipTap
const DescriptionImageGroupView = ({
  node,
  deleteNode,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps) => {
  const t = useTranslations("sendmessage");
  const { data: session } = useSession();
  const images = (node.attrs.images as string[]) || [];
  const layout = (node.attrs.layout as ImageGroupLayout) || "sequential";
  const [carouselIndex, setCarouselIndex] = useState(0);
  const addFilesInputRef = useRef<HTMLInputElement>(null);
  const newCarouselInputRef = useRef<HTMLInputElement>(null);
  const [isAddingMore, setIsAddingMore] = useState(false);
  const [isCreatingNewCarousel, setIsCreatingNewCarousel] = useState(false);

  const handleRemoveImage = (indexToRemove: number) => {
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    if (updated.length === 0) {
      deleteNode();
    } else {
      updateAttributes({ images: updated });
      if (carouselIndex >= updated.length) {
        setCarouselIndex(Math.max(0, updated.length - 1));
      }
    }
  };

  const handleAddMoreImages = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files ?? []).filter((f) =>
      f.type.startsWith("image/")
    );
    e.target.value = "";
    if (files.length === 0) return;

    if (files.some((f) => f.size > MAX_IMAGE_BYTES)) {
      toast({ title: t("error"), description: t("imageTooLarge") });
      return;
    }

    try {
      setIsAddingMore(true);
      const dataUrls = await Promise.all(files.map(readFileAsDataUrl));
      const response = await apiClient<{
        image?: string;
        images?: string[];
      }>({
        endpoint: "post/image",
        method: "POST",
        token: session?.sessionToken,
        body: { images: dataUrls },
      });
      const uploaded = Array.isArray(response?.images)
        ? response.images.filter(Boolean)
        : response?.image
          ? [response.image]
          : [];
      if (uploaded.length > 0) {
        updateAttributes({ images: [...images, ...uploaded] });
        toast({ title: t("uploadImageFinished") });
      }
    } catch {
      toast({ title: t("error"), description: t("imageUploadFailed") });
    } finally {
      setIsAddingMore(false);
    }
  };

  const handleCreateAnotherCarousel = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files ?? []).filter((f) =>
      f.type.startsWith("image/")
    );
    e.target.value = "";
    if (files.length === 0) return;

    if (files.some((f) => f.size > MAX_IMAGE_BYTES)) {
      toast({ title: t("error"), description: t("imageTooLarge") });
      return;
    }

    try {
      setIsCreatingNewCarousel(true);
      const dataUrls = await Promise.all(files.map(readFileAsDataUrl));
      const response = await apiClient<{
        image?: string;
        images?: string[];
      }>({
        endpoint: "post/image",
        method: "POST",
        token: session?.sessionToken,
        body: { images: dataUrls },
      });
      const uploaded = Array.isArray(response?.images)
        ? response.images.filter(Boolean)
        : response?.image
          ? [response.image]
          : [];
      if (uploaded.length > 0 && editor) {
        const currentPos = typeof getPos === "function" ? getPos() : 0;
        const insertPos = currentPos + node.nodeSize;
        editor
          .chain()
          .insertContentAt(insertPos, [
            {
              type: "descriptionImageGroup",
              attrs: {
                images: uploaded,
                layout: "carousel",
              },
            },
            {
              type: "paragraph",
            },
          ])
          .focus()
          .run();
        toast({ title: t("uploadImageFinished") });
      }
    } catch {
      toast({ title: t("error"), description: t("imageUploadFailed") });
    } finally {
      setIsCreatingNewCarousel(false);
    }
  };

  if (images.length === 0) return null;

  return (
    <NodeViewWrapper className="my-4 block max-w-2xl">
      <div
        className={cn(
          "overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all",
          selected ? "ring-2 ring-primary border-primary" : "border-border"
        )}
      >
        {/* Editor controls toolbar */}
        <div
          contentEditable={false}
          className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/60 px-3 py-1.5 text-xs select-none"
        >
          {/* Layout switches */}
          <div className="flex items-center gap-1">
            <span className="mr-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("imageLayout")}:
            </span>
            <Button
              type="button"
              size="sm"
              variant={layout === "sequential" ? "default" : "outline"}
              className="h-7 px-2 text-xs gap-1 font-medium"
              onClick={() => updateAttributes({ layout: "sequential" })}
            >
              <Rows3 className="h-3.5 w-3.5" />
              <span>{t("layoutSequential")}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={layout === "carousel" ? "default" : "outline"}
              className="h-7 px-2 text-xs gap-1 font-medium"
              onClick={() => updateAttributes({ layout: "carousel" })}
            >
              <GalleryHorizontalEnd className="h-3.5 w-3.5" />
              <span>{t("layoutCarousel")}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={layout === "group" ? "default" : "outline"}
              className="h-7 px-2 text-xs gap-1 font-medium"
              onClick={() => updateAttributes({ layout: "group" })}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>{t("layoutGroup")}</span>
            </Button>
          </div>

          {/* Add more & Delete */}
          <div className="flex items-center gap-1.5">
            <Input
              ref={addFilesInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleAddMoreImages}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isAddingMore}
              className="h-7 px-2 text-xs gap-1"
              onClick={() => addFilesInputRef.current?.click()}
            >
              {isAddingMore ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span>{t("addMoreImages")}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={deleteNode}
              aria-label="Delete group"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Content Preview inside editor */}
        <div contentEditable={false} className="p-3 select-none">
          {layout === "carousel" ? (
            <div className="relative flex flex-col items-center overflow-hidden rounded-lg border border-border/80 bg-black/5 dark:bg-black/20">
              <div className="relative flex min-h-[220px] max-h-[380px] w-full items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getPostImageSrc(images[carouselIndex] || images[0])}
                  alt=""
                  className="max-h-[380px] w-full object-contain"
                />

                {/* Left/Right buttons */}
                <button
                  type="button"
                  onClick={() =>
                    setCarouselIndex((prev) =>
                      prev === 0 ? images.length - 1 : prev - 1
                    )
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-all shadow-md"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCarouselIndex((prev) =>
                      prev === images.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-all shadow-md"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                {/* Counter indicator */}
                <div className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                  {carouselIndex + 1} / {images.length}
                </div>

                {/* Delete current photo button */}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(carouselIndex)}
                  className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-all shadow-md"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Dots */}
              <div className="flex items-center gap-1.5 py-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCarouselIndex(idx)}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      idx === carouselIndex
                        ? "w-5 bg-primary"
                        : "w-2 bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            </div>
          ) : layout === "group" ? (
            <div
              className={cn(
                "grid gap-2",
                images.length === 2
                  ? "grid-cols-2"
                  : images.length === 3
                    ? "grid-cols-3"
                    : images.length === 4
                      ? "grid-cols-2"
                      : "grid-cols-3"
              )}
            >
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-muted/30"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getPostImageSrc(img)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow-md transition-all hover:bg-red-700 hover:scale-105"
                    title="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* Sequential */
            <div className="flex flex-col gap-3">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="group relative overflow-hidden rounded-lg border border-border bg-muted/30"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getPostImageSrc(img)}
                    alt=""
                    className="max-h-[360px] w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white shadow-md transition-all hover:bg-red-700 hover:scale-105"
                    title="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom toolbar under the image block with button to create another carousel */}
        <div
          contentEditable={false}
          className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/40 px-3 py-2 text-xs select-none"
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <GalleryHorizontalEnd className="h-3.5 w-3.5 text-primary" />
            <span>
              {layout === "carousel"
                ? `${t("layoutCarousel")} (${carouselIndex + 1}/${images.length})`
                : `${t("imageLayout")}: ${images.length}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={newCarouselInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleCreateAnotherCarousel}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isCreatingNewCarousel}
              className="h-7 px-2.5 text-xs gap-1.5 font-medium border-primary/30 bg-primary/5 hover:bg-primary hover:text-primary-foreground text-primary transition-all shadow-sm"
              onClick={() => newCarouselInputRef.current?.click()}
            >
              {isCreatingNewCarousel ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span>{t("addAnotherCarousel")}</span>
            </Button>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

const DescriptionImageGroup = Node.create({
  name: "descriptionImageGroup",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      images: { default: [] },
      layout: { default: "sequential" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-image-layout]",
        getAttrs: (dom) => {
          if (!(dom instanceof HTMLElement)) return false;
          const layout = (dom.getAttribute("data-image-layout") ||
            "sequential") as ImageGroupLayout;
          let images: string[] = [];
          const raw = dom.getAttribute("data-images");
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                images = parsed;
              }
            } catch {}
          }
          if (images.length === 0) {
            dom.querySelectorAll("img").forEach((img) => {
              const src = img.getAttribute("src");
              if (src) images.push(src);
            });
          }
          return { images, layout };
        },
      },
      {
        tag: "div.message-image-group",
        getAttrs: (dom) => {
          if (!(dom instanceof HTMLElement)) return false;
          const layout = (dom.getAttribute("data-image-layout") ||
            "sequential") as ImageGroupLayout;
          const images: string[] = [];
          dom.querySelectorAll("img").forEach((img) => {
            const src = img.getAttribute("src");
            if (src) images.push(src);
          });
          return { images, layout };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const images = (HTMLAttributes.images as string[]) || [];
    const layout = (HTMLAttributes.layout as string) || "sequential";
    const encoded = JSON.stringify(images);

    return [
      "div",
      mergeAttributes({
        class: `message-image-group message-image-group-${layout}`,
        "data-image-layout": layout,
        "data-images": encoded,
      }),
      ...images.map((src) => [
        "img",
        {
          src: getPostImageSrc(src),
          alt: "",
          class: "max-w-full rounded-md border object-contain",
          "data-in-group": "true",
        },
      ]),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DescriptionImageGroupView);
  },
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  modules?: Record<string, unknown>;
  onUploadingChange?: (uploading: boolean) => void;
  enableImages?: boolean;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeEditorHref(raw: string) {
  const value = raw.trim();
  if (!value) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  return `https://${value}`;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  modules: _modules,
  onUploadingChange,
  enableImages = false,
}) => {
  const t = useTranslations("sendmessage");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moreFilesInputRef = useRef<HTMLInputElement>(null);
  const linkSelectionRef = useRef<{ from: number; to: number } | null>(null);

  const [previewSrc, setPreviewSrc] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const imagesEnabledRef = useRef(enableImages);
  imagesEnabledRef.current = enableImages;

  // Dialog for inserting image(s) with layout selection
  const { data: session } = useSession();
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPreviews, setSelectedPreviews] = useState<string[]>([]);
  const [chosenLayout, setChosenLayout] =
    useState<ImageGroupLayout>("sequential");
  const [isUploading, setIsUploading] = useState(false);

  // Link dialog
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [originalLinkText, setOriginalLinkText] = useState("");
  const [editingExistingLink, setEditingExistingLink] = useState(false);

  const setUploadingState = (uploading: boolean) => {
    setIsUploading(uploading);
    onUploadingChange?.(uploading);
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      ...(enableImages ? [DescriptionImage, DescriptionImageGroup] : []),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
          class: "text-blue-600 underline",
        },
      }),
      Placeholder.configure({
        placeholder: "Type something here...",
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      handleClick: (_view, _pos, event) => {
        if (!imagesEnabledRef.current) return false;
        const target = event.target;
        if (!(target instanceof HTMLImageElement)) return false;
        const src = target.getAttribute("src");
        if (!src) return false;
        setPreviewSrc(src);
        setPreviewOpen(true);
        return false;
      },
      handlePaste: (_view, event) => {
        if (!enableImages) return false;
        const files = Array.from(event.clipboardData?.files ?? []).filter(
          (file) => file.type.startsWith("image/")
        );
        if (files.length === 0) return false;

        event.preventDefault();
        openInsertDialogWithFiles(files);
        return true;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", false);
    }
  }, [editor, value]);

  const openInsertDialogWithFiles = async (files: File[]) => {
    if (!enableImages || !editor || files.length === 0) return;

    if (files.some((file) => file.size > MAX_IMAGE_BYTES)) {
      toast({ title: t("error"), description: t("imageTooLarge") });
      return;
    }

    try {
      const dataUrls = await Promise.all(files.map(readFileAsDataUrl));
      setSelectedFiles(files);
      setSelectedPreviews(dataUrls);
      setChosenLayout(files.length > 1 ? "group" : "sequential");
      setImageModalOpen(true);
    } catch {
      toast({ title: t("error"), description: t("imageUploadFailed") });
    }
  };

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/")
    );
    event.target.value = "";
    if (files.length > 0) {
      void openInsertDialogWithFiles(files);
    }
  };

  const handleAddMoreToModal = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/")
    );
    event.target.value = "";
    if (files.length === 0) return;

    if (files.some((file) => file.size > MAX_IMAGE_BYTES)) {
      toast({ title: t("error"), description: t("imageTooLarge") });
      return;
    }

    try {
      const dataUrls = await Promise.all(files.map(readFileAsDataUrl));
      setSelectedFiles((prev) => [...prev, ...files]);
      setSelectedPreviews((prev) => [...prev, ...dataUrls]);
    } catch {
      toast({ title: t("error"), description: t("imageUploadFailed") });
    }
  };

  const handleRemoveModalImage = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setSelectedPreviews((prev) =>
      prev.filter((_, idx) => idx !== indexToRemove)
    );
  };



  const handleConfirmImageInsert = async () => {
    if (selectedFiles.length === 0 || !editor) {
      setImageModalOpen(false);
      return;
    }

    try {
      setUploadingState(true);
      const dataUrls = await Promise.all(selectedFiles.map(readFileAsDataUrl));
      const response = await apiClient<{
        image?: string;
        images?: string[];
      }>({
        endpoint: "post/image",
        method: "POST",
        token: session?.sessionToken,
        body: { images: dataUrls },
      });

      const uploaded = Array.isArray(response?.images)
        ? response.images.filter(Boolean)
        : response?.image
          ? [response.image]
          : [];

      if (uploaded.length > 0) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: "descriptionImageGroup",
            attrs: {
              images: uploaded,
              layout: chosenLayout,
            },
          })
          .run();

        toast({ title: t("uploadImageFinished") });
        setImageModalOpen(false);
        setSelectedFiles([]);
        setSelectedPreviews([]);
      }
    } catch {
      toast({ title: t("error"), description: t("imageUploadFailed") });
    } finally {
      setUploadingState(false);
    }
  };

  // Link helpers
  const readLinkLabel = () => {
    if (!editor) return "";
    const { from, to } = editor.state.selection;
    if (from !== to) return editor.state.doc.textBetween(from, to, "");
    if (!editor.isActive("link")) return "";

    const href = editor.getAttributes("link").href;
    let start = from;
    let end = to;
    let changed = true;

    while (changed) {
      changed = false;
      editor.state.doc.descendants((node, pos) => {
        if (!node.isText) return;
        const matched = node.marks.some(
          (mark) => mark.type.name === "link" && mark.attrs.href === href
        );
        if (!matched) return;

        const nodeFrom = pos;
        const nodeTo = pos + node.nodeSize;
        if (nodeTo < start || nodeFrom > end) return;
        if (nodeFrom < start || nodeTo > end) {
          start = Math.min(start, nodeFrom);
          end = Math.max(end, nodeTo);
          changed = true;
        }
      });
    }

    return editor.state.doc.textBetween(start, end, "");
  };

  const openLinkDialog = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const href = String(editor.getAttributes("link").href ?? "");
    const text = readLinkLabel();
    linkSelectionRef.current = { from, to };
    setLinkUrl(href);
    setLinkText(text);
    setOriginalLinkText(text);
    setEditingExistingLink(editor.isActive("link"));
    setLinkDialogOpen(true);
  };

  const savedLinkRange = () => {
    if (!editor || !linkSelectionRef.current) return null;
    const max = editor.state.doc.content.size;
    return {
      from: Math.min(linkSelectionRef.current.from, max),
      to: Math.min(linkSelectionRef.current.to, max),
    };
  };

  const applyLink = () => {
    if (!editor) return;
    const href = normalizeEditorHref(linkUrl);
    if (!href) {
      toast({
        title: "Error",
        description: "Enter a valid http, https, mailto, or tel link",
      });
      return;
    }

    const range = savedLinkRange();
    if (!range) return;

    const collapsed = range.from === range.to;
    const nextText = linkText.trim();
    let chain = editor.chain().focus().setTextSelection(range);

    if (collapsed && !editingExistingLink) {
      const label = nextText || href;
      chain
        .insertContent(`<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`)
        .run();
      setLinkDialogOpen(false);
      return;
    }

    if (collapsed && editingExistingLink) {
      chain = chain.extendMarkRange("link");
    }

    if (nextText && nextText !== originalLinkText) {
      chain = chain.insertContent(
        `<a href="${escapeHtml(href)}">${escapeHtml(nextText)}</a>`
      );
    } else {
      chain = chain.setLink({ href });
    }

    chain.run();
    setLinkDialogOpen(false);
  };

  const removeLink = () => {
    if (!editor) return;
    const range = savedLinkRange();
    if (!range) return;

    let chain = editor.chain().focus().setTextSelection(range);
    if (range.from === range.to) {
      chain = chain.extendMarkRange("link");
    }
    chain.unsetLink().run();
    setLinkDialogOpen(false);
  };

  return (
    <div className="rounded-md border bg-background">
      {/* Main editor toolbar */}
      <div className="flex flex-wrap gap-2 border-b p-2">
        {enableImages && (
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
        )}
        <Button
          type="button"
          size="sm"
          variant={editor?.isActive("bold") ? "default" : "outline"}
          aria-label="Bold"
          title="Bold"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <BoldIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor?.isActive("italic") ? "default" : "outline"}
          aria-label="Italic"
          title="Italic"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor?.isActive("underline") ? "default" : "outline"}
          aria-label="Underline"
          title="Underline"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor?.isActive("link") ? "default" : "outline"}
          aria-label="Link"
          title="Link"
          onClick={openLinkDialog}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        {enableImages && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isUploading}
            aria-label="Image"
            title={t("insertImages")}
            onClick={() => setImageModalOpen(true)}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      <EditorContent
        editor={editor}
        className="min-h-[160px] p-3 [&_.ProseMirror]:min-h-[140px] [&_.ProseMirror]:outline-none"
      />

      {enableImages ? (
        <ImageLightbox
          src={previewSrc}
          open={previewOpen}
          onOpenChange={(open) => {
            setPreviewOpen(open);
            if (!open) editor?.commands.focus();
          }}
          showTrigger={false}
        />
      ) : null}

      {/* Multi-Image Insertion Modal */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              <span>{t("insertImages")}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Image layout selector cards */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("imageLayout")}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {/* 1. Ketma-ket */}
                <button
                  type="button"
                  onClick={() => setChosenLayout("sequential")}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center transition-all",
                    chosenLayout === "sequential"
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Rows3 className="h-6 w-6" />
                  <span className="text-xs font-medium">
                    {t("layoutSequential")}
                  </span>
                </button>

                {/* 2. Carousel */}
                <button
                  type="button"
                  onClick={() => setChosenLayout("carousel")}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center transition-all",
                    chosenLayout === "carousel"
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <GalleryHorizontalEnd className="h-6 w-6" />
                  <span className="text-xs font-medium">
                    {t("layoutCarousel")}
                  </span>
                </button>

                {/* 3. Guruh */}
                <button
                  type="button"
                  onClick={() => setChosenLayout("group")}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center transition-all",
                    chosenLayout === "group"
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="h-6 w-6" />
                  <span className="text-xs font-medium">
                    {t("layoutGroup")}
                  </span>
                </button>
              </div>
            </div>

            {/* Selected Images Preview Grid or Empty Picker */}
            {selectedPreviews.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground">
                    {selectedPreviews.length} ta rasm tanlandi
                  </Label>
                  <Input
                    ref={moreFilesInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleAddMoreToModal}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => moreFilesInputRef.current?.click()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t("addMoreImages")}</span>
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 border rounded-lg bg-muted/20">
                  {selectedPreviews.map((src, idx) => (
                    <div
                      key={idx}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-background"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveModalImage(idx)}
                        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow hover:bg-red-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/80 bg-muted/10 p-6 text-center cursor-pointer transition-all hover:border-primary hover:bg-primary/5"
              >
                <div className="rounded-full bg-muted/60 p-3 text-muted-foreground">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Rasmlarni tanlash uchun bosing
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Bir vaqtning o&apos;zida bir nechta rasm tanlashingiz mumkin
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              onClick={() => {
                setImageModalOpen(false);
                setSelectedFiles([]);
                setSelectedPreviews([]);
              }}
            >
              {t("close")}
            </Button>
            <Button
              type="button"
              disabled={isUploading || selectedFiles.length === 0}
              onClick={handleConfirmImageInsert}
              className="gap-2 min-w-[120px]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t("uploadingImages")}</span>
                </>
              ) : (
                <span>{t("insertImages")}</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add link</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="rich-text-link-url">URL</Label>
              <Input
                id="rich-text-link-url"
                value={linkUrl}
                placeholder="https://example.com"
                autoFocus
                onChange={(event) => setLinkUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyLink();
                  }
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rich-text-link-text">Text</Label>
              <Input
                id="rich-text-link-text"
                value={linkText}
                placeholder="Link text"
                onChange={(event) => setLinkText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyLink();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            {editingExistingLink && (
              <Button type="button" variant="outline" onClick={removeLink}>
                Remove link
              </Button>
            )}
            <Button type="button" onClick={applyLink}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RichTextEditor;
