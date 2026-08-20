"use client";

import * as React from "react";
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
import { deleteUserAction } from "@/app/actions/users";
import type { UserRow } from "./users-view";

export function DeleteUserDialog({
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
      const result = await deleteUserAction({ userId: user.id });
      if (result.success) {
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
            <Trash2Icon className="size-5" />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete user?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes {user.name}&apos;s account, including all
            sessions, linked credentials, and OTP codes. Any associated Guest
            profile will be detached (not deleted) so historical bookings remain
            intact.
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
              "Delete user"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
