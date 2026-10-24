"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import PageHeader from "@/components/PageHeader";
import FaqDeleteDialog from "@/components/faq/FaqDeleteDialog";
import FaqFormDialog from "@/components/faq/FaqFormDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useListQuery } from "@/lib/useListQuery";
import { FAQ_AUDIENCES, FaqAudience, FaqListResponse } from "@/types/faq";

function FaqList({ audience }: { audience: FaqAudience }) {
  const t = useTranslations("faq");
  const { data, isError } = useListQuery<FaqListResponse>(
    "faq/list",
    ["faqs", audience],
    { audience }
  );

  if (isError) {
    return <p className="text-sm text-destructive">{t("loadError")}</p>;
  }

  if (!data) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (data.faqs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {data.faqs.map((faq) => (
        <div
          key={faq.id}
          className="flex items-start justify-between gap-4 rounded-lg border p-4"
        >
          <div className="min-w-0 space-y-2">
            <p className="break-words font-medium">{faq.question}</p>
            <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
              {faq.answer}
            </p>
          </div>
          <div className="flex shrink-0">
            <FaqFormDialog
              audience={audience}
              faq={faq}
              trigger={
                <Button variant="ghost" size="icon" aria-label={t("edit")}>
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <FaqDeleteDialog faq={faq} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FaqPage() {
  const t = useTranslations("faq");
  const [audience, setAudience] = useState<FaqAudience>("parents");

  return (
    <div className="w-full space-y-4">
      <PageHeader title={t("title")} variant="list">
        <FaqFormDialog
          audience={audience}
          trigger={
            <Button icon={<Plus className="h-5 w-5" />}>{t("add")}</Button>
          }
        />
      </PageHeader>

      <Tabs
        value={audience}
        onValueChange={(value) => setAudience(value as FaqAudience)}
      >
        <TabsList>
          {FAQ_AUDIENCES.map((key) => (
            <TabsTrigger key={key} value={key}>
              {t(key)}
            </TabsTrigger>
          ))}
        </TabsList>
        {FAQ_AUDIENCES.map((key) => (
          <TabsContent key={key} value={key} className="mt-4">
            <FaqList audience={key} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
