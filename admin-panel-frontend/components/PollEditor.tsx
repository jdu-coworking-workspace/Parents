"use client";
import React from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { plainPollText } from "@/lib/postContent";

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 10;
export const POLL_OPTION_MAX_LENGTH = 255;
export const POLL_QUESTION_MAX_LENGTH = 500;

export function cleanPollOptions(options: string[]): string[] {
  return options.map((option) => plainPollText(option)).filter(Boolean);
}

export function isPollValid(question: string, options: string[]): boolean {
  const questionText = plainPollText(question);
  if (!questionText || questionText.length > POLL_QUESTION_MAX_LENGTH) {
    return false;
  }
  const cleaned = cleanPollOptions(options);
  if (cleaned.length < POLL_MIN_OPTIONS || cleaned.length > POLL_MAX_OPTIONS) {
    return false;
  }
  if (cleaned.some((option) => option.length > POLL_OPTION_MAX_LENGTH)) {
    return false;
  }
  const keys = cleaned.map((option) => option.toLowerCase());
  return new Set(keys).size === keys.length;
}

interface PollEditorProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  question: string;
  onQuestionChange: (question: string) => void;
  options: string[];
  onOptionsChange: (options: string[]) => void;
  switchDisabled?: boolean;
  disabledHint?: string;
}

export default function PollEditor({
  enabled,
  onEnabledChange,
  question,
  onQuestionChange,
  options,
  onOptionsChange,
  switchDisabled = false,
  disabledHint,
}: PollEditorProps) {
  const t = useTranslations("sendmessage");

  const updateOption = (index: number, value: string) => {
    onOptionsChange(options.map((option, i) => (i === index ? value : option)));
  };

  const removeOption = (index: number) => {
    if (options.length <= POLL_MIN_OPTIONS) return;
    onOptionsChange(options.filter((_, i) => i !== index));
  };

  const addOption = () => {
    if (options.length >= POLL_MAX_OPTIONS) return;
    onOptionsChange([...options, ""]);
  };

  const questionText = plainPollText(question);
  const questionInvalid =
    questionText.length === 0 || questionText.length > POLL_QUESTION_MAX_LENGTH;
  const cleaned = cleanPollOptions(options);
  const keys = cleaned.map((option) => option.toLowerCase());
  const hasDuplicates = new Set(keys).size !== keys.length;
  const showError = enabled && !isPollValid(question, options);

  return (
    <div className="flex flex-col gap-4 rounded-md border bg-muted/40 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <Label className="text-base font-medium">{t("pollAdd")}</Label>
          {switchDisabled && disabledHint ? (
            <span className="mt-1 text-xs text-muted-foreground">
              {disabledHint}
            </span>
          ) : (
            <span className="mt-1 text-xs text-muted-foreground">
              {t("pollFieldsOptional")}
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
          <Label htmlFor="poll-switch">{enabled ? t("yes") : t("no")}</Label>
        </div>
      </div>

      {enabled && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t("pollHint")}</p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="poll-question">{t("pollQuestion")}</Label>
            <Input
              id="poll-question"
              value={question}
              maxLength={POLL_QUESTION_MAX_LENGTH}
              placeholder={t("pollQuestionPlaceholder")}
              onChange={(event) => onQuestionChange(event.target.value)}
            />
          </div>

          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={option}
                maxLength={POLL_OPTION_MAX_LENGTH}
                placeholder={t("pollOptionPlaceholder", { number: index + 1 })}
                onChange={(event) => updateOption(index, event.target.value)}
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
              <Plus className="mr-2 h-4 w-4" />
              {t("pollAddOption")}
            </Button>
          </div>

          {showError && (
            <p className="text-sm text-destructive">
              {questionInvalid
                ? t("pollQuestionRequired")
                : hasDuplicates
                  ? t("pollDuplicateOptions")
                  : t("pollMinOptions")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
