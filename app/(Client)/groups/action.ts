"use server";
import type {
  DetailedGroupResponse,
  GroupResponse,
  GroupRole,
  GroupVisibility,
  PaginatedGroupJoinRequestsResponse,
  PaginatedGroupMembersResponse,
  PaginatedGroupResponse,
} from "@/src/types/group";
import type { UserSearchResult } from "@/src/types/user";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.API_BASE_URL ?? "https://localhost";

type CreateGroupInput = {
  name: string;
  description?: string;
  visibility?: "public" | "private" | "secret";
  orgId?: string;
  memberIds?: string[];
};
export type CreateGroupState = {
  success: boolean;
  error: string | null;
  group: GroupResponse | null;
};

// ── Helpers ──────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value ?? null;
}

function emptyPage(): PaginatedGroupResponse {
  return {
    data: [],
    meta: { limit: 20, nextCursor: null, hasMore: false },
  };
}

/**
 * Appel générique vers un endpoint paginé de groupes.
 */
async function fetchGroups(
  path: string,
  cursor?: string | null,
): Promise<PaginatedGroupResponse> {
  const token = await getToken();
  if (!token) return emptyPage();

  const url = new URL(`${API_BASE_URL}${path}`);
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) return emptyPage();

  const json = (await res.json()) as {
    data?: GroupResponse[];
    meta?: PaginatedGroupResponse["meta"];
  };

  return {
    data: json.data ?? [],
    meta: json.meta ?? { limit: 20, nextCursor: null, hasMore: false },
  };
}

// ── Public server actions ────────────────────────────────────

/** Groupes dont l'utilisateur est membre actif. */
export async function fetchMyGroups(
  cursor?: string | null,
): Promise<PaginatedGroupResponse> {
  return fetchGroups("/groups/mine", cursor);
}

/** Groupes publics que l'utilisateur peut découvrir. */
export async function fetchDiscoverGroups(
  cursor?: string | null,
): Promise<PaginatedGroupResponse> {
  return fetchGroups("/groups/discover", cursor);
}

/** Demandes d'adhésion en attente. */
export async function fetchPendingGroups(
  cursor?: string | null,
): Promise<PaginatedGroupResponse> {
  return fetchGroups("/groups/pending", cursor);
}

/** Crée un nouveau groupe. */
export async function createGroup(
  input: CreateGroupInput,
): Promise<CreateGroupState> {
  const token = await getToken();
  if (!token) {
    return { success: false, error: "Non authentifié.", group: null };
  }
  try {
    const res = await fetch(`${API_BASE_URL}/groups`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...input,
        memberIds: input.memberIds?.length ? input.memberIds : undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return {
        success: false,
        error: data?.message ?? `Erreur (${res.status})`,
        group: null,
      };
    }

    const group = (await res.json()) as GroupResponse;
    return { success: true, error: null, group };
  } catch {
    return {
      success: false,
      error: "Échec de la création du groupe.",
      group: null,
    };
  }
}

// ── Join / Cancel ────────────────────────────────────────────

export type JoinRequestResult = {
  success: boolean;
  error: string | null;
};

/** Demander à rejoindre un groupe. */
export async function requestJoinGroup(
  groupId: string,
): Promise<JoinRequestResult> {
  const token = await getToken();
  if (!token) return { success: false, error: "Non authentifié." };

  try {
    const res = await fetch(`${API_BASE_URL}/groups/${groupId}/join`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return {
        success: false,
        error: data?.message ?? `Erreur (${res.status})`,
      };
    }

    return { success: true, error: null };
  } catch {
    return { success: false, error: "Échec de la demande." };
  }
}

/** Annuler sa demande d'adhésion en attente. */
export async function cancelGroupJoinRequest(
  groupId: string,
): Promise<JoinRequestResult> {
  const token = await getToken();
  if (!token) return { success: false, error: "Non authentifié." };

  try {
    const res = await fetch(`${API_BASE_URL}/groups/${groupId}/join`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return {
        success: false,
        error: data?.message ?? `Erreur (${res.status})`,
      };
    }

    return { success: true, error: null };
  } catch {
    return { success: false, error: "Échec de l'annulation." };
  }
}

/** Détail d'un groupe. */
export async function fetchDetailGroup(
  groupId: string,
): Promise<DetailedGroupResponse | null> {
  const token = await getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;

    const group = (await res.json()) as DetailedGroupResponse;
    return group;
  } catch {
    return null;
  }
}

// ── Recherche d'utilisateurs ─────────────────────────────────

/** Recherche des utilisateurs par nom/username (pour l'ajout de membres).
 *  Si orgId est fourni, ne retourne que les membres de cette organisation. */
export async function searchUsers(
  query: string,
  orgId?: string,
): Promise<UserSearchResult[]> {
  const token = await getToken();
  if (!token) return [];

  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    const url = new URL(`${API_BASE_URL}/users`);
    url.searchParams.set("search", trimmed);
    url.searchParams.set("limit", "10");
    if (orgId) url.searchParams.set("orgId", orgId);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return [];

    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        username: string;
        displayName: string | null;
        avatarUrl: string | null;
      }>;
    };

    return (json.data ?? []).map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
    }));
  } catch {
    return [];
  }
}

// ── Members ──────────────────────────────────────────────────

/** Liste paginée des membres d'un groupe. */
export async function fetchGroupMembers(
  groupId: string,
  cursor?: string | null,
): Promise<PaginatedGroupMembersResponse> {
  const token = await getToken();
  const empty: PaginatedGroupMembersResponse = {
    data: [],
    meta: { limit: 20, nextCursor: null, hasMore: false },
  };
  if (!token) return empty;

  try {
    const url = new URL(`${API_BASE_URL}/groups/${groupId}/members`);
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return empty;
    return (await res.json()) as PaginatedGroupMembersResponse;
  } catch {
    return empty;
  }
}

/** Ajouter un membre directement. */
export async function addGroupMember(
  groupId: string,
  userId: string,
  role?: GroupRole,
): Promise<JoinRequestResult> {
  const token = await getToken();
  if (!token) return { success: false, error: "Non authentifié." };

  try {
    const res = await fetch(`${API_BASE_URL}/groups/${groupId}/members`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return {
        success: false,
        error: data?.message ?? `Erreur (${res.status})`,
      };
    }
    return { success: true, error: null };
  } catch {
    return { success: false, error: "Échec de l'ajout." };
  }
}

/** Retirer un membre (ou quitter soi-même). */
export async function removeGroupMember(
  groupId: string,
  userId: string,
): Promise<JoinRequestResult> {
  const token = await getToken();
  if (!token) return { success: false, error: "Non authentifié." };

  try {
    const res = await fetch(
      `${API_BASE_URL}/groups/${groupId}/members/${userId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return {
        success: false,
        error: data?.message ?? `Erreur (${res.status})`,
      };
    }
    return { success: true, error: null };
  } catch {
    return { success: false, error: "Échec du retrait." };
  }
}

/** Modifier le rôle d'un membre. */
export async function updateGroupMemberRole(
  groupId: string,
  userId: string,
  role: GroupRole,
): Promise<JoinRequestResult> {
  const token = await getToken();
  if (!token) return { success: false, error: "Non authentifié." };

  try {
    const res = await fetch(
      `${API_BASE_URL}/groups/${groupId}/members/${userId}/role`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return {
        success: false,
        error: data?.message ?? `Erreur (${res.status})`,
      };
    }
    return { success: true, error: null };
  } catch {
    return { success: false, error: "Échec de la mise à jour." };
  }
}

// ── Join requests ────────────────────────────────────────────

/** Liste paginée des demandes d'adhésion en attente. */
export async function fetchGroupJoinRequests(
  groupId: string,
  cursor?: string | null,
): Promise<PaginatedGroupJoinRequestsResponse> {
  const token = await getToken();
  const empty: PaginatedGroupJoinRequestsResponse = {
    data: [],
    meta: { limit: 20, nextCursor: null, hasMore: false },
  };
  if (!token) return empty;

  try {
    const url = new URL(
      `${API_BASE_URL}/groups/${groupId}/join-requests`,
    );
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return empty;
    return (await res.json()) as PaginatedGroupJoinRequestsResponse;
  } catch {
    return empty;
  }
}

/** Accepter ou rejeter une demande d'adhésion. */
export async function handleGroupJoinRequest(
  groupId: string,
  requestId: string,
  decision: "accepted" | "rejected",
): Promise<JoinRequestResult> {
  const token = await getToken();
  if (!token) return { success: false, error: "Non authentifié." };

  try {
    const res = await fetch(
      `${API_BASE_URL}/groups/${groupId}/join-requests/${requestId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return {
        success: false,
        error: data?.message ?? `Erreur (${res.status})`,
      };
    }
    return { success: true, error: null };
  } catch {
    return { success: false, error: "Échec du traitement." };
  }
}

// ── Update / Archive ─────────────────────────────────────────

export type UpdateGroupInput = {
  name?: string;
  description?: string;
  visibility?: GroupVisibility;
};

/** Mettre à jour les infos d'un groupe. */
export async function updateGroup(
  groupId: string,
  input: UpdateGroupInput,
): Promise<JoinRequestResult> {
  const token = await getToken();
  if (!token) return { success: false, error: "Non authentifié." };

  try {
    const res = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return {
        success: false,
        error: data?.message ?? `Erreur (${res.status})`,
      };
    }
    return { success: true, error: null };
  } catch {
    return { success: false, error: "Échec de la mise à jour." };
  }
}

/** Archiver un groupe (owner uniquement). */
export async function archiveGroup(
  groupId: string,
): Promise<JoinRequestResult> {
  const token = await getToken();
  if (!token) return { success: false, error: "Non authentifié." };

  try {
    const res = await fetch(`${API_BASE_URL}/groups/${groupId}/archive`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return {
        success: false,
        error: data?.message ?? `Erreur (${res.status})`,
      };
    }
    return { success: true, error: null };
  } catch {
    return { success: false, error: "Échec de l'archivage." };
  }
}
