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
      className={cn("block flex-none object-contain", className)}
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

const MIN_VISIBLE_RECIPIENT_ROWS = 4;
const MAX_VISIBLE_RECIPIENT_ROWS = 9;
const RECIPIENT_ROW_HEIGHT_PX = 38;

function getRecipientListHeights(itemCount: number): {
  minHeight: number;
  maxHeight: number;
} {
  const minHeight = MIN_VISIBLE_RECIPIENT_ROWS * RECIPIENT_ROW_HEIGHT_PX;
  const visibleRows = Math.max(
    MIN_VISIBLE_RECIPIENT_ROWS,
    Math.min(itemCount, MAX_VISIBLE_RECIPIENT_ROWS)
  );
  return { minHeight, maxHeight: visibleRows * RECIPIENT_ROW_HEIGHT_PX };
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
      id: "parent",
      label: t("confirmParentsTab"),
      icon: <ParentsIcon className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9" />,
    },
    {
      id: "student",
      label: t("students"),
      icon: (
        <GroupRecipientsIcon className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9" />
      ),
    },
  ];

  return (
    <div
      className={cn(
        "flex h-[5rem] min-h-[5rem] w-full flex-none gap-0 overflow-hidden rounded-lg border border-border sm:h-[5.75rem] sm:min-h-[5.75rem] sm:rounded-xl md:h-[6.25rem] md:min-h-[6.25rem]",
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
              "pointer-events-none flex h-full min-h-0 flex-1 shrink-0 select-none flex-col items-center justify-center gap-1 px-2 py-2 text-[10px] font-semibold uppercase leading-none tracking-wide sm:gap-1.5 sm:px-3 sm:py-2.5 sm:text-xs md:py-3 md:text-sm",
              index > 0 && "border-l border-border",
              isActive
                ? "bg-green-500 text-white dark:bg-green-600 dark:text-white"
                : "bg-muted/50 text-foreground dark:bg-muted/30 dark:text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "flex flex-none items-center justify-center dark:[&_img]:brightness-0 dark:[&_img]:invert",
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
  const selectedGroupCount = selectedGroups.length;
  const selectedStudentCount = selectedStudents.length;
  const groupListHeights = getRecipientListHeights(selectedGroupCount);
  const studentListHeights = getRecipientListHeights(selectedStudentCount);

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        hideCloseButton
        className="flex h-auto max-h-[min(92dvh,860px)] min-h-[min(60dvh,520px)] w-[calc(100%-1rem)] max-w-4xl flex-col gap-0 overflow-hidden border border-border bg-card p-0 text-card-foreground sm:w-[calc(100%-2rem)] sm:rounded-2xl"
      >
        <DialogTitle className="sr-only">{t("confirmPostTitle")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("confirmAndSend")}
        </DialogDescription>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain md:flex-row">
          {/* Left: post summary */}
          <div className="flex w-full min-w-0 shrink-0 flex-col border-b border-border px-4 py-5 sm:px-6 sm:py-7 md:min-h-0 md:w-1/2 md:overflow-y-auto md:border-b-0 md:border-r md:py-5 lg:px-6">
            <AudienceToggle
              activeTab={audienceTab}
              className="mb-2 sm:mb-3"
            />
            {title ? (
              <h3 className="mt-0 shrink-0 break-words px-2 text-center text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl md:text-[2rem]">
                {title}
              </h3>
            ) : null}
            <div className={cn("w-full space-y-3", title ? "mt-5 sm:mt-6" : "mt-4")}>
              <textarea
                readOnly
                rows={4}
                value={description}
                className="min-h-[120px] w-full resize-none rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none dark:border-zinc-700/70 dark:bg-zinc-800/50 sm:min-h-[140px] sm:px-4 sm:py-3.5 sm:text-base"
              />
            </div>
            {(imagePreview || imagePath) && (
              <div className="mt-4 flex justify-start">
                {/* Native img for reliable data-URL and uploaded image preview */}
                <img
                  src={getConfirmImageSrc(imagePreview, imagePath)}
                  alt=""
                  className="h-[116px] w-[116px] rounded-xl border border-border bg-muted/40 object-contain dark:border-zinc-700/70 dark:bg-muted/20 sm:h-[124px] sm:w-[124px]"
                />
              </div>
            )}
          </div>

          {/* Right: recipients */}
          <div className="flex w-full min-w-0 flex-col px-3 py-3 sm:px-4 sm:py-4 md:min-h-0 md:w-1/2 md:py-5">
            <div className="grid w-full shrink-0 grid-cols-[auto_1fr] items-start gap-3 sm:gap-4">
              {priorityLabel ? (
                <span
                  className={cn(
                    "inline-flex w-fit max-w-full items-center justify-center rounded-md px-2.5 py-1 text-xs font-semibold sm:px-3 sm:py-1.5 sm:text-sm",
                    getPriorityBadgeClassName(priority)
                  )}
                >
                  {t("priority")}: {priorityLabel}
                </span>
              ) : (
                <span />
              )}
              {scheduleEnabled && scheduledAt ? (
                <p className="max-w-full justify-self-center text-center text-[10px] leading-snug text-muted-foreground sm:text-xs">
                  <span className="font-medium text-foreground">{t("scheduledAt")}:</span>
                  <br />
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
              ) : null}
            </div>

            <div className="mt-3 flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-muted/50 dark:border-zinc-700/70 dark:bg-zinc-800/50">
              <div className="grid flex-1 grid-cols-1 divide-y divide-border dark:divide-zinc-700/70 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <div className="flex min-w-0 flex-col p-2 sm:p-2.5">
                  <p className="shrink-0 text-center text-xs font-semibold text-foreground sm:text-sm">
                    {t("groups")}
                  </p>
                  <p className="mt-0.5 shrink-0 text-center text-[10px] font-medium text-muted-foreground sm:text-xs">
                    {t("confirmSelectedCount", { count: selectedGroupCount })}
                  </p>
                  <ul
                    className="mt-3.5 flex flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain pr-0.5 sm:mt-4"
                    style={{
                      minHeight: `${groupListHeights.minHeight}px`,
                      maxHeight: `${groupListHeights.maxHeight}px`,
                    }}
                  >
                    {selectedGroups.map((group) => (
                      <li key={`group-${group.id}`}>
                        <RecipientPill label={group.name} />
                      </li>
                    ))}
                    {selectedGroups.length === 0 && (
                      <li className="py-2 text-center text-[10px] text-muted-foreground sm:text-xs">
                        {t("notSelected")}
                      </li>
                    )}
                  </ul>
                </div>

                <div className="flex min-w-0 flex-col p-2 sm:p-2.5">
                  <p className="shrink-0 text-center text-xs font-semibold text-foreground sm:text-sm">
                    {t("students")}
                  </p>
                  <p className="mt-0.5 shrink-0 text-center text-[10px] font-medium text-muted-foreground sm:text-xs">
                    {t("confirmSelectedCount", { count: selectedStudentCount })}
                  </p>
                  <ul
                    className="mt-3.5 flex flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain pr-0.5 sm:mt-4"
                    style={{
                      minHeight: `${studentListHeights.minHeight}px`,
                      maxHeight: `${studentListHeights.maxHeight}px`,
                    }}
                  >
                    {selectedStudents.map((student) => (
                      <li key={`student-${student.id}`}>
                        <RecipientPill label={formatStudentName(student)} />
                      </li>
                    ))}
                    {selectedStudents.length === 0 && (
                      <li className="py-2 text-center text-[10px] text-muted-foreground sm:text-xs">
                        {t("notSelected")}
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {!hasRecipients && (
                <p className="shrink-0 border-t border-border py-2 text-center text-xs font-semibold text-destructive sm:text-sm">
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
    <div className="flex h-8 w-full max-w-full shrink-0 items-center justify-center rounded-full bg-zinc-900 px-3 text-[11px] font-medium text-white dark:bg-zinc-700 sm:h-9 sm:text-xs">
      <span className="w-full truncate text-center">{label}</span>
    </div>
  );
}
