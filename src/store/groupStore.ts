import { create } from "zustand";
import type {
  GroupResponse,
  PaginatedGroupResponse,
} from "../types/group";

type TabKey = "my-groups" | "discover" | "pending";

type TabState = {
  data: GroupResponse[];
  nextCursor: string | null;
  hasMore: boolean;
  loaded: boolean;
};

function emptyTab(): TabState {
  return { data: [], nextCursor: null, hasMore: false, loaded: false };
}

type GroupState = {
  tabs: Record<TabKey, TabState>;
  loading: boolean;
  error: string | null;

  // ── Actions ────────────────────────────────────────────────

  /** Remplace les données d'un onglet (fetch initial). */
  setTab: (tab: TabKey, page: PaginatedGroupResponse) => void;

  /** Ajoute des données à un onglet (pagination / infinite scroll). */
  appendTab: (tab: TabKey, page: PaginatedGroupResponse) => void;

  /** Ajoute un groupe en tête d'un onglet (création / WS). */
  addGroup: (tab: TabKey, group: GroupResponse) => void;

  /** Retire un groupe d'un onglet. */
  removeGroup: (tab: TabKey, groupId: string) => void;

  /** Met à jour partiellement un groupe dans tous les onglets. */
  updateGroup: (groupId: string, data: Partial<GroupResponse>) => void;

  /** Déplace un groupe d'un onglet à un autre (ex: pending → my-groups). */
  moveGroup: (from: TabKey, to: TabKey, groupId: string) => void;

  /** Marque un onglet comme non chargé (force un refresh). */
  invalidateTab: (tab: TabKey) => void;

  /** Réinitialise tout le store. */
  reset: () => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
};

const initialTabs: Record<TabKey, TabState> = {
  "my-groups": emptyTab(),
  discover: emptyTab(),
  pending: emptyTab(),
};

export const useGroupStore = create<GroupState>()((set) => ({
  tabs: { ...initialTabs },
  loading: false,
  error: null,

  // ── Setters ────────────────────────────────────────────────

  setTab: (tab, page) =>
    set((state) => ({
      tabs: {
        ...state.tabs,
        [tab]: {
          data: page.data,
          nextCursor: page.meta.nextCursor,
          hasMore: page.meta.hasMore,
          loaded: true,
        },
      },
      error: null,
    })),

  appendTab: (tab, page) =>
    set((state) => {
      const existing = state.tabs[tab];
      const existingIds = new Set(existing.data.map((g) => g.id));
      const unique = page.data.filter((g) => !existingIds.has(g.id));
      return {
        tabs: {
          ...state.tabs,
          [tab]: {
            data: [...existing.data, ...unique],
            nextCursor: page.meta.nextCursor,
            hasMore: page.meta.hasMore,
            loaded: true,
          },
        },
      };
    }),

  addGroup: (tab, group) =>
    set((state) => {
      const existing = state.tabs[tab];
      if (existing.data.some((g) => g.id === group.id)) return state;
      return {
        tabs: {
          ...state.tabs,
          [tab]: { ...existing, data: [group, ...existing.data] },
        },
      };
    }),

  removeGroup: (tab, groupId) =>
    set((state) => {
      const existing = state.tabs[tab];
      return {
        tabs: {
          ...state.tabs,
          [tab]: {
            ...existing,
            data: existing.data.filter((g) => g.id !== groupId),
          },
        },
      };
    }),

  updateGroup: (groupId, data) =>
    set((state) => {
      const updatedTabs = { ...state.tabs };
      for (const key of Object.keys(updatedTabs) as TabKey[]) {
        const tab = updatedTabs[key];
        if (tab.data.some((g) => g.id === groupId)) {
          updatedTabs[key] = {
            ...tab,
            data: tab.data.map((g) =>
              g.id === groupId ? { ...g, ...data } : g,
            ),
          };
        }
      }
      return { tabs: updatedTabs };
    }),

  moveGroup: (from, to, groupId) =>
    set((state) => {
      const fromTab = state.tabs[from];
      const toTab = state.tabs[to];
      const group = fromTab.data.find((g) => g.id === groupId);
      if (!group) return state;
      return {
        tabs: {
          ...state.tabs,
          [from]: {
            ...fromTab,
            data: fromTab.data.filter((g) => g.id !== groupId),
          },
          [to]: {
            ...toTab,
            data: [group, ...toTab.data.filter((g) => g.id !== groupId)],
          },
        },
      };
    }),

  invalidateTab: (tab) =>
    set((state) => ({
      tabs: {
        ...state.tabs,
        [tab]: { ...state.tabs[tab], loaded: false },
      },
    })),

  reset: () => set({ tabs: { ...initialTabs }, loading: false, error: null }),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
