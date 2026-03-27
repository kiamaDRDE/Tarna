"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Check, CheckCircle2, Loader2, X, XCircle } from "lucide-react";
import { Spinner } from "@/src/components/ui/spinner";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const passwordRules = [
  { key: "minLength", label: "Au moins 8 caractères", test: (v: string) => v.length >= 8 },
  { key: "uppercase", label: "Au moins une lettre majuscule", test: (v: string) => /[A-Z]/.test(v) },
  { key: "lowercase", label: "Au moins une lettre minuscule", test: (v: string) => /[a-z]/.test(v) },
  { key: "digit", label: "Au moins un chiffre", test: (v: string) => /\d/.test(v) },
];

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [tokenStatus, setTokenStatus] = useState<"loading" | "valid" | "invalid">("loading");
  const [tokenError, setTokenError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, setIsPending] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  // Vérifier le token au chargement
  useEffect(() => {
    if (!token) {
      setTokenStatus("invalid");
      setTokenError("Lien de réinitialisation invalide.");
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/auth/verify-reset-token?token=${encodeURIComponent(token)}`,
        );
        if (res.ok) {
          setTokenStatus("valid");
        } else {
          const data = await res.json().catch(() => null);
          setTokenStatus("invalid");
          setTokenError(data?.message ?? "Ce lien est invalide ou a expiré.");
        }
      } catch {
        setTokenStatus("invalid");
        setTokenError("Impossible de contacter le serveur.");
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isPending || !token) return;

      const validationErrors: Record<string, string> = {};

      if (!password) {
        validationErrors.password = "Le nouveau mot de passe est requis.";
      } else {
        const failedRules = passwordRules.filter((r) => !r.test(password));
        if (failedRules.length > 0) {
          validationErrors.password =
            failedRules.map((r) => r.label).join(", ") + ".";
        }
      }

      if (password !== confirmPassword) {
        validationErrors.confirmPassword =
          "Les mots de passe ne correspondent pas.";
      }

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      try {
        setIsPending(true);
        setErrors({});

        const res = await fetch(
          `${API_BASE_URL}/auth/reset-password-with-token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, newPassword: password }),
          },
        );

        const data = await res.json().catch(() => null);

        if (res.ok) {
          setResetDone(true);
        } else {
          toast.error("Erreur", {
            description:
              data?.message ?? "Impossible de réinitialiser le mot de passe.",
          });
        }
      } catch {
        toast.error("Erreur réseau", {
          description: "Impossible de contacter le serveur.",
        });
      } finally {
        setIsPending(false);
      }
    },
    [password, confirmPassword, isPending, token],
  );

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-1 self-center font-medium">
          <div className="text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <Image src="/logo.svg" alt="Tarna logo" width={24} height={24} />
          </div>
          Tarna
        </a>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {resetDone
                ? "Mot de passe réinitialisé"
                : "Nouveau mot de passe"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Token verification in progress */}
            {tokenStatus === "loading" && (
              <div className="flex flex-col items-center gap-4 pt-2">
                <Loader2 className="size-12 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Vérification du lien…
                </p>
              </div>
            )}

            {/* Token invalid */}
            {tokenStatus === "invalid" && (
              <div className="flex flex-col items-center gap-4 pt-2">
                <XCircle className="size-12 text-destructive" />
                <p className="text-sm text-center text-destructive">
                  {tokenError}
                </p>
                <Button asChild variant="outline" className="w-full mt-2">
                  <Link href="/forgot-password">
                    Demander un nouveau lien
                  </Link>
                </Button>
              </div>
            )}

            {/* Reset complete */}
            {tokenStatus === "valid" && resetDone && (
              <div className="flex flex-col items-center gap-4 pt-2">
                <CheckCircle2 className="size-12 text-green-500" />
                <p className="text-sm text-center">
                  Votre mot de passe a été réinitialisé avec succès.
                </p>
                <Button asChild className="w-full mt-2">
                  <Link href="/login">Se connecter</Link>
                </Button>
              </div>
            )}

            {/* Password reset form */}
            {tokenStatus === "valid" && !resetDone && (
              <form onSubmit={handleSubmit} noValidate>
                <FieldGroup className="gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">
                      Nouveau mot de passe
                    </FieldLabel>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Min. 8 caractères, 1 majuscule, 1 chiffre"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (Object.keys(errors).length > 0) setErrors({});
                      }}
                      className={errors.password ? "border-red-500" : ""}
                    />
                    {password.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {passwordRules.map((rule) => {
                          const passed = rule.test(password);
                          return (
                            <li
                              key={rule.key}
                              className={`flex items-center gap-1.5 text-xs ${
                                passed
                                  ? "text-green-600"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {passed ? (
                                <Check className="size-3" />
                              ) : (
                                <X className="size-3" />
                              )}
                              {rule.label}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {errors.password && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.password}
                      </p>
                    )}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="confirmPassword">
                      Confirmer le mot de passe
                    </FieldLabel>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (Object.keys(errors).length > 0) setErrors({});
                      }}
                      className={
                        errors.confirmPassword ? "border-red-500" : ""
                      }
                    />
                    {errors.confirmPassword && (
                      <p className="text-xs text-red-500">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </Field>

                  <Button type="submit" disabled={isPending} className="w-full">
                    {isPending ? (
                      <Spinner className="size-4" />
                    ) : (
                      "Réinitialiser le mot de passe"
                    )}
                  </Button>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-muted flex min-h-svh items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
