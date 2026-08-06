"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Trash2Icon } from "lucide-react";

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
import { deleteAdminAction } from "@/app/actions/admin";
import type { AdminRow } from "./admins-view";

export function DeleteAdminDialog({
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

  function handleConfirm() {
    setServerError(null);
    startTransition(async () => {
      const result = await deleteAdminAction({ staffId: admin.id });
      if (result.success) {
        toast.success("Admin deleted");
        onOpenChange(false);
        onSuccess?.();
      } else if (result.error) {
        setServerError(result.error);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent key={admin.id}>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2Icon className="size-5" />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete admin?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes {admin.name} and their account. They
            will not be able to sign in again.
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
            variant="destructive"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete admin"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}