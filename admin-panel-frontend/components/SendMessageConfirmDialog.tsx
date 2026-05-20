"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Users, UserRound } from "lucide-react";
import ReactLinkify from "react-linkify";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Group from "@/types/group";
import Student from "@/types/student";
import { cn } from "@/lib/utils";

type PreviewAudienceTab = "student" | "parent";

function getInitials(givenName?: string, familyName?: string) {
  const initials = `${givenName?.charAt(0) ?? ""}${familyName?.charAt(0) ?? ""}`;
  return initials.toUpperCase() || "?";
}

interface SendMessageConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  priority: string | undefined;
  audienceLabel: string;
  audience: "parents" | "students";
  imagePreview?: string;
  imagePath?: string;
  scheduleEnabled?: boolean;
  scheduledAt?: Date | null;
  selectedGroups: Group[];
  selectedStudents: Student[];
  hasRecipients: boolean;
  isFormValid: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
  formatStudentName: (student: Student) => string;
}

export default function SendMessageConfirmDialog({
  trigger,
  title,
  description,
  priority,
  audienceLabel,
  audience,
  imagePreview,
  imagePath,
  scheduleEnabled,
  scheduledAt,
  selectedGroups,
  selectedStudents,
  hasRecipients,
  isFormValid,
  isSubmitting,
  onConfirm,
  formatStudentName,
}: SendMessageConfirmDialogProps) {
  const t = useTranslations("sendmessage");
  const locale = useLocale();
  const [previewTab, setPreviewTab] = useState<PreviewAudienceTab>("student");

  const priorityLabel = priority ? t(priority as "high" | "medium" | "low") : "";
  const messagePrefix =
    audience === "students"
      ? t("confirmMessageForStudents")
      : t("confirmMessageForParents");

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <div className="flex flex-col sm:flex-row">
          {/* Left: post summary */}
          <div className="flex flex-1 flex-col items-center border-b border-border px-8 py-10 sm:border-b-0 sm:border-r">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-foreground/80">
              <Users className="h-8 w-8 stroke-[1.5]" />
            </div>
            <h2 className="text-center text-2xl font-bold tracking-tight">
              {t("confirmPostTitle")}
            </h2>
            {title ? (
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {title}
              </p>
            ) : null}
            {priorityLabel ? (
              <span className="mt-4 inline-flex rounded-md bg-[#3d3d3d] px-4 py-1.5 text-sm font-medium text-white">
                {t("priority")}: {priorityLabel}
              </span>
            ) : null}
            <div className="mt-6 w-full max-w-sm rounded-lg border border-border bg-muted/50 px-5 py-4 text-left text-sm leading-relaxed text-foreground">
              <p className="whitespace-pre-wrap break-words">
                <span className="font-medium">{messagePrefix}</span>{" "}
                <ReactLinkify>{description}</ReactLinkify>
              </p>
            </div>
            {(imagePreview || imagePath) && (
              <div className="mt-4 w-full max-w-sm">
                <Image
                  src={imagePreview || (imagePath ? `/${imagePath}` : "")}
                  alt=""
                  width={300}
                  height={200}
                  className="w-full rounded-lg object-cover"
                />
              </div>
            )}
            {scheduleEnabled && scheduledAt && (
              <p className="mt-3 w-full max-w-sm text-left text-sm text-muted-foreground">
                {t("scheduledAt")}:{" "}
                {scheduledAt
                  .toLocaleString(locale, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })
                  .replace(",", "")}
              </p>
            )}
          </div>

          {/* Right: recipients */}
          <div className="flex flex-1 flex-col px-8 py-10">
            <div className="flex gap-0 overflow-hidden rounded-xl border border-border">
              <button
                type="button"
                aria-pressed={previewTab === "student"}
                onClick={() => setPreviewTab("student")}
                className={cn(
                  "flex flex-1 flex-col items-center gap-2 px-4 py-5 text-xs font-semibold uppercase tracking-wide transition-colors",
                  previewTab === "student"
                    ? "bg-[#3d3d3d] text-white"
                    : "bg-muted/40 text-foreground hover:bg-muted/60"
                )}
              >
                <Users className="h-7 w-7 stroke-[1.5]" />
                {t("students")}
              </button>
              <button
                type="button"
                aria-pressed={previewTab === "parent"}
                onClick={() => setPreviewTab("parent")}
                className={cn(
                  "flex flex-1 flex-col items-center gap-2 border-l border-border px-4 py-5 text-xs font-semibold uppercase tracking-wide transition-colors",
                  previewTab === "parent"
                    ? "bg-[#3d3d3d] text-white"
                    : "bg-muted/40 text-foreground hover:bg-muted/60"
                )}
              >
                <UserRound className="h-7 w-7 stroke-[1.5]" />
                {t("confirmParentsTab")}
              </button>
            </div>

            <p className="mt-8 text-sm">
              <span className="font-semibold">{t("confirmRecipientGroup")}</span>
              <br />
              <span className="font-bold">{audienceLabel}</span>
            </p>

            <p className="mt-6 text-sm font-semibold">
              {selectedGroups.length > 0 && selectedStudents.length > 0
                ? t("confirmSelectedRecipients")
                : selectedGroups.length > 0
                  ? t("confirmSelectedGroups")
                  : t("confirmSelectedStudents")}
            </p>

            <div className="mt-3 max-h-56 flex-1 overflow-y-auto rounded-lg bg-muted/40 p-3">
              <ul className="flex flex-col gap-2">
                {selectedGroups.map((group) => (
                  <li key={`group-${group.id}`}>
                    <RecipientPill
                      label={group.name}
                      initials={group.name?.charAt(0)?.toUpperCase() ?? "G"}
                    />
                  </li>
                ))}
                {selectedStudents.map((student) => (
                  <li key={`student-${student.id}`}>
                    <RecipientPill
                      label={formatStudentName(student)}
                      initials={getInitials(
                        student.given_name,
                        student.family_name
                      )}
                    />
                  </li>
                ))}
              </ul>
              {!hasRecipients && (
                <p className="py-4 text-center text-sm font-semibold text-destructive">
                  {t("selectatleastone")}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3 border-t border-border bg-background px-8 py-5 sm:justify-end">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="min-w-[100px] rounded-lg border-foreground/30"
            >
              {t("close")}
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              type="submit"
              disabled={!isFormValid || !hasRecipients || isSubmitting}
              isLoading={isSubmitting}
              onClick={onConfirm}
              className="min-w-[140px] rounded-lg bg-[#3d3d3d] text-white hover:bg-[#2d2d2d]"
            >
              {t("confirmAndSend")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecipientPill({
  label,
  initials,
}: {
  label: string;
  initials: string;
}) {
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#4a4a4a] py-1.5 pl-1.5 pr-4 text-sm font-medium text-white">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-foreground"
        aria-hidden
      >
        {initials}
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}
