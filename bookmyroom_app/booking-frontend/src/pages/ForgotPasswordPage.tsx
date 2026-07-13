// src/pages/ForgotPasswordPage.tsx
// Matches Lesson 21.1 section 21.1.18. Single-URL two-step wizard:
// step 1 collects the email + fires the OTP; step 2 collects OTP + new
// password and completes the reset. Sonner toasts are handled inside
// useForgotPassword / useResetPassword so we only care about navigation.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForgotPassword, useResetPassword } from "@/hooks/useAuth";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});
type EmailForm = z.infer<typeof emailSchema>;

const resetSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});
type ResetForm = z.infer<typeof resetSchema>;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState<string>("");

  const forgot = useForgotPassword();
  const reset = useResetPassword();

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { otp: "", newPassword: "" },
  });

  const submitEmail = (values: EmailForm) => {
    forgot.mutate(values, {
      onSuccess: () => {
        setEmail(values.email);
        setStep("reset");
      },
    });
  };

  const submitReset = (values: ResetForm) => {
    reset.mutate(
      { email, otp: values.otp, newPassword: values.newPassword },
      { onSuccess: () => navigate("/login") }
    );
  };

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Forgot your password?</h1>
        <p className="text-muted-foreground text-sm">
          {step === "email"
            ? "Enter your account email and we'll send you a 6-digit code."
            : `We've sent a code to ${email}. Enter it below to choose a new password.`}
        </p>
      </div>

      {step === "email" ? (
        // The `key` is critical: when we flip step from "email" to "reset",
        // both branches render a <form> with a <FieldGroup><Controller/>
        // structure, and React would happily reuse the same fibers -- which
        // means the OTP Controller would stay subscribed to emailForm.control
        // and typing would appear to do nothing. Distinct keys force a fresh
        // mount so each Controller binds to its own form instance.
        <form
          key="email-step"
          onSubmit={emailForm.handleSubmit(submitEmail)}
          className="space-y-6"
        >
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
                    placeholder="you@example.com"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
          <Button type="submit" className="w-full" disabled={forgot.isPending}>
            {forgot.isPending ? "Sending..." : "Send reset code"}
          </Button>
        </form>
      ) : (
        <form
          key="reset-step"
          onSubmit={resetForm.handleSubmit(submitReset)}
          className="space-y-6"
        >
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
                    placeholder="At least 6 characters"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
          <Button type="submit" className="w-full" disabled={reset.isPending}>
            {reset.isPending ? "Resetting..." : "Reset password"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setStep("email")}
          >
            Use a different email
          </Button>
        </form>
      )}

      <p className="text-muted-foreground text-center text-sm">
        Remembered it?{" "}
        <Link to="/login" className="underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default ForgotPasswordPage;
