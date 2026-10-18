"use client";

import { useEffect, useState } from "react";
import { CircleHelp, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  FaqAudience,
  FaqItem,
  readStoredFaqs,
  writeStoredFaqs,
} from "@/lib/faq";

const emptyDraft = { question: "", answer: "" };

export default function FaqPage() {
  const t = useTranslations("faq");
  const [faqs, setFaqs] = useState<Record<FaqAudience, FaqItem[]> | null>(
    null
  );
  const [audience, setAudience] = useState<FaqAudience>("parent");
  const [dialogAudience, setDialogAudience] = useState<FaqAudience>("parent");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    setFaqs(readStoredFaqs());
  }, []);

  const persist = (next: Record<FaqAudience, FaqItem[]>) => {
    setFaqs(next);
    writeStoredFaqs(next);
  };

  const openCreate = () => {
    setDialogAudience(audience);
    setEditingId(null);
    setDraft(emptyDraft);
    setIsDialogOpen(true);
  };

  const openEdit = (item: FaqItem) => {
    setDialogAudience(audience);
    setEditingId(item.id);
    setDraft({ question: item.question, answer: item.answer });
    setIsDialogOpen(true);
  };

  const saveDraft = () => {
    if (!faqs) return;
    const question = draft.question.trim();
    const answer = draft.answer.trim();
    if (!question || !answer) return;

    const current = faqs[dialogAudience];
    const nextItems = editingId
      ? current.map((item) =>
          item.id === editingId ? { ...item, question, answer } : item
        )
      : [
          ...current,
          {
            id: `${dialogAudience}-${Date.now()}`,
            question,
            answer,
          },
        ];

    persist({ ...faqs, [dialogAudience]: nextItems });
    setIsDialogOpen(false);
  };

  const removeItem = (id: string) => {
    if (!faqs) return;
    persist({
      ...faqs,
      [audience]: faqs[audience].filter((item) => item.id !== id),
    });
  };

  const renderList = (key: FaqAudience) => {
    const items = faqs?.[key] ?? [];
    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
    }

    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{item.question}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {item.answer}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(item)}
                  aria-label={t("edit")}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                  aria-label={t("delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")}>
        <Button type="button" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("add")}
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CircleHelp className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={audience}
            onValueChange={(value) => setAudience(value as FaqAudience)}
          >
            <TabsList>
              <TabsTrigger value="parent">{t("parentApp")}</TabsTrigger>
              <TabsTrigger value="student">{t("studentApp")}</TabsTrigger>
            </TabsList>
            <TabsContent value="parent" className="mt-4">
              {renderList("parent")}
            </TabsContent>
            <TabsContent value="student" className="mt-4">
              {renderList("student")}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t("edit") : t("add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="faq-question">{t("question")}</Label>
              <Input
                id="faq-question"
                value={draft.question}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    question: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-answer">{t("answer")}</Label>
              <Textarea
                id="faq-answer"
                value={draft.answer}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    answer: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              onClick={saveDraft}
              disabled={!draft.question.trim() || !draft.answer.trim()}
            >
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
