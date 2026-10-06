"use client";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import useFormMutation from "@/lib/useFormMutation";
import useFileMutation from "@/lib/useFileMutation";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { File as FileIcon, Info, UploadIcon, Download } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Upload from "@/types/csvfile";
import { zodResolver } from "@hookform/resolvers/zod";
import Post from "@/types/post";
import { convertToUtf8IfNeeded, download } from "@/lib/utils";
import { BackButton } from "@/components/ui/BackButton";
import PageHeader from "@/components/PageHeader";
import { getCsvUploadSchema } from "@/lib/validationSchemas";

export default function MessageFromCSV() {
  const t = useTranslations("fromcsv");
  const tErrors = useTranslations("errors");

  const translateKey = (key?: string) => {
    const k = (key ?? "").split(".").pop() || "";
    if (!k) return tErrors("unexpected_error");
    try {
      return t(k);
    } catch {
      try {
        return tErrors(k);
      } catch {
        return tErrors("unexpected_error");
      }
    }
  };

  const formSchema = getCsvUploadSchema();

  const queryClient = useQueryClient();
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });
  const { mutate, data, error, isPending } = useFormMutation<Upload<Post>>(
    `post/upload`,
    "POST",
    ["uploadPosts"],
    {
      onSuccess(data) {
        queryClient.invalidateQueries({
          queryKey: ["posts"],
        });
        form.reset();

        // Show success/warning toast based on results (localized)
        if (data?.success && data?.summary) {
          const { errors: errorCount } = data.summary;
          if (errorCount > 0) {
            toast({
              title: t("postsUploadedWithWarnings"),
              description: t("csv_processed_with_errors"),
              variant: "destructive",
            });
          } else {
            toast({
              title: t("postsUploaded"),
              description: t("csv_processed_successfully"),
            });
            router.push("/messages");
          }
        } else {
          toast({
            title: t("postsUploaded"),
            description: translateKey(
              (data as { message?: string } | undefined)?.message ??
                "csv_processed_successfully"
            ),
          });
          if (!data?.summary?.errors || data.summary.errors === 0) {
            router.push("/messages");
          }
        }
      },
      onError(error) {
        const e = error as
          | { body?: { error?: string }; message?: string }
          | undefined;
        const errKey = e?.body?.error ?? e?.message ?? "unexpected_error";
        toast({
          title: t("uploadError"),
          description: translateKey(errKey),
          variant: "destructive",
        });
      },
    }
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const file = values.csvFile;
    const formData = new FormData();

    const converted = await convertToUtf8IfNeeded(file);
    const convertedFile = new File([converted], file.name, {
      type: converted.type || "text/csv",
      lastModified: Date.now(),
    });

    formData.append("file", convertedFile);
    formData.append("throwInError", "false");
    formData.append("withCSV", "true");

    mutate(formData);
  };

  const { mutate: downloadTemplate, isPending: isDownloading } =
    useFileMutation<Blob>("post/template", ["downloadTemplate"]);

  // Safely derive structured CSV upload result from possible error body shape or response
  const responseData =
    (error?.body as Record<string, unknown> | undefined) ??
    (data as Record<string, unknown> | undefined);

  let errors: Upload<Post> | null = null;
  if (responseData && typeof responseData === "object") {
    if (
      Array.isArray(responseData?.errors) &&
      Array.isArray(responseData?.inserted) &&
      Array.isArray(responseData?.updated) &&
      Array.isArray(responseData?.deleted)
    ) {
      errors = responseData as unknown as Upload<Post>;
    }
  }

  return (
    <main className="space-y-4">
      <PageHeader title={t("createPostsFromCsv")}>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => downloadTemplate()}
            isLoading={isDownloading}
            icon={<Download className="h-4 w-4" />}
            className="w-full sm:w-auto"
          >
            {t("downloadTemplate")}
          </Button>
          <BackButton href={`/messages/create`} />
        </div>
      </PageHeader>
      <Card className="p-5 space-y-2">
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="csvFile"
              render={({ field: { onChange, value: _value, ...rest } }) => (
                <FormItem>
                  <FormLabel>{t("createPosts")}</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target?.files?.[0];
                        if (file) {
                          onChange(file);
                        }
                      }}
                      {...rest}
                    />
                  </FormControl>
                  <FormDescription>{t("Upload csv file")}</FormDescription>
                  {form.formState.errors.csvFile && (
                    <p className="text-[0.8rem] font-medium text-destructive mt-2">
                      {t("inputNotInstanceOfFile")}
                    </p>
                  )}
                </FormItem>
              )}
            />

            <Button
              type="submit"
              isLoading={isPending}
              icon={<UploadIcon size={16} />}
            >
              {isPending ? t("processing") : t("Upload csv file")}
            </Button>
          </form>
        </Form>
        <div>{t("newHere?")}</div>
        <Link href="/instruction" className="text-blue-600">
          {t("howToCreateFromCSV")}
        </Link>
      </Card>

      <Card x-chunk="dashboard-05-chunk-3">
        <CardHeader className="flex flex-row justify-between items-center ">
          <div>
            <CardTitle>{t("postsschema")}</CardTitle>
            <CardDescription>
              {errors?.summary && (
                <div className="mt-2 space-y-1">
                  <div>Total records: {errors.summary.total}</div>
                  <div>Processed: {errors.summary.processed}</div>
                  <div>Inserted: {errors.summary.inserted}</div>
                  <div>Updated: {errors.summary.updated}</div>
                  <div>Deleted: {errors.summary.deleted}</div>
                  <div className="text-red-500">
                    Errors: {errors.summary.errors}
                  </div>
                </div>
              )}
              {errors && errors?.errors?.length > 0 && (
                <div className="text-red-500 mt-2">{t("errorsInPosts")}</div>
              )}
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              errors?.csvFile && download(errors?.csvFile, "errors.csv")
            }
            className="h-7 gap-1 text-sm"
            disabled={!errors?.csvFile}
          >
            <FileIcon className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only">{t("export")}</span>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>title</TableHead>
                <TableHead>description</TableHead>
                <TableHead>priority</TableHead>
                <TableHead>group_names</TableHead>
                <TableHead>student_numbers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors?.errors &&
                errors.errors.length > 0 &&
                errors.errors.map((error, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <ErrorCell name="title" error={error} />
                    </TableCell>
                    <TableCell>
                      <ErrorCell name="description" error={error} />
                    </TableCell>
                    <TableCell>
                      <ErrorCell name="priority" error={error} />
                    </TableCell>
                    <TableCell>
                      <ErrorCell name="group_names" error={error} />
                    </TableCell>
                    <TableCell>
                      <ErrorCell name="student_numbers" error={error} />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {errors && (
        <div>
          {errors.inserted?.length > 0 && (
            <ErrorTable
              title={t("postsCreated")}
              description={t("postsCreatedDescription")}
              errors={errors}
              name="inserted"
            />
          )}
          {errors.updated?.length > 0 && (
            <ErrorTable
              title={t("postsUpdated")}
              description={t("postsUpdatedDescription")}
              errors={errors}
              name="updated"
            />
          )}
          {errors.deleted?.length > 0 && (
            <ErrorTable
              title={t("postsDeleted")}
              description={t("postsDeletedDescription")}
              errors={errors}
              name="deleted"
            />
          )}
        </div>
      )}
    </main>
  );
}

const ErrorCell = ({
  name,
  error,
}: {
  name: keyof Upload<Post>["errors"][0]["row"];
  error: Upload<Post>["errors"][0];
}) => {
  const t = useTranslations("fromcsv");
  const tErrors = useTranslations("errors");

  const translateKey = (key?: string) => {
    const k = (key ?? "").split(".").pop() || "";
    if (!k) return tErrors("unexpected_error");
    try {
      return t(k);
    } catch {
      try {
        return tErrors(k);
      } catch {
        return tErrors("unexpected_error");
      }
    }
  };

  return (
    <div className="w-full flex justify-between">
      {error?.row[name] !== undefined && (
        <span>
          {(() => {
            const value = error?.row[name];
            if (Array.isArray(value)) {
              return value.map((v) => String(v)).join(", ");
            }
            return value !== undefined ? String(value) : "";
          })()}
        </span>
      )}
      {error?.errors[name] && (
        <HoverCard>
          <HoverCardTrigger className="flex justify-end flex-grow">
            <Info className="text-red-500" />
          </HoverCardTrigger>
          <HoverCardContent className="text-red-500">
            {translateKey(error.errors[name])}
          </HoverCardContent>
        </HoverCard>
      )}
    </div>
  );
};

const ErrorTable = ({
  title,
  description,
  errors,
  name,
}: {
  title: string;
  description: string;
  errors: Upload<Post>;
  name: "inserted" | "updated" | "deleted";
}) => {
  return (
    <Card x-chunk="dashboard-05-chunk-4">
      <CardHeader className="flex flex-row justify-between items-center ">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>title</TableHead>
              <TableHead>description</TableHead>
              <TableHead>priority</TableHead>
              <TableHead>group_names</TableHead>
              <TableHead>student_numbers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {errors[name]?.map((post, index) => (
              <TableRow key={index}>
                <TableCell>
                  <span>{post?.title}</span>
                </TableCell>
                <TableCell>
                  <span>{post?.description}</span>
                </TableCell>
                <TableCell>
                  <span>{post?.priority}</span>
                </TableCell>
                <TableCell>
                  <span>
                    {Array.isArray(post?.group_names)
                      ? post?.group_names.join(", ")
                      : post?.group_names}
                  </span>
                </TableCell>
                <TableCell>
                  <span>
                    {Array.isArray(post?.student_numbers)
                      ? post?.student_numbers.join(", ")
                      : post?.student_numbers}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
