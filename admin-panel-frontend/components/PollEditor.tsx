"use client";
import React from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 10;
export const POLL_OPTION_MAX_LENGTH = 255;

/**
 * Bo'sh qatorlarni tashlab, variantlarni tozalaydi.
 */
export function cleanPollOptions(options: string[]): string[] {
  return options.map((o) => o.trim()).filter(Boolean);
}

/**
 * Backend qoidalari bilan bir xil:
 * kamida 2 ta, ko'pi bilan 10 ta, takrorlanmaydi, har biri <= 255 belgi.
 */
export function isPollValid(options: string[]): boolean {
  const cleaned = cleanPollOptions(options);
  if (cleaned.length < POLL_MIN_OPTIONS) return false;
  if (cleaned.length > POLL_MAX_OPTIONS) return false;
  if (cleaned.some((o) => o.length > POLL_OPTION_MAX_LENGTH)) return false;
  const lower = cleaned.map((o) => o.toLowerCase());
  return new Set(lower).size === lower.length;
}

export function extractPollFromHtml(html: string): {
  question?: string;
  options: string[];
} | null {
  if (!html || !html.includes("data-poll")) return null;
  const match = html.match(/data-poll-options=["']([^"']+)["']/i);
  if (!match) return null;
  try {
    const raw = match[1].replace(/&quot;/g, '"').replace(/&#34;/g, '"');
    const options = JSON.parse(raw);
    if (Array.isArray(options)) {
      const cleaned = cleanPollOptions(options);
      if (cleaned.length >= POLL_MIN_OPTIONS) {
        const questionMatch = html.match(
          /data-poll-question=["']([^"']*)["']/i
        );
        const question = questionMatch ? questionMatch[1] : undefined;
        return { question, options: cleaned };
      }
    }
  } catch {}
  return null;
}

export function extractAllPollsFromHtml(html: string): Array<{
  question?: string;
  options: string[];
}> {
  if (!html || !html.includes("data-poll")) return [];
  const results: Array<{ question?: string; options: string[] }> = [];
  const regex = /<div\b[^>]*\bdata-poll=["']true["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const tag = match[0];
    const optionsMatch = tag.match(/data-poll-options=["']([^"']+)["']/i);
    if (!optionsMatch) continue;
    try {
      const raw = optionsMatch[1].replace(/&quot;/g, '"').replace(/&#34;/g, '"');
      const options = JSON.parse(raw);
      if (Array.isArray(options)) {
        const cleaned = cleanPollOptions(options);
        if (cleaned.length >= POLL_MIN_OPTIONS) {
          const questionMatch = tag.match(
            /data-poll-question=["']([^"']*)["']/i
          );
          const question = questionMatch ? questionMatch[1] : undefined;
          results.push({ question, options: cleaned });
        }
      }
    } catch {}
  }
  return results;
}

interface PollEditorProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  options: string[];
  onOptionsChange: (options: string[]) => void;
  /** Switch'ni o'chirib qo'yish (masalan, rejalashtirish yoqilganda) */
  switchDisabled?: boolean;
  /** switchDisabled sababi haqida izoh */
  disabledHint?: string;
}

export default function PollEditor({
  enabled,
  onEnabledChange,
  options,
  onOptionsChange,
  switchDisabled = false,
  disabledHint,
}: PollEditorProps) {
  const t = useTranslations("sendmessage");

  const updateOption = (index: number, value: string) => {
    onOptionsChange(options.map((o, i) => (i === index ? value : o)));
  };

  const removeOption = (index: number) => {
    if (options.length <= POLL_MIN_OPTIONS) return;
    onOptionsChange(options.filter((_, i) => i !== index));
  };

  const addOption = () => {
    if (options.length >= POLL_MAX_OPTIONS) return;
    onOptionsChange([...options, ""]);
  };

  const cleaned = cleanPollOptions(options);
  const lower = cleaned.map((o) => o.toLowerCase());
  const hasDuplicates = new Set(lower).size !== lower.length;
  const showError = enabled && !isPollValid(options);

  return (
    <div className="flex flex-col gap-4 border p-4 rounded-md bg-muted/40">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Label className="text-base font-medium">{t("pollAdd")}</Label>
          {switchDisabled && disabledHint && (
            <span className="text-xs text-muted-foreground mt-1">
              {disabledHint}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="poll-switch"
            checked={enabled}
            disabled={switchDisabled}
            onCheckedChange={onEnabledChange}
          />
          <Label htmlFor="poll-switch" className="ml-2">
            {enabled ? t("yes") : t("no")}
          </Label>
        </div>
      </div>

      {enabled && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{t("pollHint")}</p>

          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={option}
                maxLength={POLL_OPTION_MAX_LENGTH}
                placeholder={t("pollOptionPlaceholder", { number: index + 1 })}
                onChange={(e) => updateOption(index, e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label={t("pollRemoveOption")}
                disabled={options.length <= POLL_MIN_OPTIONS}
                onClick={() => removeOption(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div>
            <Button
              type="button"
              variant="secondary"
              disabled={options.length >= POLL_MAX_OPTIONS}
              onClick={addOption}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("pollAddOption")}
            </Button>
          </div>

          {showError && (
            <p className="text-sm text-destructive">
              {hasDuplicates ? t("pollDuplicateOptions") : t("pollMinOptions")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
