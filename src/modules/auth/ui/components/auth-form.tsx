"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircleIcon, LogInIcon, UserPlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField } from "@/components/ui/form";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

type AuthMode = "sign-in" | "sign-up";

interface Props {
  mode: AuthMode;
}

const authFormSchema = z.object({
  name: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Enter a valid email" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
});

type AuthFormValues = z.infer<typeof authFormSchema>;

const getSafeRedirectTo = (value: string | null) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
};

export const AuthForm = ({ mode }: Props) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = authClient.useSession();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const redirectTo = useMemo(
    () => getSafeRedirectTo(searchParams.get("redirectTo")),
    [searchParams],
  );

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authFormSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (session.data) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router, session.data]);

  const isSignUp = mode === "sign-up";
  const title = isSignUp ? "Create your account" : "Welcome back";
  const description = isSignUp
    ? "Start saving your Vibe projects."
    : "Sign in to continue building.";
  const submitLabel = isSignUp ? "Create account" : "Sign in";
  const SubmitIcon = isSignUp ? UserPlusIcon : LogInIcon;

  const onSubmit = async (values: AuthFormValues) => {
    const name = values.name?.trim();

    if (isSignUp && !name) {
      form.setError("name", { message: "Name is required" });
      return;
    }

    setErrorMessage(null);
    setIsPending(true);

    try {
      const result = isSignUp
        ? await authClient.signUp.email({
            name: name ?? "",
            email: values.email,
            password: values.password,
          })
        : await authClient.signIn.email({
            email: values.email,
            password: values.password,
          });

      if (result.error) {
        const message = result.error.message ?? "Unable to authenticate";

        setErrorMessage(message);
        toast.error(message);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof TypeError
          ? "Unable to reach the authentication server. Please try again."
          : error instanceof Error
            ? error.message
            : "Unable to authenticate";

      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FieldGroup className="gap-4">
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              {isSignUp && (
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="name">Name</FieldLabel>
                      <Input
                        {...field}
                        id="name"
                        type="text"
                        autoComplete="name"
                        disabled={isPending}
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      autoComplete="email"
                      disabled={isPending}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      {...field}
                      id="password"
                      type="password"
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                      disabled={isPending}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </FieldGroup>
            <Button
              type="submit"
              className="w-full"
              disabled={isPending || !form.formState.isValid}
            >
              {isPending ? <Spinner /> : <SubmitIcon data-icon="inline-start" />}
              {submitLabel}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        {isSignUp ? "Already have an account?" : "No account yet?"}{" "}
        <Link
          href={{
            pathname: isSignUp ? "/sign-in" : "/sign-up",
            query: redirectTo === "/" ? undefined : { redirectTo },
          }}
          className="font-medium text-foreground hover:underline"
        >
          {isSignUp ? "Sign in" : "Sign up"}
        </Link>
      </CardFooter>
    </Card>
  );
};
