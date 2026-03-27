import { create } from "zustand";
import { FetchUser } from "../types/user";

type UsersAllState = {
  /** Utilisateurs de l'application */
  users: FetchUser[];
  /** Chargement en cours */
  loading: boolean;
  /** Message d'erreur éventuel */
  error: string | null;
  /** Curseur pour la page suivante */
  nextCursor: string | null;
  /** Il reste des utilisateurs à charger */
  hasMore: boolean;

  // ── Actions ──────────────────────────────────────────────────
  /** Remplace tous les utilisateurs (après fetch initial) */
  setUsers: (
    users: FetchUser[],
    nextCursor?: string | null,
    hasMore?: boolean,
  ) => void;
  /** Ajoute des utilisateurs en fin de liste (pagination) — dédupliqués */
  //   appendUsers: (users: FetchUser[], nextCursor?: string | null, hasMore?: boolean) => void;
  /** Ajoute un utilisateur en tête (nouvel utilisateur / WS) — dédupliqué */
  //   addUser: (user: FetchUser) => void;
  /** Retire un utilisateur par id (suppression locale / WS) */
  //   removeUser: (userId: string) => void;
  /** Met à jour partiellement un utilisateur existant */
  //   updateUser: (userId: string, data: Partial<FetchUser>) => void;
  //   setLoading: (loading: boolean) => void;
  //   setError: (error: string | null) => void;
};

export const useAllUsersStore = create<UsersAllState>()((set) => ({
  users: [],
  loading: false,
  error: null,
  nextCursor: null,
  hasMore: false,

  setUsers: (users, nextCursor = null, hasMore = false) =>
    set({ users, error: null, nextCursor, hasMore }),

  //   appendUsers: (newUsers, nextCursor = null, hasMore = false) =>
  //     set((state) => {
  //       const existingIds = new Set(state.users.map((p) => p.id));
  //       const unique = newUsers.filter((p) => !existingIds.has(p.id));
  //       return { users: [...state.users, ...unique], nextCursor, hasMore };
  //     }),

  //   addUsers: (user) =>
  //     set((state) => {
  //       // Éviter les doublons
  //       if (state.users.some((p) => p.id === user.id)) return state;
  //       return { users: [user, ...state.users] };
  //     }),

  //   removeUsers: (userId) =>
  //     set((state) => ({
  //       users: state.users.filter((p) => p.id !== userId),
  //     })),

  //   updateUsers: (userId, data) =>
  //     set((state) => ({
  //       users: state.users.map((p) =>
  //         p.id === userId ? { ...p, ...data } : p,
  //       ),
  //     })),

  //   setLoading: (loading) => set({ loading }),
  //   setError: (error) => set({ error }),
}));
