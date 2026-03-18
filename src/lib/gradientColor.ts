// 1) Palette de dÃ©gradÃ©s (Tailwind)
const GRADIENT_FALLBACKS = [
  "bg-linear-to-r from-emerald-600 to-teal-700",
  "bg-linear-to-r from-indigo-600 to-fuchsia-600",
  "bg-linear-to-r from-sky-600 to-cyan-600",
  "bg-linear-to-r from-rose-500 to-orange-500",
  "bg-linear-to-r from-amber-500 to-red-600",
  "bg-linear-to-r from-lime-600 to-emerald-700",
] as const;

// 2) Choix stable depuis une string (id, nom, etc.)
export function getGradientFallback(seed?: string) {
  if (!seed) return GRADIENT_FALLBACKS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return GRADIENT_FALLBACKS[hash % GRADIENT_FALLBACKS.length];
}
