// src/app/(auth)/forgot-password/forgot-password-client.tsx
// A two-step wizard on one URL: step 1 asks for the email and fires the OTP,
// step 2 takes the code plus the new password.
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useForgotPassword, useResetPassword } from "@/hooks/useAuth";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordFormData,
  type ResetPasswordFormData,
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

export default function ForgotPasswordClient() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState<string>("");

  const forgotPassword = useForgotPassword();
  const resetPassword = useResetPassword();

  const emailForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const resetForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { otp: "", newPassword: "" },
  });

  function onRequestCode(values: ForgotPasswordFormData) {
    forgotPassword.mutate(values, {
      onSuccess: () => {
        // Remember the email so step 2 can send it back with the code.
        setEmail(values.email);
        setStep("reset");
      },
    });
  }

  function onReset(values: ResetPasswordFormData) {
    resetPassword.mutate(
      { email, ...values },
      { onSuccess: () => router.push("/login") }
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          {step === "email" ? "Forgot your password?" : "Enter your code"}
        </CardTitle>
        <CardDescription>
          {step === "email"
            ? "We will email you a 6-digit code."
            : `We sent a code to ${email}. It expires in 10 minutes.`}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {step === "email" ? (
          // The key matters: swapping step unmounts this form so its state
          // does not leak into the next one.
          <form key="email-step" onSubmit={emailForm.handleSubmit(onRequestCode)}>
            <FieldGroup>
              <Controller
                name="email"
                control={emailForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="email"
                      autoComplete="email"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Button type="submit" disabled={forgotPassword.isPending}>
                {forgotPassword.isPending ? "Sending..." : "Send code"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="underline">
                  Back to log in
                </Link>
              </p>
            </FieldGroup>
          </form>
        ) : (
          <form key="reset-step" onSubmit={resetForm.handleSubmit(onReset)}>
            <FieldGroup>
              <Controller
                name="otp"
                control={resetForm.control}
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
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="newPassword"
                control={resetForm.control}
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

              <Button type="submit" disabled={resetPassword.isPending}>
                {resetPassword.isPending ? "Resetting..." : "Reset password"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("email")}
              >
                Use a different email
              </Button>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
