"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateUserSchema,
  type UpdateUserInput,
} from "@/lib/validations/users";
import { updateUserAction } from "@/app/actions/users";
import type { UserRow } from "./users-view";

export function EditUserDialog({
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
  // Derive the inner form's key directly from the props we depend on. When
  // the dialog opens (or the target user changes) we mount a fresh body so
  // its server-error state and react-hook-form instance are guaranteed clean.
  const innerKey = open ? user.id : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <EditUserFormBody
            key={innerKey}
            user={user}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditUserFormBody({
  user,
  onOpenChange,
  onSuccess,
}: {
  user: UserRow;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      userId: user.id,
      name: user.name,
      email: user.email,
    },
  });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await updateUserAction(data);
      if (result.success) {
        reset();
        onOpenChange(false);
        onSuccess?.();
      } else if (result.fieldErrors) {
        for (const [key, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(key as keyof UpdateUserInput, {
              message: messages[0],
            });
          }
        }
        if (result.error) setServerError(result.error);
      } else if (result.error) {
        setServerError(result.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Edit user</DialogTitle>
        <DialogDescription>
          Update the customer&apos;s name and email address.
        </DialogDescription>
      </DialogHeader>

      {serverError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {serverError}
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-user-name">Full name</Label>
        <Input id="edit-user-name" {...register("name")} />
        {errors.name?.message ? (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-user-email">Email</Label>
        <Input id="edit-user-email" type="email" {...register("email")} />
        {errors.email?.message ? (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        ) : null}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
