"use client";

import React, { useEffect } from "react";
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
  Image as ImageIcon,
  Italic as ItalicIcon,
  Loader2,
  Underline as UnderlineIcon,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/apiClient";
import { useTranslations } from "next-intl";
import useApiMutation from "@/lib/useApiMutation";
import {
  MAX_IMAGE_BYTES,
  getPostImageSrc,
  readFileAsDataUrl,
} from "@/lib/postImages";

const DescriptionImageView = ({ node, deleteNode, selected }: NodeViewProps) => (
  <NodeViewWrapper className="relative my-3 inline-block max-w-full">
    <button
      type="button"
      contentEditable={false}
      className="absolute right-0 top-0 z-10 -translate-y-1/4 translate-x-1/4"
      onClick={deleteNode}
      aria-label="Delete"
    >
      <X className="h-7 w-7 rounded-full bg-red-500 p-1 text-white hover:bg-red-600" />
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
  addNodeView() {
    return ReactNodeViewRenderer(DescriptionImageView);
  },
});

interface RichTextEditorProps {
  value: string; // Controlled value
  onChange: (value: string) => void; // Change handler
  modules?: Record<string, unknown>; // Optional modules for customization
  onUploadingChange?: (uploading: boolean) => void;
  enableImages?: boolean;
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
  const [isUploading, setIsUploading] = React.useState(false);

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

  const uploadImageMutation = useApiMutation<
  { image?: string; images?: string[] },
  { images: string[] }
>(`post/image`, "POST", ["postImage"], {
  onSuccess: (data) => {
    const uploaded = Array.isArray(data.images)
      ? data.images.filter(Boolean)
      : data.image
        ? [data.image]
        : [];
    uploaded.forEach(insertImage);
    toast({ title: t("uploadImageFinished") });
  },
  onError: () => {
    toast({
      title: t("error"),
      description: t("imageUploadFailed"),
    });
  },
  onSettled: () => setUploading(false),
});

const uploadDescriptionImages = async (files: File[]) => {
  if (!enableImages || !editor || files.length === 0) return;

  if (files.some((file) => file.size > MAX_IMAGE_BYTES)) {
    toast({ title: t("error"), description: t("imageTooLarge") });
    return;
  }

  try {
    setUploading(true);
    const images = await Promise.all(files.map(readFileAsDataUrl));
    uploadImageMutation.mutate({ images });
  } catch {
    setUploading(false);
    toast({ title: t("error"), description: t("imageUploadFailed") });
  }
};

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/")
    );
    event.target.value = "";
    void uploadDescriptionImages(files);
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
        className="min-h-[160px] p-3 [&_.ProseMirror]:min-h-[140px] [&_.ProseMirror]:outline-none [&_.ProseMirror_img]:my-3 [&_.ProseMirror_img]:max-h-[360px]"
      />
    </div>
  );
};

export default RichTextEditor;
