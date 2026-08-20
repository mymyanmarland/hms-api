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
  createUserSchema,
  type CreateUserInput,
} from "@/lib/validations/users";
import { createUserAction } from "@/app/actions/users";

export function InviteUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  // Derive the inner form's key directly from `open`. Whenever the dialog
  // opens we mount a fresh body so its server-error state and react-hook-form
  // instance are guaranteed to be clean.
  const innerKey = open ? "open" : "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <InviteUserFormBody
            key={innerKey}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function generateStrongPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*";
  const all = upper + lower + digits + symbols;

  const pick = (chars: string) =>
    chars[Math.floor(Math.random() * chars.length)];

  const required = [
    pick(upper),
    pick(upper),
    pick(lower),
    pick(lower),
    pick(digits),
    pick(digits),
    pick(symbols),
    pick(symbols),
  ];
  const remaining = Array.from({ length: 4 }, () => pick(all));

  // Fisher-Yates shuffle
  return [...required, ...remaining]
    .map((value, index, array) => {
      const j = Math.floor(Math.random() * (index + 1));
      const swap = array[j]!;
      array[j] = value;
      return swap;
    })
    .join("");
}

function InviteUserFormBody({
  onOpenChange,
  onSuccess,
}: {
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
    setValue,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      temporaryPassword: "",
    },
  });

  const handleGeneratePassword = () => {
    setValue("temporaryPassword", generateStrongPassword(), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createUserAction(data);
      if (result.success) {
        toast.success("User invited");
        reset();
        onOpenChange(false);
        onSuccess?.();
      } else if (result.fieldErrors) {
        for (const [key, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(key as keyof CreateUserInput, {
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
        <DialogTitle>Create a customer account</DialogTitle>
        <DialogDescription>
          The new customer will receive an email with their temporary password.
          They will be prompted to change it on first sign-in.
        </DialogDescription>
      </DialogHeader>

      {serverError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {serverError}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="user-invite-name">Full name</Label>
        <Input
          id="user-invite-name"
          autoComplete="name"
          {...register("name")}
        />
        {errors.name?.message ? (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="user-invite-email">Email</Label>
        <Input
          id="user-invite-email"
          type="email"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email?.message ? (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="user-invite-password">Temporary password</Label>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={handleGeneratePassword}
            disabled={isPending}
          >
            Generate a strong password
          </Button>
        </div>
        <Input
          id="user-invite-password"
          type="text"
          autoComplete="new-password"
          {...register("temporaryPassword")}
        />
        {errors.temporaryPassword?.message ? (
          <p className="text-xs text-destructive">
            {errors.temporaryPassword.message}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            At least 12 characters with uppercase, lowercase, a number, and a
            symbol.
          </p>
        )}
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
              Creating...
            </>
          ) : (
            "Create user"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
