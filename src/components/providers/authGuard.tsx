"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/src/store/userStore";
import { useStoreHydrated } from "@/src/hooks/useStoreHydrated";
import type { TokenValidationResponse } from "@/app/api/validate-token/route";

/**
 * Protège les routes authentifiées.
 * Valide le token côté serveur via /api/validate-token.
 * Si le token est expiré, tente un refresh puis logout si échec.
 */

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

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const user = useUserStore((s) => s.user);
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
      // Wait for Zustand persist hydration before checking
      if (!hydrated) return;

      // Not authenticated at all → go to login
      if (!isAuthenticated || !accessToken) {
        router.replace("/login");
        return;
      }

      // Validate the access token server-side
      const result = await validateTokenServer(accessToken);

      if (cancelled) return;

      if (result.valid) {
        // Token is valid – check role
        const role = user?.role;
        if (role === "admin" || role === "user" || role === "moderator") {
          setChecked(true);
        } else {
          logout();
          router.replace("/login");
        }
        return;
      }

      if (result.expired) {
        console.warn("[AuthGuard] Access token expired, attempting refresh…");

        const refreshed = await tryRefresh();
        if (cancelled) return;

        if (refreshed) {
          // New tokens are stored – re-run the guard on next render
          setChecked(true);
        } else {
          console.warn("[AuthGuard] Refresh failed – logging out");
          logout();
          router.replace("/login");
        }
        return;
      }

      // Token is invalid (bad signature, malformed, etc.)
      console.warn("[AuthGuard] Invalid token - logging out");
      logout();
      router.replace("/login");
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [hydrated, isAuthenticated, accessToken, user?.role, router, logout, tryRefresh]);

  if (!checked) return null;

  return <>{children}</>;
}
