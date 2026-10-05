"use client";

import React, { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { mergeAttributes, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold as BoldIcon,
  Image as ImageIcon,
  Italic as ItalicIcon,
  Link as LinkIcon,
  Loader2,
  Underline as UnderlineIcon,
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
import {
  MAX_IMAGE_BYTES,
  getPostImageSrc,
  readFileAsDataUrl,
} from "@/lib/postImages";

const DescriptionImage = Node.create({
  name: "descriptionImage",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
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
      ...(enableImages ? [DescriptionImage] : []),
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

  const insertImage = (src: string) => {
    editor
      ?.chain()
      .focus()
      .insertContent({ type: "descriptionImage", attrs: { src } })
      .run();
  };

  const uploadDescriptionImages = async (files: File[]) => {
    if (!enableImages || !editor || files.length === 0) return;

    const oversized = files.some((file) => file.size > MAX_IMAGE_BYTES);
    if (oversized) {
      toast({
        title: "Error",
        description: "Image size should be less than 10MB",
      });
      return;
    }

    try {
      setUploading(true);
      const images = await Promise.all(files.map(readFileAsDataUrl));
      const data = await apiClient<{ image?: string; images?: string[] }>({
        endpoint: "post/image",
        method: "POST",
        token: session?.sessionToken,
        body: { images },
      });
      const uploadedImages = Array.isArray(data.images)
        ? data.images.filter(Boolean)
        : data.image
          ? [data.image]
          : [];

      uploadedImages.forEach(insertImage);
    } catch {
      toast({
        title: "Error",
        description: "Image upload failed",
      });
    } finally {
      setUploading(false);
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
  );
};

export default RichTextEditor;
