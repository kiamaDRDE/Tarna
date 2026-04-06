"use client";

import { useState, useCallback, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { Spinner } from "@/src/components/ui/spinner";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function ForgotPasswordContent() {
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isPending) return;

      setError("");

      if (!email.trim()) {
        setError("L'adresse email est requise.");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("Veuillez saisir une adresse email valide.");
        return;
      }

      try {
        setIsPending(true);
        const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });

        const data = await res.json().catch(() => null);

        if (res.ok) {
          setEmailSent(true);
        } else {
          setError(data?.message ?? "Une erreur est survenue.");
        }
      } catch {
        toast.error("Erreur réseau", {
          description: "Impossible de contacter le serveur.",
        });
      } finally {
        setIsPending(false);
      }
    },
    [email, isPending],
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
            <CardTitle className="text-xl">Mot de passe oublié</CardTitle>
          </CardHeader>
          <CardContent>
            {emailSent ? (
              <div className="flex flex-col items-center gap-4 pt-2">
                <Mail className="size-12 text-primary" />
                <p className="text-sm text-center">
                  Si un compte est associé à <strong>{email}</strong>, vous
                  recevrez un email avec un lien pour réinitialiser votre mot de
                  passe.
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  Vérifiez aussi votre dossier spam.
                </p>
                <Button asChild variant="outline" className="w-full mt-2">
                  <Link href="/login">
                    <ArrowLeft className="size-4 mr-1.5" />
                    Retour à la connexion
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <FieldGroup>
                  <FieldDescription className="text-center text-xs">
                    Saisissez votre adresse email et nous vous enverrons un lien
                    pour réinitialiser votre mot de passe.
                  </FieldDescription>
                  <Field>
                    <FieldLabel htmlFor="email">Adresse email</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="email@exemple.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      className={error ? "border-red-500" : ""}
                    />
                    {error && <p className="text-sm text-red-500">{error}</p>}
                  </Field>
                  <Field>
                    <Button type="submit" disabled={isPending} className="w-full">
                      {isPending ? (
                        <Spinner className="size-4" />
                      ) : (
                        "Envoyer le lien"
                      )}
                    </Button>
                  </Field>
                  <FieldDescription className="text-center">
                    <Link
                      href="/login"
                      className="text-sm underline-offset-4 hover:underline"
                    >
                      Retour à la connexion
                    </Link>
                  </FieldDescription>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-muted flex min-h-svh items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
