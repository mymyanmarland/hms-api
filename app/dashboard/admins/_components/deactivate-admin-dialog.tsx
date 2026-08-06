"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deactivateAdminAction, reactivateAdminAction } from "@/app/actions/admin";
import type { AdminRow } from "./admins-view";
import { UserX2Icon, UserCheck2Icon } from "lucide-react";

export function DeactivateAdminDialog({
  admin,
  open,
  onOpenChange,
  onSuccess,
}: {
  admin: AdminRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const isActive = admin.isActive;

  function handleConfirm() {
    setServerError(null);
    startTransition(async () => {
      const result = isActive
        ? await deactivateAdminAction({ staffId: admin.id })
        : await reactivateAdminAction({ staffId: admin.id });
      if (result.success) {
        toast.success(isActive ? "Admin deactivated" : "Admin reactivated");
        onOpenChange(false);
        onSuccess?.();
      } else if (result.error) {
        setServerError(result.error);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent key={admin.id + (admin.isActive ? ":a" : ":i")}>
        <AlertDialogHeader>
          <AlertDialogMedia>
            {isActive ? (
              <UserX2Icon className="size-5" />
            ) : (
              <UserCheck2Icon className="size-5" />
            )}
          </AlertDialogMedia>
          <AlertDialogTitle>
            {isActive ? "Deactivate admin?" : "Reactivate admin?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isActive
              ? `${admin.name} will be signed out of all devices and will not be able to sign back in until reactivated.`
              : `${admin.name} will regain access to the HMS admin dashboard.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {serverError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {serverError}
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
            disabled={isPending}
            variant={isActive ? "destructive" : "default"}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Working...
              </>
            ) : isActive ? (
              "Deactivate"
            ) : (
              "Reactivate"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}