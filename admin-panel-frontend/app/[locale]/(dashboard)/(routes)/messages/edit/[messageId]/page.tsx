"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RichTextEditor from "@/components/RichTextEditor";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { postEditSchema } from "@/lib/validationSchemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/navigation";
import { useMakeZodI18nMap } from "@/lib/zodIntl";
import React, { useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import NotFound from "@/components/NotFound";
import { useListQuery } from "@/lib/useListQuery";
import Post from "@/types/post";
import useApiMutation from "@/lib/useApiMutation";
import MessageImagePicker from "@/components/MessageImagePicker";
import { Label } from "@/components/ui/label";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { normalizePostImages } from "@/lib/postImages";

const formSchema = postEditSchema;

type EditPostPayload = {
  title: string;
  description: string;
  priority: string;
  image: string;
  images: string[];
};

export default function SendMessagePage({
  params,
}: {
  params: Promise<{ messageId: string }>;
}) {
  const { messageId } = React.use(params);
  const zodErrors = useMakeZodI18nMap();
  z.setErrorMap(zodErrors);
  const t = useTranslations("sendmessage");
  const [isImageUploading, setIsImageUploading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "low",
      image: "",
      images: [],
    },
  });
  const router = useRouter();
  const { data, isLoading, isError } = useListQuery<{
    post: Post;
  }>(`post/${messageId}`, ["message", messageId]);

  const { mutate, isPending } = useApiMutation<
    { message: string },
    EditPostPayload
  >(`post/${messageId}`, "PUT", ["editMessage", messageId], {
    onSuccess: (data) => {
      toast({
        title: t("messageEdited"),
        description: data?.message,
      });
      form.reset();
      router.push(`/messages/${messageId}`);
    },
  });
  const priority = form.watch("priority");

  useEffect(() => {
    form.setValue("priority", priority);
  }, [priority, form]);

  useEffect(() => {
    if (data) {
      const images = normalizePostImages(data.post.image, data.post.images);
      form.reset({
        title: data.post.title,
        description: data.post.description,
        priority: data.post.priority as "high" | "medium" | "low",
        image: images[0] ?? "",
        images,
      });
    }
  }, [data, form]);

  const syncImagesToForm = (images: string[]) => {
    form.setValue("image", images[0] ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  if (isError) return <NotFound />;

  return (
    <div className="w-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => {
            const images = normalizePostImages(values.image, values.images);
            mutate({
              title: values.title,
              description: values.description,
              priority: values.priority,
              image: images[0] ?? "",
              images,
            });
          })}
          className="space-y-4"
        >
          <PageHeader title={t("editMessage")}>
            <BackButton href={`/messages/${messageId}`} />
          </PageHeader>

          <FormField
            control={form.control}
            name="title"
            render={({ field, formState }) => (
              <FormItem>
                <FormLabel>{t("title")}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={t("typeTitle")} />
                </FormControl>
                <FormMessage>
                  {formState.errors.title &&
                    "Title is required. Title should be more than 5 characters"}
                </FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field, formState }) => (
              <FormItem>
                <FormLabel>{t("yourMessage")}</FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onUploadingChange={setIsImageUploading}
                    enableImages
                  />
                </FormControl>
                <FormMessage>
                  {formState.errors.description &&
                    "Message is required. Message should be more than 10 characters"}
                </FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="images"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("picture")}</FormLabel>
                <FormControl>
                  <MessageImagePicker
                    value={field.value ?? []}
                    onChange={(images) => {
                      field.onChange(images);
                      syncImagesToForm(images);
                    }}
                    onUploadingChange={setIsImageUploading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field, formState }) => (
              <FormItem>
                <FormLabel>{t("choosePriority")}</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="high" id="high" />
                      <Label htmlFor="high">{t("high")}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="medium" />
                      <Label htmlFor="medium">{t("medium")}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low" id="low" />
                      <Label htmlFor="low">{t("low")}</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage>
                  {formState.errors.priority &&
                    "You should select one priority"}
                </FormMessage>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            isLoading={isPending || isLoading || isImageUploading}
            disabled={isPending || isLoading || isImageUploading}
          >
            {t("editMessage")}
          </Button>
        </form>
      </Form>
    </div>
  );
}
