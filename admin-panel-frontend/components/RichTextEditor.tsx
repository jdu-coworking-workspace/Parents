"use client";

import React, { useEffect } from "react";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type NodeViewProps,
} from "@tiptap/react";
import { Extension, mergeAttributes, Node } from "@tiptap/core";
import {
  NodeSelection,
  Plugin,
  PluginKey,
  TextSelection,
} from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold as BoldIcon,
  ChevronLeft,
  ChevronRight,
  GalleryHorizontal,
  Image as ImageIcon,
  Italic as ItalicIcon,
  LayoutGrid,
  Link as LinkIcon,
  Loader2,
  Plus,
  Rows,
  Trash2,
  Underline as UnderlineIcon,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
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
import { useTranslations } from "next-intl";
import useApiMutation from "@/lib/useApiMutation";
import {
  MAX_IMAGE_BYTES,
  getPostImageSrc,
  readFileAsDataUrl,
} from "@/lib/postImages";

interface ImageGroupContextType {
  uploadFiles: (files: File[]) => Promise<string[]>;
  openLightbox: (src: string) => void;
  isUploading: boolean;
}

const ImageGroupContext = React.createContext<ImageGroupContextType | null>(null);

const DescriptionImageGroupView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  deleteNode,
  selected,
}) => {
  const images = ((node.attrs.images as string[]) || []).filter(Boolean);
  const layout = (node.attrs.layout as "carousel" | "grid" | "stack") || "carousel";
  const [activeIdx, setActiveIdx] = React.useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const context = React.useContext(ImageGroupContext);
  const [localUploading, setLocalUploading] = React.useState(false);

  const safeIdx = Math.min(Math.max(0, activeIdx), Math.max(0, images.length - 1));

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) =>
      f.type.startsWith("image/")
    );
    e.target.value = "";
    if (files.length === 0 || !context) return;
    setLocalUploading(true);
    try {
      const urls = await context.uploadFiles(files);
      if (urls.length > 0) {
        updateAttributes({ images: [...images, ...urls] });
      }
    } finally {
      setLocalUploading(false);
    }
  };

  const removeImageAt = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    if (next.length === 0) {
      deleteNode();
    } else {
      updateAttributes({ images: next });
      if (activeIdx >= next.length) {
        setActiveIdx(Math.max(0, next.length - 1));
      }
    }
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <NodeViewWrapper className="relative my-3 block max-w-full">
      <div
        className={`rounded-lg border bg-card p-2 shadow-sm transition-all ${
          selected ? "ring-2 ring-primary" : "hover:border-primary/50"
        }`}
      >
        {/* Ustki Toolbar */}
        <div
          contentEditable={false}
          className="mb-2 flex flex-wrap items-center justify-between gap-1 border-b pb-2 text-xs"
        >
          {/* Rejim tugmalari */}
          <div className="flex items-center gap-1 rounded bg-muted p-0.5">
            <button
              type="button"
              className={`flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors ${
                layout === "stack"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => updateAttributes({ layout: "stack" })}
              title="Oddiy (ketma-ket)"
            >
              <Rows className="h-3.5 w-3.5" />
              <span>Oddiy</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors ${
                layout === "carousel"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => updateAttributes({ layout: "carousel" })}
              title="Karusel (slayd)"
            >
              <GalleryHorizontal className="h-3.5 w-3.5" />
              <span>Karusel</span>
            </button>
            <button
              type="button"
              className={`flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors ${
                layout === "grid"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => updateAttributes({ layout: "grid" })}
              title="Guruh (Grid)"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Guruh</span>
            </button>
          </div>

          {/* Qo'shimcha amallar: Rasm qo'shish va Guruhni o'chirish */}
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleAddFiles}
            />
            <button
              type="button"
              disabled={localUploading}
              className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() => fileInputRef.current?.click()}
              title="Yana rasm qo'shish"
            >
              {localUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span>Rasm qo'shish</span>
            </button>
            <button
              type="button"
              className="rounded p-1 text-destructive hover:bg-destructive/10"
              onClick={deleteNode}
              title="Guruhni o'chirish"
              aria-label="Delete group"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Kontent: Layout ga qarab */}
        {layout === "carousel" && (
          <div className="relative flex flex-col items-center">
            {/* Asosiy rasm */}
            <div className="relative flex max-h-[380px] w-full items-center justify-center overflow-hidden rounded-md bg-muted/40">
              <img
                src={getPostImageSrc(images[safeIdx])}
                alt=""
                className="max-h-[360px] max-w-full object-contain cursor-pointer"
                onClick={() => context?.openLightbox(getPostImageSrc(images[safeIdx]))}
              />
              <button
                type="button"
                contentEditable={false}
                className="absolute right-2 top-2 z-10 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImageAt(safeIdx);
                }}
                title="Ushbu rasmni o'chirish"
              >
                <X className="h-4 w-4" />
              </button>

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    contentEditable={false}
                    disabled={safeIdx === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white disabled:opacity-30 hover:bg-black/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveIdx((prev) => Math.max(0, prev - 1));
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    contentEditable={false}
                    disabled={safeIdx === images.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white disabled:opacity-30 hover:bg-black/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveIdx((prev) => Math.min(images.length - 1, prev + 1));
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div
                    contentEditable={false}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] font-medium text-white"
                  >
                    {safeIdx + 1} / {images.length}
                  </div>
                </>
              )}
            </div>

            {/* Pastki miniatyuralar (Thumbnails) */}
            {images.length > 1 && (
              <div
                contentEditable={false}
                className="mt-2 flex w-full max-w-full gap-1.5 overflow-x-auto py-1"
              >
                {images.map((src, idx) => (
                  <button
                    key={`${src}-${idx}`}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={`relative h-12 w-12 flex-shrink-0 overflow-hidden rounded border transition-all ${
                      idx === safeIdx ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={getPostImageSrc(src)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {layout === "grid" && (
          <div
            className={`grid gap-2 ${
              images.length === 1
                ? "grid-cols-1"
                : images.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-2 md:grid-cols-3"
            }`}
          >
            {images.map((src, idx) => (
              <div
                key={`${src}-${idx}`}
                className="relative aspect-4/3 overflow-hidden rounded-md border bg-muted/30"
              >
                <img
                  src={getPostImageSrc(src)}
                  alt=""
                  className="h-full w-full object-cover cursor-pointer"
                  onClick={() => context?.openLightbox(getPostImageSrc(src))}
                />
                <button
                  type="button"
                  contentEditable={false}
                  className="absolute right-1.5 top-1.5 z-10 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImageAt(idx);
                  }}
                  title="Rasmni o'chirish"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {layout === "stack" && (
          <div className="flex flex-col gap-3">
            {images.map((src, idx) => (
              <div
                key={`${src}-${idx}`}
                className="relative flex justify-center overflow-hidden rounded-md border bg-muted/20 p-1"
              >
                <img
                  src={getPostImageSrc(src)}
                  alt=""
                  className="max-h-[360px] max-w-full rounded object-contain cursor-pointer"
                  onClick={() => context?.openLightbox(getPostImageSrc(src))}
                />
                <button
                  type="button"
                  contentEditable={false}
                  className="absolute right-2 top-2 z-10 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImageAt(idx);
                  }}
                  title="Rasmni o'chirish"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
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
  inline: false,
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      layout: {
        default: "carousel",
      },
      images: {
        default: [],
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-image-group]",
        getAttrs: (element) => {
          const dom = element as HTMLElement;
          const layout = (dom.getAttribute("data-layout") as "carousel" | "grid" | "stack") || "carousel";
          const imgs = Array.from(dom.querySelectorAll("img"))
            .map((img) => img.getAttribute("src"))
            .filter(Boolean) as string[];
          return { layout, images: imgs };
        },
      },
      {
        tag: "img[src]",
        getAttrs: (element) => {
          const dom = element as HTMLElement;
          if (dom.closest("div[data-image-group]")) return false;
          const src = dom.getAttribute("src");
          if (!src) return false;
          return { layout: "stack", images: [src] };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const layout = (node.attrs.layout as string) || "carousel";
    const images = ((node.attrs.images as string[]) || []).filter(Boolean);

    return [
      "div",
      {
        "data-image-group": "true",
        "data-layout": layout,
        class: `message-image-group message-image-group-${layout}`,
      },
      ...images.map((src) => [
        "img",
        {
          src: getPostImageSrc(src),
          class: "max-w-full rounded-md border object-contain",
        },
      ]),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DescriptionImageGroupView);
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        if (
          selection instanceof NodeSelection &&
          selection.node.type.name === this.name
        ) {
          const pos = selection.to;
          return editor
            .chain()
            .insertContentAt(pos, { type: "paragraph" })
            .setTextSelection(pos + 1)
            .focus()
            .run();
        }
        return false;
      },
      ArrowDown: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        if (
          selection instanceof NodeSelection &&
          selection.node.type.name === this.name
        ) {
          const pos = selection.to;
          if (pos >= state.doc.content.size) {
            return editor
              .chain()
              .insertContentAt(pos, { type: "paragraph" })
              .setTextSelection(pos + 1)
              .focus()
              .run();
          }
        }
        return false;
      },
    };
  },
});

const TrailingParagraph = Extension.create({
  name: "trailingParagraph",
  addProseMirrorPlugins() {
    const pluginKey = new PluginKey("trailingParagraph");
    return [
      new Plugin({
        key: pluginKey,
        appendTransaction: (_transactions, _oldState, newState) => {
          const { doc, schema, tr } = newState;
          const lastChild = doc.lastChild;
          if (
            lastChild &&
            (lastChild.type.name === "descriptionImageGroup" ||
              lastChild.type.name === "descriptionImage")
          ) {
            const paragraph = schema.nodes.paragraph.createAndFill();
            if (paragraph) {
              return tr.insert(doc.content.size, paragraph);
            }
          }
          return null;
        },
      }),
    ];
  },
});

interface RichTextEditorProps {
  value: string; // Controlled value
  onChange: (value: string) => void; // Change handler
  modules?: Record<string, unknown>; // Optional modules for customization
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
  const { data: session } = useSession();
  const t = useTranslations("sendmessage");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const linkSelectionRef = React.useRef<{ from: number; to: number } | null>(
    null
  );
  const [isUploading, setIsUploading] = React.useState(false);
  const [previewSrc, setPreviewSrc] = React.useState("");
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const imagesEnabledRef = React.useRef(enableImages);
  imagesEnabledRef.current = enableImages;
  const openPreviewRef = React.useRef<(src: string) => void>(() => {});
  openPreviewRef.current = (src: string) => {
    setPreviewSrc(src);
    setPreviewOpen(true);
  };
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [linkText, setLinkText] = React.useState("");
  const [originalLinkText, setOriginalLinkText] = React.useState("");
  const [editingExistingLink, setEditingExistingLink] = React.useState(false);

  const setUploading = (uploading: boolean) => {
    setIsUploading(uploading);
    onUploadingChange?.(uploading);
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      ...(enableImages ? [DescriptionImageGroup, TrailingParagraph] : []),
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
      handleTextInput: (view, _from, _to, text) => {
        if (!imagesEnabledRef.current) return false;
        const { state } = view;
        const { selection } = state;
        if (
          selection instanceof NodeSelection &&
          (selection.node.type.name === "descriptionImageGroup" ||
            selection.node.type.name === "descriptionImage")
        ) {
          const pos = selection.to;
          const tr = state.tr
            .insert(pos, state.schema.nodes.paragraph.createAndFill()!)
            .insertText(text, pos + 1);
          tr.setSelection(TextSelection.create(tr.doc, pos + 1 + text.length));
          view.dispatch(tr);
          return true;
        }
        return false;
      },
      handleClick: (_view, _pos, event) => {
        if (!imagesEnabledRef.current) return false;
        const target = event.target;
        if (!(target instanceof HTMLImageElement)) return false;
        const src = target.getAttribute("src");
        if (!src) return false;
        openPreviewRef.current(src);
        return false;
      },
      handlePaste: (_view, event) => {
        if (!enableImages) return false;

        const files = Array.from(event.clipboardData?.files ?? []).filter(
          (file) => file.type.startsWith("image/")
        );

        if (files.length === 0) return false;

        event.preventDefault();
        void uploadDescriptionImages(files);
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

  const insertImages = (urls: string[]) => {
    if (!editor || urls.length === 0) return;
    const layout = urls.length > 1 ? "carousel" : "stack";
    const content = [
      {
        type: "descriptionImageGroup",
        attrs: { layout, images: urls },
      },
      { type: "paragraph" },
    ];
    editor.chain().focus().insertContent(content).run();
  };

  const uploadImageMutation = useApiMutation<
    { image?: string; images?: string[] },
    { images: string[] }
  >(`post/image`, "POST", ["postImage"], {
    onError: () => {
      toast({
        title: t("error"),
        description: t("imageUploadFailed"),
      });
    },
  });

  const uploadFiles = React.useCallback(
    async (files: File[]): Promise<string[]> => {
      if (!enableImages || files.length === 0) return [];
      if (files.some((file) => file.size > MAX_IMAGE_BYTES)) {
        toast({ title: t("error"), description: t("imageTooLarge") });
        return [];
      }
      try {
        setUploading(true);
        const images = await Promise.all(files.map(readFileAsDataUrl));
        const res = await uploadImageMutation.mutateAsync({ images });
        const uploaded = Array.isArray(res?.images)
          ? res.images.filter(Boolean)
          : res?.image
            ? [res.image]
            : [];
        return uploaded;
      } catch {
        return [];
      } finally {
        setUploading(false);
      }
    },
    [enableImages, uploadImageMutation, t]
  );

  const uploadDescriptionImages = async (files: File[]) => {
    if (!editor) return;
    const urls = await uploadFiles(files);
    if (urls.length > 0) {
      insertImages(urls);
      toast({ title: t("uploadImageFinished") });
    }
  };

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/")
    );
    event.target.value = "";
    void uploadDescriptionImages(files);
  };

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
        .insertContent(
          `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`
        )
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
    <ImageGroupContext.Provider
      value={{
        uploadFiles,
        openLightbox: (src) => openPreviewRef.current(src),
        isUploading,
      }}
    >
      <div className="rounded-md border bg-background">
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
              title="Image"
              onClick={() => fileInputRef.current?.click()}
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
          className="min-h-[160px] p-3 [&_.ProseMirror]:min-h-[140px] [&_.ProseMirror]:outline-none [&_.ProseMirror_img]:my-3 [&_.ProseMirror_img]:max-h-[360px] [&_.ProseMirror_img]:cursor-zoom-in"
        />
        {enableImages ? (
          <ImageLightbox
            src={previewSrc}
            open={previewOpen}
            onOpenChange={(open) => {
              setPreviewOpen(open);
              if (!open) {
                editor?.commands.focus();
              }
            }}
            showTrigger={false}
          />
        ) : null}

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
    </ImageGroupContext.Provider>
  );
};

export default RichTextEditor;
