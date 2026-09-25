// src/app/(protected)/profile/profile-client.tsx
"use client";

import { useState } from "react";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  useChangePassword,
  useCurrentUser,
  useSendEmailVerifyOtp,
  useVerifyEmail,
} from "@/hooks/useAuth";
import {
  changePasswordSchema,
  verifyEmailSchema,
  type ChangePasswordFormData,
  type VerifyEmailFormData,
} from "@/schemas/authSchema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function ProfileClient() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <p className="p-6 text-muted-foreground">Loading your profile...</p>;
  }

  if (!user) {
    return <p className="p-6">We could not load your profile.</p>;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <p className="text-muted-foreground">
          {user.email} &middot; {user.role}
        </p>
      </div>

      <EmailVerificationCard verified={user.emailVerified} />
      <ChangePasswordCard />
    </main>
  );
}

function EmailVerificationCard({ verified }: { verified: boolean }) {
  const [showCodeInput, setShowCodeInput] = useState(false);
  const sendOtp = useSendEmailVerifyOtp();
  const verifyEmail = useVerifyEmail();

  const form = useForm<VerifyEmailFormData>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { otp: "" },
  });

  if (verified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BadgeCheck className="size-4" />
            Email verified
          </CardTitle>
          <CardDescription>
            Your email address has been confirmed.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="size-4" />
          Email not verified
        </CardTitle>
        <CardDescription>
          Verify your email so we can reach you about your bookings.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!showCodeInput ? (
          <Button
            disabled={sendOtp.isPending}
            onClick={() =>
              sendOtp.mutate(undefined, {
                onSuccess: () => setShowCodeInput(true),
              })
            }
          >
            {sendOtp.isPending ? "Sending..." : "Send verification code"}
          </Button>
        ) : (
          <form
            onSubmit={form.handleSubmit((values) =>
              verifyEmail.mutate(values, { onSuccess: () => form.reset() })
            )}
          >
            <FieldGroup>
              <Controller
                name="otp"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>6-digit code</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      autoComplete="one-time-code"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>
                      Check your inbox. The code expires in 10 minutes.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Button type="submit" disabled={verifyEmail.isPending}>
                {verifyEmail.isPending ? "Verifying..." : "Verify email"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                disabled={sendOtp.isPending}
                onClick={() => sendOtp.mutate()}
              >
                Resend code
              </Button>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function ChangePasswordCard() {
  const changePassword = useChangePassword();

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change password</CardTitle>
        <CardDescription>
          You need your current password to set a new one.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={form.handleSubmit((values) =>
            changePassword.mutate(values, { onSuccess: () => form.reset() })
          )}
        >
          <FieldGroup>
            <Controller
              name="currentPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Current password</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="newPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>New password</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>At least 6 characters.</FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? "Saving..." : "Change password"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
