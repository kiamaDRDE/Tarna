"use server";

import type {
  Announcement,
  PaginatedAnnouncementsResponse,
  AnnouncementReadStats,
  PaginatedReadersResponse,
} from "@/src/types/announcement";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.API_BASE_URL ?? "https://localhost";

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value ?? null;
}

function emptyPage(): PaginatedAnnouncementsResponse {
  return {
    data: [],
    meta: { limit: 20, nextCursor: null, hasMore: false },
  };
}

// ── Fetch announcements for an org ──────────────────────────

export async function fetchOrgAnnouncements(
  orgId: string,
  cursor?: string | null,
  status?: "active" | "archived",
): Promise<PaginatedAnnouncementsResponse> {
  const token = await getToken();
  if (!token) return emptyPage();

  const url = new URL(
    `${API_BASE_URL}/organizations/${orgId}/announcements`,
  );
  if (cursor) url.searchParams.set("cursor", cursor);
  if (status) url.searchParams.set("status", status);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return emptyPage();
    return (await res.json()) as PaginatedAnnouncementsResponse;
  } catch {
    return emptyPage();
  }
}

// ── Fetch active announcements for rightbar ─────────────────

export async function fetchActiveAnnouncements(): Promise<Announcement[]> {
  const token = await getToken();
  if (!token) return [];

  try {
    const res = await fetch(`${API_BASE_URL}/announcements/active`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as Announcement[];
  } catch {
    return [];
  }
}

// ── Create announcement ─────────────────────────────────────

export type CreateAnnouncementInput = {
  orgId: string;
  title: string;
  contentText: string;
  scope?: "network" | "groups";
  delegateId?: string;
  groupIds?: string[];
  isPinned?: boolean;
  expiresAt?: string;
};

export type CreateAnnouncementResult = {
  success: boolean;
  error: string | null;
  announcement: Announcement | null;
};

export async function createAnnouncement(
  input: CreateAnnouncementInput,
): Promise<CreateAnnouncementResult> {
  const token = await getToken();
  if (!token) {
    return { success: false, error: "Non authentifié.", announcement: null };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/announcements`, {
      method: "POST",
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
        announcement: null,
      };
    }

    const announcement = (await res.json()) as Announcement;
    return { success: true, error: null, announcement };
  } catch {
    return {
      success: false,
      error: "Échec de la création de l'annonce.",
      announcement: null,
    };
  }
}

// ── Archive announcement ────────────────────────────────────

export type ActionResult = {
  success: boolean;
  error: string | null;
};

export async function archiveAnnouncement(id: string): Promise<ActionResult> {
  const token = await getToken();
  if (!token) return { success: false, error: "Non authentifié." };

  try {
    const res = await fetch(`${API_BASE_URL}/announcements/${id}/archive`, {
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

// ── Delete announcement ─────────────────────────────────────

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const token = await getToken();
  if (!token) return { success: false, error: "Non authentifié." };

  try {
    const res = await fetch(`${API_BASE_URL}/announcements/${id}`, {
      method: "DELETE",
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
    return { success: false, error: "Échec de la suppression." };
  }
}

// ── Mark as read ────────────────────────────────────────────

export async function markAnnouncementRead(id: string): Promise<ActionResult> {
  const token = await getToken();
  if (!token) return { success: false, error: "Non authentifié." };

  try {
    const res = await fetch(`${API_BASE_URL}/announcements/${id}/read`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return { success: false, error: "Erreur de marquage." };
    return { success: true, error: null };
  } catch {
    return { success: false, error: "Erreur réseau." };
  }
}

// ── Read stats ──────────────────────────────────────────────

export async function fetchReadStats(
  announcementId: string,
): Promise<AnnouncementReadStats | null> {
  const token = await getToken();
  if (!token) return null;

  try {
    const res = await fetch(
      `${API_BASE_URL}/announcements/${announcementId}/read-stats`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as AnnouncementReadStats;
  } catch {
    return null;
  }
}

// ── Fetch org groups (for targeting) ────────────────────────

export async function fetchOrgGroups(
  orgId: string,
): Promise<{ id: string; name: string }[]> {
  const token = await getToken();
  if (!token) return [];

  try {
    const url = new URL(`${API_BASE_URL}/groups`);
    url.searchParams.set("orgId", orgId);
    url.searchParams.set("limit", "100");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    const data = Array.isArray(json) ? json : json.data ?? [];
    return data.map((g: { id: string; name: string }) => ({
      id: g.id,
      name: g.name,
    }));
  } catch {
    return [];
  }
}

// ── Readers list ────────────────────────────────────────────

export async function fetchReaders(
  announcementId: string,
  cursor?: string | null,
): Promise<PaginatedReadersResponse> {
  const token = await getToken();
  const empty: PaginatedReadersResponse = {
    data: [],
    meta: { limit: 50, nextCursor: null, hasMore: false },
  };
  if (!token) return empty;

  try {
    const url = new URL(
      `${API_BASE_URL}/announcements/${announcementId}/readers`,
    );
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return empty;
    return (await res.json()) as PaginatedReadersResponse;
  } catch {
    return empty;
  }
}
