// src/pages/LoginPage.tsx
import { Link } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Hotel, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { loginSchema, type LoginFormData } from "@/schemas/authSchema";
import { useLogin } from "@/hooks/useAuth";

export function LoginPage() {
  const { mutate: login, isPending } = useLogin();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginFormData) => login(data);

  return (
    <div className="flex min-h-[calc(100svh-4rem)] items-center justify-center bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 px-4 py-12 dark:from-rose-950/30 dark:via-orange-950/20 dark:to-amber-950/20">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl p-8 shadow-xl ring-1 ring-foreground/10">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg">
              <Hotel className="size-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">
              Welcome back
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Sign in to continue to BookMyRoom
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <div className="relative">
                      <Mail className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                      <Input
                        {...field}
                        id={field.name}
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        className="pl-9"
                        aria-invalid={fieldState.invalid}
                      />
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                    <div className="relative">
                      <Lock className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                      <Input
                        {...field}
                        id={field.name}
                        type="password"
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        className="pl-9"
                        aria-invalid={fieldState.invalid}
                      />
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>

            <Button
              type="submit"
              size="lg"
              disabled={isPending}
              className="mt-6 w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700"
            >
              {isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="text-muted-foreground mt-6 text-center text-sm">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-medium text-rose-600 hover:underline"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
