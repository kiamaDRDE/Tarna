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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { loginAction, requestRecoveryAction, type LoginState } from "@/app/(Register)/actions";
import { useUserStore } from "@/src/store/userStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { Spinner } from "../ui/spinner";
import { toast } from "sonner";
import { Mail, RotateCcw } from "lucide-react";

const initialState: LoginState = { success: false, errors: {} };

export default function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const setUser = useUserStore((s) => s.setUser);
  const [state, setState] = useState<LoginState>(initialState);
  const [isPending, setIsPending] = useState(false);

  // Recovery dialog state
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [recoveryMaskedEmail, setRecoveryMaskedEmail] = useState("");
  const [recoveryStep, setRecoveryStep] = useState<"ask" | "sending" | "sent">("ask");
  const lastCredentials = useRef<{ identifier: string; password: string }>({
    identifier: "",
    password: "",
  });

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    setIsPending(true);
    setState(initialState);

    try {
      const formData = new FormData(e.currentTarget);
      // Save credentials for potential recovery request
      lastCredentials.current = {
        identifier: (formData.get("identifier") as string) ?? "",
        password: (formData.get("password") as string) ?? "",
      };
      const result = await loginAction(initialState, formData);
      setState(result);
    } catch {
      toast.error("Erreur réseau", {
        description: "Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.",
      });
    } finally {
      setIsPending(false);
    }
  }, [isPending]);

  // Handle recovery request
  const handleRecoveryRequest = useCallback(async () => {
    setRecoveryStep("sending");
    const result = await requestRecoveryAction(
      lastCredentials.current.identifier,
      lastCredentials.current.password,
    );
    if (result.success) {
      setRecoveryMaskedEmail(result.maskedEmail ?? recoveryMaskedEmail);
      setRecoveryStep("sent");
    } else {
      toast.error("Erreur", { description: result.error });
      setRecoveryStep("ask");
    }
  }, [recoveryMaskedEmail]);

  useEffect(() => {
    if (state.success && state.user && state.accessToken && state.refreshToken) {
      const u = state.user;
      
      setUser(
        {
          id: u.id,
          username: u.username,
          email: u.email,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          isVerified: u.isVerified,
          role: u.role,
          status: u.status,
          createdAt: u.createdAt,
          initials: (u.displayName ?? u.username)
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2),
          online: true,
        },
        state.accessToken,
        state.refreshToken,
      );
      toast.success("Connexion réussie", {
        description: `Bienvenue, ${u.displayName ?? u.username} !`,
      });
      router.push("/home");
    } else if (state.accountDeleted) {
      // Account is deleted — show recovery dialog
      setRecoveryMaskedEmail(state.maskedEmail ?? "");
      setRecoveryStep("ask");
      setShowRecoveryDialog(true);
    } else if (!state.success && Object.keys(state.errors).length > 0) {
      const firstError = state.errors.identifier ?? state.errors.password;
      toast.error("Erreur de connexion", {
        description: firstError ?? "Identifiants invalides.",
      });
    }
  }, [state, setUser, router]);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="identifier">Email ou nom d&apos;utilisateur</FieldLabel>
                <Input
                  id="identifier"
                  name="identifier"
                  type="text"
                  placeholder="email@exemple.com ou nom_utilisateur"
                  className={state.errors.identifier ? "border-red-500" : ""}
                />
                {state.errors.identifier && (
                  <p className="text-sm text-red-500">{state.errors.identifier}</p>
                )}
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    href="/forgot-password"
                    className="ml-auto text-sm underline-offset-4 hover:underline"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
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
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Spinner className="size-4" /> : "Login"}
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup">Sign up</Link>
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

      {/* Recovery Dialog */}
      <Dialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
        <DialogContent showCloseButton={recoveryStep !== "sending"}>
          {recoveryStep === "ask" && (
            <>
              <DialogHeader>
                <DialogTitle>Compte supprimé</DialogTitle>
                <DialogDescription>
                  Un compte associé à ces identifiants a été supprimé.
                  Souhaitez-vous le récupérer ?
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm text-muted-foreground text-center">
                Un email de vérification sera envoyé à{" "}
                <strong>{recoveryMaskedEmail}</strong> pour confirmer la
                réactivation.
              </p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowRecoveryDialog(false)}
                >
                  Annuler
                </Button>
                <Button onClick={handleRecoveryRequest}>
                  <RotateCcw className="size-4 mr-1.5" />
                  Récupérer mon compte
                </Button>
              </DialogFooter>
            </>
          )}

          {recoveryStep === "sending" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Spinner className="size-8" />
              <p className="text-sm text-muted-foreground">
                Envoi de l&apos;email de récupération…
              </p>
            </div>
          )}

          {recoveryStep === "sent" && (
            <>
              <DialogHeader>
                <DialogTitle>Email envoyé !</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-2">
                <Mail className="size-12 text-primary" />
                <p className="text-sm text-center">
                  Un email de confirmation a été envoyé à{" "}
                  <strong>{recoveryMaskedEmail}</strong>.
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  Cliquez sur le lien dans l&apos;email pour réactiver votre
                  compte. Vérifiez aussi votre dossier spam.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowRecoveryDialog(false)}
                >
                  Compris
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
