"use client";

import { ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import useApiMutation from "@/lib/useApiMutation";
import { faqSchema } from "@/lib/validationSchemas";
import Faq, { FaqAudience } from "@/types/faq";

type FaqFormValues = z.infer<typeof faqSchema>;

export default function FaqFormDialog({
  audience,
  faq,
  trigger,
}: {
  audience: FaqAudience;
  faq?: Faq;
  trigger: ReactNode;
}) {
  const t = useTranslations("faq");
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const form = useForm<FaqFormValues>({
    resolver: zodResolver(faqSchema),
    defaultValues: { question: "", answer: "" },
  });

  const { mutate, isPending } = useApiMutation<
    { faq: Faq },
    FaqFormValues & { audience: FaqAudience }
  >(
    faq ? `faq/${faq.id}` : "faq/create",
    faq ? "PUT" : "POST",
    ["faq", faq?.id ?? "create"],
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["faqs", audience] });
        toast({ title: t(faq ? "updated" : "created") });
        setOpen(false);
      },
    }
  );

  const handleOpenChange = (next: boolean) => {
    if (next) {
      form.reset({ question: faq?.question ?? "", answer: faq?.answer ?? "" });
    }
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t(faq ? "edit" : "add")}</DialogTitle>
          <DialogDescription>{t(audience)}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              mutate({ ...values, audience })
            )}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("question")}</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={500} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="answer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("answer")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={6} maxLength={10000} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" isLoading={isPending}>
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
