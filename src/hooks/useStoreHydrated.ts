import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Retourne true une fois côté client (après hydratation SSR),
 * ce qui garantit que le store Zustand persisté a fini de lire localStorage.
 * Évite les faux redirects au refresh de page.
 */
export function useStoreHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,   // client snapshot
    () => false,   // server snapshot
  );
}
