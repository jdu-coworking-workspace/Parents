"use client";

import { useTranslations } from "next-intl";
import type { PollResult } from "@/types/poll";
import { cn } from "@/lib/utils";

function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export default function PollResults({
  poll,
  lockedHint,
}: {
  poll: PollResult;
  lockedHint?: string;
}) {
  const t = useTranslations("sendmessage");
  const total = poll.total_votes ?? 0;
  const maxPercent = poll.options.reduce(
    (max, option) => Math.max(max, option.percent ?? 0),
    0
  );

  return (
    <div className="rounded-2xl bg-[#f3f4f6] p-4 dark:bg-zinc-800/80">
      <h3 className="break-words text-[15px] font-medium leading-snug text-foreground">
        {poll.question}
      </h3>
      <ul className="mt-3 space-y-1.5">
        {poll.options.map((option) => {
          const votes = option.votes ?? 0;
          const percent = option.percent ?? 0;
          const isLeader = votes > 0 && percent === maxPercent;
          const hasVotes = votes > 0;

          return (
            <li key={option.id} className="flex min-h-9 items-center">
              <div
                className={cn(
                  "flex h-9 max-w-full items-center gap-3 rounded-full px-3 text-sm",
                  isLeader && "bg-[#3b82f6] text-white",
                  hasVotes &&
                    !isLeader &&
                    "bg-[#e7f0ff] text-foreground dark:bg-blue-500/20",
                  !hasVotes && "text-[#9aa1ab]"
                )}
                style={
                  hasVotes
                    ? {
                        width: `${Math.min(100, Math.max(percent, 0))}%`,
                        minWidth: "fit-content",
                      }
                    : undefined
                }
              >
                <span className="w-11 shrink-0 tabular-nums">
                  {formatPercent(percent)}%
                </span>
                <span className="truncate">{option.text}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-start justify-between gap-4 text-xs text-[#9aa1ab]">
        <span>{t("pollTotalVotes", { count: total })}</span>
        {lockedHint ? (
          <span className="max-w-[60%] text-right">{lockedHint}</span>
        ) : null}
      </div>
    </div>
  );
}
