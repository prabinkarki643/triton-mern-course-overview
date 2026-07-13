// src/pages/ProfilePage.tsx
// Matches Lesson 21.1 section 21.1.19. Renders inside OwnerLayout at
// /owner/profile. Hosts the Change Password + Verify Email cards.
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useCurrentUser,
  useChangePassword,
  useSendEmailVerifyOtp,
  useVerifyEmail,
} from "@/hooks/useAuth";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmNewPassword: z.string().min(6, "Please retype your new password"),
  })
  .refine((v) => v.newPassword === v.confirmNewPassword, {
    path: ["confirmNewPassword"],
    message: "Passwords do not match",
  });
type PasswordForm = z.infer<typeof passwordSchema>;

const emailOtpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
type EmailOtpForm = z.infer<typeof emailOtpSchema>;

export function ProfilePage() {
  const { data: user } = useCurrentUser();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Manage your account security and verification.
        </p>
      </div>

      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your basic account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Name: </span>
              {user.name}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span>
                <span className="text-muted-foreground">Email: </span>
                {user.email}
              </span>
              {user.emailVerified ? (
                <Badge>Verified</Badge>
              ) : (
                <Badge variant="secondary">Unverified</Badge>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">Role: </span>
              {user.role}
            </div>
          </CardContent>
        </Card>
      )}

      <ChangePasswordCard />
      {user && !user.emailVerified && <VerifyEmailCard />}
    </div>
  );
}

function ChangePasswordCard() {
  const changePassword = useChangePassword();
  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const onSubmit = (values: PasswordForm) => {
    changePassword.mutate(
      {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      },
      { onSuccess: () => form.reset() }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4" /> Change password
        </CardTitle>
        <CardDescription>
          Enter your current password and choose a new one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="confirmNewPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Confirm new password
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="password"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
          <Button type="submit" disabled={changePassword.isPending}>
            {changePassword.isPending ? "Saving..." : "Change password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function VerifyEmailCard() {
  const [otpSent, setOtpSent] = useState(false);
  const sendOtp = useSendEmailVerifyOtp();
  const verify = useVerifyEmail();

  const form = useForm<EmailOtpForm>({
    resolver: zodResolver(emailOtpSchema),
    defaultValues: { otp: "" },
  });

  const requestCode = () => {
    sendOtp.mutate(undefined, { onSuccess: () => setOtpSent(true) });
  };

  const submit = (values: EmailOtpForm) => {
    verify.mutate(values, { onSuccess: () => form.reset() });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BadgeCheck className="size-4" /> Verify your email
        </CardTitle>
        <CardDescription>
          Prove you own the address you signed up with. We'll email you a
          6-digit code.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!otpSent ? (
          <Button onClick={requestCode} disabled={sendOtp.isPending}>
            {sendOtp.isPending ? "Sending..." : "Send verification code"}
          </Button>
        ) : (
          <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
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
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={verify.isPending}>
                {verify.isPending ? "Verifying..." : "Verify email"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={requestCode}
                disabled={sendOtp.isPending}
              >
                Resend code
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default ProfilePage;
