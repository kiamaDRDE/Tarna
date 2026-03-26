"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { signupAction, type SignupState } from "@/app/(Register)/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Spinner } from "../ui/spinner";
import { toast } from "sonner";

const initialState: SignupState = { success: false, errors: {} };

export default function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [state, setState] = useState<SignupState>(initialState);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    setIsPending(true);
    setState(initialState);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await signupAction(initialState, formData);
      setState(result);
    } catch {
      toast.error("Erreur réseau", {
        description: "Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.",
      });
    } finally {
      setIsPending(false);
    }
  }, [isPending]);

  useEffect(() => {
    if (state.success) {
      toast.success("Compte créé avec succès", {
        description: "Vous pouvez maintenant vous connecter.",
      });
      router.push("/login");
    } else if (!state.success && Object.keys(state.errors).length > 0) {
      const firstError =
        state.errors.username ??
        state.errors.name ??
        state.errors.email ??
        state.errors.phone ??
        state.errors.password ??
        state.errors.confirmPassword;
      toast.error("Erreur d'inscription", {
        description: firstError ?? "Vérifiez vos informations.",
      });
    }
  }, [state, router]);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="p-4">
        <CardHeader className="text-center p-0">
          <CardTitle className="text-xl">Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate>
            <FieldGroup className="gap-2">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  className={state.errors.username ? "border-red-500" : ""}
                />
                {state.errors.username && (
                  <p className="text-sm text-red-500">{state.errors.username}</p>
                )}
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="name">Full Name</FieldLabel>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  className={state.errors.name ? "border-red-500" : ""}
                />
                {state.errors.name && (
                  <p className="text-sm text-red-500">{state.errors.name}</p>
                )}
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  className={state.errors.email ? "border-red-500" : ""}
                />
                {state.errors.email && (
                  <p className="text-sm text-red-500">{state.errors.email}</p>
                )}
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  className={state.errors.phone ? "border-red-500" : ""}
                />
                {state.errors.phone && (
                  <p className="text-sm text-red-500">{state.errors.phone}</p>
                )}
              </Field>
              <Field className="gap-1.5">
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className={state.errors.password ? "border-red-500" : ""}
                    />
                    {state.errors.password && (
                      <p className="text-sm text-red-500">{state.errors.password}</p>
                    )}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm Password
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      className={state.errors.confirmPassword ? "border-red-500" : ""}
                    />
                    {state.errors.confirmPassword && (
                      <p className="text-sm text-red-500">{state.errors.confirmPassword}</p>
                    )}
                  </Field>
                </Field>
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>
              <Field>
                <Button type="submit" disabled={isPending}>
                  {isPending ?  <Spinner className="size-4" /> : "Create Account"}
                </Button>
                <FieldDescription className="text-center">
                  Already have an account? <Link href="/login">Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
