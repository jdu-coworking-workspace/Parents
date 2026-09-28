"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import localImageLoader from "@/lib/localImageLoader";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SendMessageConfirmDialog from "@/components/SendMessageConfirmDialog";
import MessageImagePicker from "@/components/MessageImagePicker";
import RichTextEditor from "@/components/RichTextEditor";
import Group from "@/types/group";
import { GroupTable } from "@/components/GroupTable";
import Student from "@/types/student";
import { StudentTable } from "@/components/StudentTable";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "@/navigation";
import { useMakeZodI18nMap } from "@/lib/zodIntl";
import { toast } from "@/components/ui/use-toast";
import Post from "@/types/post";
import useApiMutation from "@/lib/useApiMutation";
import DraftsDialog, { DraftData } from "@/components/DraftsDialog";
import { Send } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DateTimePicker24h } from "@/components/DateTimePicker24h";
import { Switch } from "@/components/ui/switch";
import { postCreateSchema } from "@/lib/validationSchemas";
import { useSearchParams } from "next/navigation";
import { normalizePostImages } from "@/lib/postImages";

const formSchema = postCreateSchema;

function AudienceIcon({ src, className }: { src: string; className?: string }) {
  return (
    <Image
      loader={localImageLoader}
      src={src}
      alt=""
      width={56}
      height={56}
      className={className}
      aria-hidden
    />
  );
}

interface CreatePostPayload {
  title: string;
  description: string;
  priority: string;
  audience: AudienceTab;
  students: number[];
  groups: number[];
  image: string;
  images: string[];
  scheduled_at?: string;
}

type AudienceTab = "parents" | "students";

export default function SendMessagePage() {
  const zodErrors = useMakeZodI18nMap();
  z.setErrorMap(zodErrors);
  const t = useTranslations("sendmessage");
  const tPosts = useTranslations("posts");
  const searchParams = useSearchParams();
  const audienceParam = searchParams?.get("audience");
  const initialAudience: AudienceTab =
    audienceParam === "students" ? "students" : "parents";
  const tName = useTranslations("names");
  const [audienceTab, setAudienceTab] = useState<AudienceTab>(initialAudience);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  const [draftsData, setDraftsData] = useState<DraftData[]>([]);
  const [shouldPersistForm, setShouldPersistForm] = useState(true);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      priority: "low",
      image: "",
      images: [],
    },
  });
  const formValues = useWatch({ control: form.control });
  const router = useRouter();
  const clearFormPersistence = () => {
    setShouldPersistForm(false);
    localStorage.removeItem("formDataMessages");
  };
  const { mutate, isPending } = useApiMutation<
    { post: Post },
    CreatePostPayload
  >(`post/create`, "POST", ["sendMessage"], {
    onSuccess: (data) => {
      toast({
        title: t("messageSent"),
        description: data?.post?.title ?? "",
      });
      setSelectedStudents([]);
      setSelectedGroups([]);
      clearFormPersistence();
      form.reset({
        title: "",
        description: "",
        priority: "low",
        image: "",
        images: [],
      });
      router.push("/messages");
    },
  });
  const priority = form.watch("priority");

  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

  useEffect(() => {
    setAudienceTab(initialAudience);
  }, [initialAudience]);

  const scheduleMutation = useApiMutation<{ post: Post }, CreatePostPayload>(
    `schedule`,
    "POST",
    ["scheduledPosts"],
    {
      onSuccess: (data) => {
        if (data?.post?.title) {
          toast({
            title: t("scheduledSuccessfully"),
            description: data.post.title,
          });
        } else {
          toast({
            title: t("scheduledSuccessfully"),
            description: t("noTitleAvailable"),
          });
        }
        setSelectedStudents([]);
        setSelectedGroups([]);
        clearFormPersistence();
        form.reset({
          title: "",
          description: "",
          priority: "low",
          image: "",
          images: [],
        });
        router.push("/messages?tab=scheduled");
      },
    }
  );

  useEffect(() => {
    form.setValue("priority", priority);
  }, [priority, form]);

  useEffect(() => {
    if (!shouldPersistForm) return;
    const savedFormData = localStorage.getItem("formDataMessages");
    const parsedFormData = savedFormData && JSON.parse(savedFormData);
    if (parsedFormData) {
      form.reset(parsedFormData);
    }

    const subscription = form.watch((values) => {
      const safeValues = {
        ...values,
        image: undefined,
        images: undefined,
      };
      localStorage.setItem("formDataMessages", JSON.stringify(safeValues));
    });
    return () => subscription.unsubscribe();
  }, [form, shouldPersistForm]);

  useEffect(() => {
    const draftsLocal = localStorage.getItem("DraftsData");
    const parsedDrafts = draftsLocal ? JSON.parse(draftsLocal) : [];
    setDraftsData(parsedDrafts);
  }, []);

  const syncImagesToForm = (images: string[]) => {
    form.setValue("image", images[0] ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleFormSubmit = (data: z.infer<typeof formSchema>) => {
    if (selectedStudents.length === 0 && selectedGroups.length === 0) {
      toast({
        title: t("error"),
        description: t("selectAtLeastOne"),
      });
      return;
    }
    if (isImageUploading) {
      return;
    }
    const images = normalizePostImages(data.image, data.images);
    const payload = {
      title: data.title,
      description: data.description,
      priority: data.priority,
      audience: audienceTab,
      students: selectedStudents.map((student) => student.id),
      groups: selectedGroups.map((group) => group.id),
      image: images[0] ?? "",
      images,
    };

    if (scheduleEnabled) {
      if (!scheduledAt) {
        toast({
          title: t("error"),
          description: t("selectDateTime"),
        });
        return;
      }
      scheduleMutation.mutate({
        ...payload,
        scheduled_at: scheduledAt.toISOString(),
      });
    } else {
      mutate(payload);
    }
  };

  const isFormValid = form.formState.isValid;
  const hasRecipients =
    selectedStudents.length > 0 || selectedGroups.length > 0;
  const isSubmitting =
    isPending || scheduleMutation.isPending || isImageUploading;

  const handleSaveDraft = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const data = form.getValues();
    const images = normalizePostImages(data.image, data.images);

    const draftsLocal: DraftData[] = JSON.parse(
      localStorage.getItem("DraftsData") || "[]"
    );
    const parsedData: DraftData = {
      id: draftsLocal.length || 0,
      title: data.title,
      description: data.description,
      priority: data.priority,
      image: images[0] || "",
      images,
      groups: selectedGroups as unknown as DraftData["groups"],
      students: selectedStudents as unknown as DraftData["students"],
    };

    if (parsedData) {
      draftsLocal.push(parsedData);
    }

    localStorage.setItem("DraftsData", JSON.stringify(draftsLocal));
    setDraftsData(draftsLocal);

    setSelectedStudents([]);
    setSelectedGroups([]);
    form.reset({
      title: "",
      description: "",
      priority: "low",
      image: "",
      images: [],
    });
    toast({
      title: t("draftSaved"),
      description: parsedData?.title,
    });
    localStorage.removeItem("formDataMessages");
  };

  const handleSelectedDraft = (draft: DraftData) => {
    const images = normalizePostImages(
      typeof draft.image === "string" && !draft.image.startsWith("data:")
        ? draft.image
        : "",
      Array.isArray(draft.images)
        ? draft.images.filter(
            (item) => typeof item === "string" && !item.startsWith("data:")
          )
        : []
    );
    form.reset({
      title: draft.title,
      description: draft.description,
      priority: (draft.priority as "high" | "medium" | "low") || "low",
      image: images[0] ?? "",
      images,
    });

    setSelectedGroups((draft.groups as unknown as Group[]) || []);
    setSelectedStudents((draft.students as unknown as Student[]) || []);
  };

  return (
    <div className="w-full">
      <Form {...form}>
        <PageHeader
          title={t("sendMessageTo", {
            audience: t(audienceTab === "parents" ? "toParents" : "toStudents"),
          })}
          variant="create"
        >
          <DraftsDialog
            draftsDataProp={draftsData}
            handleSelectedDraft={handleSelectedDraft}
          />
          <Link href={`/fromcsv/message?audience=${audienceTab}`}>
            <Button variant={"secondary"} type="button">
              {t("createFromCSV")}
            </Button>
          </Link>
          <BackButton href={`/messages`} />
        </PageHeader>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          ref={formRef}
          className="space-y-4"
        >
          <Tabs
            value={audienceTab}
            onValueChange={(value) => {
              setAudienceTab(value as AudienceTab);
              setSelectedGroups([]);
              setSelectedStudents([]);
            }}
          >
            <TabsList className="mt-2 [&_[data-state=active]]:bg-black [&_[data-state=active]]:text-white dark:[&_[data-state=active]]:bg-white dark:[&_[data-state=active]]:text-black">
              <TabsTrigger
                value="parents"
                className="group flex items-center gap-2"
              >
                <AudienceIcon
                  src="/assets/parents-icon.png"
                  className="h-5 w-5 group-data-[state=active]:brightness-0 group-data-[state=active]:invert dark:group-data-[state=active]:invert-0"
                />
                {tPosts("parents")}
              </TabsTrigger>
              <TabsTrigger
                value="students"
                className="group flex items-center gap-2"
              >
                <AudienceIcon
                  src="/assets/group-recipients-icon.png"
                  className="h-5 w-5 group-data-[state=active]:brightness-0 group-data-[state=active]:invert dark:group-data-[state=active]:invert-0"
                />
                {tPosts("students")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <FormField
            control={form.control}
            name="title"
            render={({ field, formState }) => (
              <FormItem>
                <FormLabel>{t("title")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t("typeTitle")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const messageField = document.getElementById(
                          "description-textarea"
                        );
                        if (messageField) {
                          messageField.focus();
                        }
                      }
                    }}
                  />
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

          <Tabs defaultValue="group">
            <TabsList className="[&_[data-state=active]]:bg-black [&_[data-state=active]]:text-white dark:[&_[data-state=active]]:bg-white dark:[&_[data-state=active]]:text-black">
              <TabsTrigger value="group">{t("groups")}</TabsTrigger>
              <TabsTrigger value="student">{t("students")}</TabsTrigger>
            </TabsList>
            <TabsContent value="group">
              <GroupTable
                selectedGroups={selectedGroups}
                setSelectedGroups={setSelectedGroups}
                useIndependentState={true}
              />
            </TabsContent>
            <TabsContent value="student">
              <StudentTable
                selectedStudents={selectedStudents}
                setSelectedStudents={setSelectedStudents}
                useIndependentState={true}
              />
            </TabsContent>
          </Tabs>
          <div className="flex flex-col gap-4 border p-4 rounded-md bg-muted/40">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                {t("doYouWantSchedule")}
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={scheduleEnabled}
                  onCheckedChange={setScheduleEnabled}
                  id="schedule-switch"
                />
                <Label htmlFor="schedule-switch" className="ml-2">
                  {scheduleEnabled ? t("yes") : t("no")}
                </Label>
              </div>
            </div>
            {scheduleEnabled && (
              <div className="mt-2">
                <DateTimePicker24h
                  value={scheduledAt}
                  onChange={setScheduledAt}
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <SendMessageConfirmDialog
              title={formValues.title ?? ""}
              description={formValues.description ?? ""}
              priority={formValues.priority}
              audience={audienceTab}
              images={normalizePostImages(
                formValues.image,
                formValues.images as string[] | undefined
              )}
              scheduleEnabled={scheduleEnabled}
              scheduledAt={scheduledAt}
              selectedGroups={selectedGroups}
              selectedStudents={selectedStudents}
              hasRecipients={hasRecipients}
              isFormValid={isFormValid}
              isSubmitting={isSubmitting}
              formatStudentName={(student) =>
                tName("name", { ...student, parents: "" })
              }
              onConfirm={() => {
                if (formRef.current) {
                  formRef.current.dispatchEvent(
                    new Event("submit", { bubbles: true })
                  );
                }
              }}
              trigger={
                <Button
                  type="button"
                  isLoading={isSubmitting}
                  disabled={!isFormValid || !hasRecipients || isSubmitting}
                  icon={<Send className="h-4 w-4" />}
                >
                  {t("sendMessage")}
                </Button>
              }
            />
            <Button
              variant={"secondary"}
              type="button"
              disabled={isSubmitting || !isFormValid || !hasRecipients}
              onClick={(e) => handleSaveDraft(e)}
            >
              {t("saveToDraft")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
