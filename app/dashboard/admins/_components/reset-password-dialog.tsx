"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
  resetAdminPasswordSchema,
  type ResetAdminPasswordInput,
} from "@/lib/validations/admin";
import { resetAdminPasswordAction } from "@/app/actions/admin";
import type { AdminRow } from "./admins-view";

function generateStrongPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*-_=+";
  const pick = (set: string) =>
    set[Math.floor(Math.random() * set.length)];
  const parts = [
    pick(upper),
    pick(upper),
    pick(lower),
    pick(lower),
    pick(digits),
    pick(digits),
    pick(symbols),
    pick(symbols),
  ];
  for (let i = parts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }
  return parts.join("");
}

export function ResetPasswordDialog({
  admin,
  open,
  onOpenChange,
}: {
  admin: AdminRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Derive the inner form's key directly from props. When the dialog opens
  // (or the target admin changes) we mount a fresh body so its state and
  // react-hook-form instance are guaranteed clean.
  const innerKey = open ? admin.id : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <ResetPasswordFormBody
            key={innerKey}
            admin={admin}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordFormBody({
  admin,
  onOpenChange,
}: {
  admin: AdminRow;
  onOpenChange: (open: boolean) => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<ResetAdminPasswordInput>({
    resolver: zodResolver(resetAdminPasswordSchema),
    defaultValues: {
      staffId: admin.id,
      newPassword: generateStrongPassword(),
    },
  });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await resetAdminPasswordAction(data);
      if (result.success) {
        toast.success(
          "Password reset. The admin will need to sign in again with the new password.",
        );
        onOpenChange(false);
      } else if (result.fieldErrors) {
        for (const [key, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(key as keyof ResetAdminPasswordInput, {
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
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new password for {admin.name}. All of their active sessions
              will be signed out.
            </DialogDescription>
          </DialogHeader>

          {serverError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {serverError}
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reset-password">New password</Label>
            <Input id="reset-password" {...register("newPassword")} />
            {errors.newPassword?.message ? (
              <p className="text-xs text-destructive">
                {errors.newPassword.message}
              </p>
            ) : null}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="self-start px-0 text-xs"
              onClick={() =>
                setValue("newPassword", generateStrongPassword(), {
                  shouldValidate: true,
                })
              }
            >
              Generate another strong password
            </Button>
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
                  Resetting...
                </>
              ) : (
                "Reset password"
              )}
            </Button>
          </DialogFooter>
        </form>
  );
}