"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, Copy, Loader2 } from "lucide-react";

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
  const [resetPassword, setResetPassword] = React.useState<string | null>(null);
  const [hasCopied, setHasCopied] = React.useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
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
        setResetPassword(data.newPassword);
        setHasCopied(false);
        toast.success(
          "Password reset. Share the new password with the admin securely.",
        );
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

  const handleCopy = async () => {
    if (!resetPassword) return;
    try {
      await navigator.clipboard.writeText(resetPassword);
      setHasCopied(true);
      window.setTimeout(() => setHasCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard. Please copy it manually.");
    }
  };

  const handleResetForAnother = () => {
    setResetPassword(null);
    setHasCopied(false);
    setServerError(null);
    setValue("newPassword", generateStrongPassword(), { shouldValidate: true });
  };

  // Watch the current input value so the "copy" control always reflects
  // the latest generated/edited password before the action has resolved.
  const currentPassword = watch("newPassword");

  if (resetPassword !== null) {
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Password reset</DialogTitle>
          <DialogDescription>
            {admin.name} will need to sign in again with the new password
            below. All of their active sessions have been signed out.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          Copy this password and share it with the admin through a secure
          channel. It will not be shown again after you close this dialog.
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reset-password-success">New password</Label>
          <div className="flex items-stretch gap-2">
            <Input
              id="reset-password-success"
              readOnly
              value={resetPassword}
              className="font-mono"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              aria-label="Copy password"
            >
              {hasCopied ? (
                <>
                  <Check className="size-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetForAnother}
          >
            Reset another password
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </div>
    );
  }

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
            <Input
              id="reset-password"
              {...register("newPassword")}
              value={currentPassword}
              onChange={(event) =>
                setValue("newPassword", event.target.value, {
                  shouldValidate: true,
                })
              }
            />
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