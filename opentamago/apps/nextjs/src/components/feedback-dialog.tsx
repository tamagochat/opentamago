"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

const FEEDBACK_TYPES = ["bug", "feature", "other"] as const;
type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export function FeedbackDialog() {
  const t = useTranslations("feedback");
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");

  const submit = api.feedback.submit.useMutation({
    onSuccess: () => {
      toast.success(t("success"));
      setOpen(false);
      setType("bug");
      setMessage("");
    },
    onError: (err) => {
      if (err.data?.code === "UNAUTHORIZED") {
        toast.error(t("signInRequired"));
      } else {
        toast.error(t("error"));
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="hover:text-foreground transition-colors inline-flex items-center gap-1 cursor-pointer">
          <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
          {t("title")}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate({
              feedbackType: type,
              message: message.trim() || undefined,
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            {FEEDBACK_TYPES.map((ft) => (
              <label
                key={ft}
                className="flex items-center gap-3 cursor-pointer"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    type === ft
                      ? "border-primary"
                      : "border-muted-foreground/40"
                  }`}
                >
                  {type === ft && (
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  )}
                </span>
                <span className="text-sm font-medium">{t(`type.${ft}`)}</span>
              </label>
            ))}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("placeholder")}
            maxLength={2000}
            rows={3}
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
          />

          <Button
            type="submit"
            className="w-full"
            disabled={submit.isPending}
          >
            {submit.isPending ? t("submitting") : t("submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
