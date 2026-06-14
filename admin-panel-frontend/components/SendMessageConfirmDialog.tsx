"use client";

import React from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Group from "@/types/group";
import Student from "@/types/student";
import { cn } from "@/lib/utils";
import localImageLoader from "@/lib/localImageLoader";

type PreviewAudienceTab = "student" | "parent";

const GROUP_RECIPIENTS_ICON = "/assets/group-recipients-icon.png";
const PARENTS_ICON = "/assets/parents-icon.png";

function LocalAssetIcon({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  return (
    <Image
      loader={localImageLoader}
      src={src}
      alt=""
      width={56}
      height={56}
      className={cn("object-contain", className)}
      aria-hidden
    />
  );
}

function GroupRecipientsIcon({ className }: { className?: string }) {
  return <LocalAssetIcon src={GROUP_RECIPIENTS_ICON} className={className} />;
}

function ParentsIcon({ className }: { className?: string }) {
  return <LocalAssetIcon src={PARENTS_ICON} className={className} />;
}

function getPriorityBadgeClassName(priority?: string) {
  switch (priority) {
    case "high":
      return "bg-red-500 text-white dark:bg-red-600 dark:text-white";
    case "medium":
      return "bg-yellow-500 text-white dark:bg-amber-500 dark:text-white";
    case "low":
      return "bg-green-500 text-white dark:bg-green-600 dark:text-white";
    default:
      return "bg-muted text-foreground";
  }
}

function getConfirmImageSrc(imagePreview?: string, imagePath?: string): string {
  if (imagePreview) return imagePreview;
  if (!imagePath) return "";
  if (imagePath.startsWith("data:") || imagePath.startsWith("http")) {
    return imagePath;
  }
  const base = process.env.NEXT_PUBLIC_IMAGES_URL ?? "";
  const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${base}${path}`;
}

function AudienceToggle({
  activeTab,
  className,
}: {
  activeTab: PreviewAudienceTab;
  className?: string;
}) {
  const t = useTranslations("sendmessage");

  const tabs: {
    id: PreviewAudienceTab;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "student",
      label: t("students"),
      icon: (
        <GroupRecipientsIcon className="h-8 w-8 sm:h-10 sm:w-10 md:h-11 md:w-11" />
      ),
    },
    {
      id: "parent",
      label: t("confirmParentsTab"),
      icon: <ParentsIcon className="h-8 w-8 sm:h-10 sm:w-10 md:h-11 md:w-11" />,
    },
  ];

  return (
    <div
      className={cn(
        "flex w-full gap-0 overflow-hidden rounded-lg border border-border sm:rounded-xl",
        className
      )}
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        return (
          <div
            key={tab.id}
            aria-hidden
            className={cn(
              "pointer-events-none flex min-h-[88px] flex-1 select-none flex-col items-center justify-center gap-1.5 px-2 py-4 text-[11px] font-semibold uppercase tracking-wide sm:min-h-[104px] sm:gap-2 sm:px-4 sm:py-6 sm:text-xs md:gap-3 md:py-8 md:text-sm",
              index > 0 && "border-l border-border",
              isActive
                ? "bg-slate-600 text-white dark:bg-slate-500"
                : "bg-muted/50 text-foreground dark:bg-muted/30 dark:text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "dark:[&_img]:brightness-0 dark:[&_img]:invert",
                isActive && "[&_img]:brightness-0 [&_img]:invert"
              )}
            >
              {tab.icon}
            </span>
            {tab.label}
          </div>
        );
      })}
    </div>
  );
}

interface SendMessageConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  priority: string | undefined;
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

  const priorityLabel = priority ? t(priority as "high" | "medium" | "low") : "";
  const audienceTab: PreviewAudienceTab =
    audience === "students" ? "student" : "parent";
  const recipientCount =
    selectedGroups.reduce(
      (total, group) => total + (group.member_count ?? 0),
      0
    ) + selectedStudents.length;

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        hideCloseButton
        className="flex max-h-[min(92dvh,920px)] w-[calc(100%-1rem)] max-w-4xl flex-col gap-0 overflow-hidden border border-border bg-card p-0 text-card-foreground sm:w-[calc(100%-2rem)] sm:rounded-2xl"
      >
        <DialogTitle className="sr-only">{t("confirmPostTitle")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("confirmAndSend")}
        </DialogDescription>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain md:flex-row md:overflow-hidden">
          {/* Left: post summary */}
          <div className="flex w-full min-w-0 flex-col border-b border-border px-4 py-5 sm:px-6 sm:py-7 md:w-1/2 md:border-b-0 md:border-r md:py-8 lg:px-8">
            <AudienceToggle
              activeTab={audienceTab}
              className="mb-4 sm:mb-5"
            />
            <h2 className="text-center text-lg font-semibold tracking-tight text-muted-foreground sm:text-xl">
              {t("confirmPostTitle")}
            </h2>
            {title ? (
              <h3 className="mt-3 break-words px-2 text-center text-2xl font-bold leading-tight tracking-tight text-foreground sm:mt-4 sm:text-3xl md:text-[2rem]">
                {title}
              </h3>
            ) : null}
            <div className={cn("w-full space-y-3", title ? "mt-5 sm:mt-6" : "mt-4")}>
              <textarea
                readOnly
                rows={4}
                value={description}
                className="min-h-[112px] w-full resize-none rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm leading-relaxed text-foreground outline-none dark:bg-muted/20 sm:min-h-[128px] sm:px-4 sm:py-3.5 sm:text-base"
              />
            </div>
            {(imagePreview || imagePath) && (
              <div className="mt-4 flex justify-start">
                {/* Native img for reliable data-URL and uploaded image preview */}
                <img
                  src={getConfirmImageSrc(imagePreview, imagePath)}
                  alt=""
                  className="h-[112px] w-[112px] rounded-md border border-border bg-muted/40 object-contain dark:bg-muted/20 sm:h-[120px] sm:w-[120px]"
                />
              </div>
            )}
            {scheduleEnabled && scheduledAt && (
              <p className="mt-3 w-full text-left text-xs text-muted-foreground sm:text-sm">
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
          <div className="flex w-full min-w-0 flex-col px-4 py-5 sm:px-6 sm:py-7 md:flex md:w-1/2 md:flex-col md:overflow-hidden md:py-8 lg:px-8">
            {priorityLabel ? (
              <span
                className={cn(
                  "inline-flex w-fit max-w-full items-center justify-center rounded-lg px-3 py-2.5 text-sm font-semibold sm:px-4 sm:py-3.5 sm:text-base",
                  getPriorityBadgeClassName(priority)
                )}
              >
                {t("priority")}: {priorityLabel}
              </span>
            ) : null}

            <p className="mt-4 text-sm font-semibold text-foreground sm:mt-5">
              {t("confirmSelectedCount", { count: recipientCount })}
            </p>

            <div className="mt-3 min-h-[120px] max-h-52 flex-1 overflow-y-auto rounded-lg bg-muted/60 p-2.5 dark:bg-muted/30 sm:max-h-64 sm:p-3 md:min-h-0 md:max-h-none md:flex-1">
              <ul className="flex flex-col gap-2">
                {selectedGroups.map((group) => (
                  <li key={`group-${group.id}`}>
                    <RecipientPill label={group.name} />
                  </li>
                ))}
                {selectedStudents.map((student) => (
                  <li key={`student-${student.id}`}>
                    <RecipientPill label={formatStudentName(student)} />
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

        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-card px-4 py-4 sm:gap-3 sm:px-6 sm:py-5 md:justify-end lg:px-8">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-lg sm:min-w-[100px] sm:w-auto"
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
              className="w-full rounded-lg sm:min-w-[140px] sm:w-auto"
            >
              {t("confirmAndSend")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecipientPill({ label }: { label: string }) {
  return (
    <div className="flex h-7 w-[152px] shrink-0 items-center justify-center rounded-full bg-zinc-900 px-2 text-[11px] font-medium text-white dark:bg-zinc-800 dark:ring-1 dark:ring-zinc-700 sm:h-8 sm:w-[168px] sm:text-xs">
      <span className="w-full truncate text-center">{label}</span>
    </div>
  );
}
