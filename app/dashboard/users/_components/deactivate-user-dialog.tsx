"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, UserX2Icon } from "lucide-react";

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
import { deactivateUserAction } from "@/app/actions/users";
import type { UserRow } from "./users-view";

export function DeactivateUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: {
  user: UserRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleConfirm() {
    setServerError(null);
    startTransition(async () => {
      const result = await deactivateUserAction({ userId: user.id });
      if (result.success) {
        toast.success("Sessions revoked");
        onOpenChange(false);
        onSuccess?.();
      } else if (result.error) {
        setServerError(result.error);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent key={user.id}>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <UserX2Icon className="size-5" />
          </AlertDialogMedia>
          <AlertDialogTitle>Revoke all sessions?</AlertDialogTitle>
          <AlertDialogDescription>
            {user.name} will be signed out of every device and will not be able
            to sign in again until they verify their email. Their account
            itself will remain intact.
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
                Working...
              </>
            ) : (
              "Revoke sessions"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
