"use client";

import React, { useState } from "react";
import parse, {
  DOMNode,
  Element,
  HTMLReactParserOptions,
} from "html-react-parser";
import ReactLinkify from "react-linkify";
import { BarChart2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import ImageLightbox from "@/components/ImageLightbox";
import MessageImageGroupView, {
  ImageGroupLayout,
} from "@/components/MessageImageGroupView";
import { cn } from "@/lib/utils";
import { AdminPollResult, PollVoter } from "@/types/postView";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useDateFormatter from "@/lib/useDateFormatter";

type PostDescriptionContentProps = {
  description?: string | null;
  className?: string;
  variant?: "default" | "modal";
  polls?: AdminPollResult[];
};

function isElement(node: DOMNode): node is Element {
  return node instanceof Element;
}

function extractImageSources(element: Element): string[] {
  const sources: string[] = [];
  const walk = (n: any) => {
    if (isElement(n)) {
      if (n.name === "img" && n.attribs?.src) {
        sources.push(n.attribs.src);
      }
      if (n.children) {
        n.children.forEach(walk);
      }
    }
  };
  walk(element);
  return sources;
}

export default function PostDescriptionContent({
  description,
  className,
  variant = "default",
  polls,
}: PostDescriptionContentProps) {
  const t = useTranslations("sendmessage");
  const { formatDateTime } = useDateFormatter();
  const [activeVotersModal, setActiveVotersModal] = useState<{
    optionText: string;
    voters: PollVoter[];
  } | null>(null);

  if (!description) return null;

  const isModal = variant === "modal";
  let pollIndex = 0;

  const options: HTMLReactParserOptions = {
    replace: (node) => {
      if (!isElement(node)) return undefined;

      // Check for image group container
      if (
        node.attribs?.["data-image-layout"] ||
        node.attribs?.class?.includes("message-image-group")
      ) {
        const layout = (node.attribs?.["data-image-layout"] ||
          "sequential") as ImageGroupLayout;

        let images: string[] = [];
        if (node.attribs?.["data-images"]) {
          try {
            const raw = node.attribs["data-images"]
              .replace(/&quot;/g, '"')
              .replace(/&#34;/g, '"');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              images = parsed;
            }
          } catch {
            // fallback to extracting child img tags
          }
        }

        if (images.length === 0) {
          images = extractImageSources(node);
        }

        if (images.length > 0) {
          return (
            <MessageImageGroupView
              images={images}
              layout={layout}
              alt=""
              variant={variant}
            />
          );
        }
      }

      // Check for poll container
      if (
        node.attribs?.["data-poll"] === "true" ||
        node.attribs?.class?.includes("message-poll")
      ) {
        const currentPollIndex = pollIndex++;
        const question = node.attribs?.["data-poll-question"] || "";
        let parsedOptions: string[] = [];
        if (node.attribs?.["data-poll-options"]) {
          try {
            const raw = node.attribs["data-poll-options"]
              .replace(/&quot;/g, '"')
              .replace(/&#34;/g, '"');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) parsedOptions = parsed;
          } catch {}
        }

        const matchedPoll =
          polls && polls.length > currentPollIndex
            ? polls[currentPollIndex]
            : null;

        const effectiveQuestion = matchedPoll?.question || question;
        const totalVotes = matchedPoll?.total_votes ?? null;

        return (
          <div className="my-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm">
            <div className="flex items-center justify-between border-b pb-2 mb-2.5">
              <div className="flex items-center gap-2 font-semibold text-xs text-primary uppercase tracking-wider">
                <BarChart2 className="h-4 w-4" />
                <span>{t("pollTitle")}</span>
              </div>
              {totalVotes !== null && (
                <span className="text-xs font-medium text-muted-foreground">
                  {t("totalVotes", { count: totalVotes })}
                </span>
              )}
            </div>

            {effectiveQuestion ? (
              <p className="font-semibold text-sm mb-3 text-foreground break-words">
                {effectiveQuestion}
              </p>
            ) : null}

            {matchedPoll && Array.isArray(matchedPoll.options) ? (
              <div className="space-y-2">
                {matchedPoll.options.map((opt) => {
                  const percent = opt.percent ?? 0;
                  const votes = opt.votes ?? 0;
                  const voters = opt.voters ?? [];

                  return (
                    <div
                      key={opt.id}
                      className="relative overflow-hidden rounded-lg border border-border/80 bg-muted/20 p-2.5 transition-colors"
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-primary/10 dark:bg-primary/20 pointer-events-none transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                      <div className="relative flex items-center justify-between gap-3 text-xs sm:text-sm">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="truncate font-medium text-foreground">
                            {opt.text}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold text-xs text-muted-foreground">
                            {t("votesCount", { count: votes })} ({percent}%)
                          </span>
                          {voters.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1 border-primary/30 hover:bg-primary/10"
                              onClick={() =>
                                setActiveVotersModal({
                                  optionText: opt.text,
                                  voters,
                                })
                              }
                            >
                              <Users className="h-3 w-3 text-primary" />
                              <span>{voters.length}</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1.5">
                {parsedOptions.map((opt, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-1.5 text-xs sm:text-sm text-foreground"
                  >
                    <span className="flex h-3.5 w-3.5 shrink-0 rounded-full border-2 border-muted-foreground/50 bg-background" />
                    <span className="truncate">{opt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      if (node.name === "img") {
        const src = node.attribs?.src;
        if (!src) return <></>;

        return (
          <ImageLightbox
            src={src}
            alt={node.attribs?.alt ?? ""}
            className={cn(
              "w-full rounded-md border border-border bg-muted/40 object-contain",
              isModal
                ? "my-2.5 max-h-[300px] sm:max-h-[340px]"
                : "my-3 max-h-[420px] max-w-full"
            )}
          />
        );
      }

      if (node.name === "a") {
        node.attribs = {
          ...node.attribs,
          target: "_blank",
          rel: "noreferrer noopener",
          class: "text-blue-600 underline underline-offset-2",
        };
        return undefined;
      }

      return undefined;
    },
  };

  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(description);

  return (
    <div
      className={cn(
        "break-words leading-relaxed",
        !hasHtml && "whitespace-pre-wrap",
        className
      )}
    >
      {hasHtml ? (
        parse(description, options)
      ) : (
        <ReactLinkify>{description}</ReactLinkify>
      )}

      {activeVotersModal && (
        <Dialog
          open={Boolean(activeVotersModal)}
          onOpenChange={(open) => !open && setActiveVotersModal(null)}
        >
          <DialogContent className="max-w-lg max-h-[80vh] flex flex-col p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span>
                  {t("votersModalTitle")}: &ldquo;{activeVotersModal.optionText}&rdquo;
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 my-2 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("voterName")}</TableHead>
                    <TableHead>{t("voterRole")}</TableHead>
                    <TableHead>{t("voterStudentNumber")}</TableHead>
                    <TableHead>{t("voterTime")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeVotersModal.voters.map((v, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        {`${v.family_name || ""} ${v.given_name || ""}`.trim() || "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span
                          className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium",
                            v.voter_type === "student"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300"
                          )}
                        >
                          {v.voter_type === "student"
                            ? t("voterStudent")
                            : t("voterParent")}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {v.student_number || v.email || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(v.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveVotersModal(null)}
              >
                {t("close")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
