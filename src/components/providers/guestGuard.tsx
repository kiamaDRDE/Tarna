"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/src/store/userStore";
import { useStoreHydrated } from "@/src/hooks/useStoreHydrated";
import type { TokenValidationResponse } from "@/app/api/validate-token/route";

async function validateTokenServer(
  token: string,
): Promise<TokenValidationResponse> {
  try {
    const res = await fetch("/api/validate-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return { valid: false, expired: false };
    return (await res.json()) as TokenValidationResponse;
  } catch {
    return { valid: false, expired: false };
  }
}

/**
 * Protège les routes publiques (login, signup).
 * Redirige vers /home seulement si le token est réellement valide.
 * Si le token est expiré et le refresh échoue, on nettoie l'état et on affiche la page.
 */
export default function GuestGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const accessToken = useUserStore((s) => s.accessToken);
  const refreshToken = useUserStore((s) => s.refreshToken);
  const setTokens = useUserStore((s) => s.setTokens);
  const logout = useUserStore((s) => s.logout);
  const router = useRouter();
  const hydrated = useStoreHydrated();
  const [checked, setChecked] = useState(false);

  const tryRefresh = useCallback(async (): Promise<boolean> => {
    if (!refreshToken) return false;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost"}/auth/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        },
      );
      if (!res.ok) return false;
      const data = await res.json();
      setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }, [refreshToken, setTokens]);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!hydrated) return;

      // Not authenticated → show guest page
      if (!isAuthenticated || !accessToken) {
        setChecked(true);
        return;
      }

      // Validate the persisted token
      const result = await validateTokenServer(accessToken);
      if (cancelled) return;

      if (result.valid) {
        // Token is actually valid → redirect to /home
        router.replace("/home");
        return;
      }

      if (result.expired) {
        // Try refresh
        const refreshed = await tryRefresh();
        if (cancelled) return;

        if (refreshed) {
          router.replace("/home");
        } else {
          // Refresh failed → clear stale auth state, show login/signup
          logout();
          setChecked(true);
        }
        return;
      }

      // Invalid token → clear stale state, show login/signup
      logout();
      setChecked(true);
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [hydrated, isAuthenticated, accessToken, router, logout, tryRefresh]);

  if (!checked) return null;

  return <>{children}</>;
}
