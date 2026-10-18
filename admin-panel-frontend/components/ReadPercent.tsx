"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useTranslations } from "next-intl";

export default function ReadPercent({
  percent,
  readCount,
  totalCount,
}: {
  percent: string | number;
  readCount?: number | string | null;
  totalCount?: number | string | null;
}) {
  const t = useTranslations("posts");
  const label =
    percent === null || percent === undefined || percent === ""
      ? "0"
      : String(percent);
  const hasCounts =
    readCount !== undefined &&
    readCount !== null &&
    totalCount !== undefined &&
    totalCount !== null;

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <span className="cursor-help underline decoration-dotted underline-offset-4">
          {label}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto px-3 py-2 text-sm">
        {hasCounts
          ? t("read_ratio", {
              read: Number(readCount) || 0,
              total: Number(totalCount) || 0,
            })
          : label}
      </HoverCardContent>
    </HoverCard>
  );
}
