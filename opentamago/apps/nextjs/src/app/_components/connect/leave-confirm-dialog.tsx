"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

interface LeaveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const LeaveConfirmDialog = memo(function LeaveConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: LeaveConfirmDialogProps) {
  const t = useTranslations("connect");
  const tActions = useTranslations("actions");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("leaveConfirm.title")}</DialogTitle>
          <DialogDescription>{t("leaveConfirm.description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tActions("cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t("leaveConfirm.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
