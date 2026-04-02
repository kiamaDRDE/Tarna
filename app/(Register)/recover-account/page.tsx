"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { CheckCircle2, XCircle, Loader2, RotateCcw } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function RecoverAccountContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<
    "no-token" | "loading" | "success" | "already" | "error"
  >(token ? "loading" : "no-token");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/auth/confirm-recovery?token=${encodeURIComponent(token)}`,
        );
        const data = await res.json().catch(() => null);

        if (cancelled) return;

        if (res.ok) {
          if (data?.message?.includes("déjà actif")) {
            setStatus("already");
            setMessage(data.message);
          } else {
            setStatus("success");
            setMessage(
              data?.message ?? "Votre compte a été réactivé avec succès !",
            );
          }
        } else {
          setStatus("error");
          setMessage(
            data?.message ?? "Le lien est invalide ou a expiré.",
          );
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Impossible de contacter le serveur.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a
          href="#"
          className="flex items-center gap-1 self-center font-medium"
        >
          <div className="text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <Image src="/logo.svg" alt="Tarna logo" width={24} height={24} />
          </div>
          Tarna
        </a>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {status === "no-token"
                ? "Récupération de compte"
                : "Réactivation du compte"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pt-2">
            {status === "no-token" && (
              <>
                <XCircle className="size-12 text-red-500" />
                <p className="text-sm text-center text-muted-foreground">
                  Aucun token de récupération trouvé. Veuillez utiliser le lien
                  reçu par email.
                </p>
                <Button asChild variant="outline" className="w-full mt-2">
                  <Link href="/login">Retour à la connexion</Link>
                </Button>
              </>
            )}

            {status === "loading" && (
              <>
                <Loader2 className="size-12 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Réactivation en cours…
                </p>
              </>
            )}

            {(status === "success" || status === "already") && (
              <>
                <CheckCircle2 className="size-12 text-green-500" />
                <p className="text-sm text-center">{message}</p>
                <p className="text-xs text-muted-foreground text-center">
                  Vous pouvez maintenant vous connecter avec vos identifiants
                  habituels.
                </p>
                <Button asChild className="w-full mt-2">
                  <Link href="/login">
                    <RotateCcw className="size-4 mr-1.5" />
                    Se connecter
                  </Link>
                </Button>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="size-12 text-red-500" />
                <p className="text-sm text-center text-red-600">{message}</p>
                <Button asChild variant="outline" className="w-full mt-2">
                  <Link href="/login">Retour à la connexion</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RecoverAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-muted flex min-h-svh items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <RecoverAccountContent />
    </Suspense>
  );
}
