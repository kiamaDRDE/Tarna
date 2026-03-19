"use server";

import type { Conversation, Message } from "@/src/types/conversation";
import type { UserSearchResult } from "@/src/types/user";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.API_BASE_URL ?? "https://localhost";

// ── Helpers ──────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value ?? null;
}

async function chatFetch(
  path: string,
  options: RequestInit = {},
  tokenOverride?: string | null,
): Promise<Response> {
  const token = tokenOverride ?? (await getToken());
  if (!token) throw new Error("Non authentifié");

  return fetch(`${API_BASE_URL}/chat${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string> | undefined),
    },
    cache: "no-store",
  });
}

// ── Conversations ────────────────────────────────────────────

export async function fetchConversations(
  token?: string | null,
): Promise<Conversation[]> {
  try {
    const res = await chatFetch("/conversations", {}, token);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchConversation(
  conversationId: string,
  token?: string | null,
): Promise<Conversation | null> {
  try {
    const res = await chatFetch(`/conversations/${conversationId}`, {}, token);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function createConversation(input: {
  participantIds: string[];
  title?: string;
  estGroupe?: boolean;
  groupId?: string;
}): Promise<{ success: boolean; conversation?: Conversation; error?: string }> {
  try {
    const res = await chatFetch("/conversations", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        error: err.message ?? "Erreur lors de la création",
      };
    }
    const data = await res.json();
    return { success: true, conversation: data.conversation ?? data };
  } catch {
    return { success: false, error: "Erreur réseau" };
  }
}

export async function findOrCreateDm(
  participantId: string,
  token?: string | null,
): Promise<{ created: boolean; conversation: Conversation } | null> {
  try {
    const res = await chatFetch(
      "/conversations/dm",
      {
        method: "POST",
        body: JSON.stringify({ participantId }),
      },
      token,
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchGroupConversation(
  groupId: string,
  token?: string | null,
): Promise<Conversation | null> {
  try {
    const res = await chatFetch(
      `/conversations/group/${groupId}`,
      {},
      token,
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Messages ─────────────────────────────────────────────────

export async function fetchMessages(
  conversationId: string,
  cursor?: string | null,
  limit = 30,
  token?: string | null,
): Promise<{ messages: Message[]; hasMore: boolean; nextCursor: string | null }> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    const res = await chatFetch(
      `/messages/${conversationId}?${params}`,
      {},
      token,
    );
    if (!res.ok) return { messages: [], hasMore: false, nextCursor: null };
    const json = await res.json();
    return {
      messages: json.data ?? [],
      hasMore: json.hasMore ?? false,
      nextCursor: json.nextCursor ?? null,
    };
  } catch {
    return { messages: [], hasMore: false, nextCursor: null };
  }
}

export async function sendMessage(input: {
  conversationId: string;
  message: string;
  type?: string;
  fichierUrl?: string;
  fichierNom?: string;
}): Promise<{ success: boolean; data?: Message; error?: string }> {
  try {
    const res = await chatFetch("/messages", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message ?? "Erreur d'envoi" };
    }
    const data = await res.json();
    return { success: true, data };
  } catch {
    return { success: false, error: "Erreur réseau" };
  }
}

export async function markAllRead(
  conversationId: string,
): Promise<{ success: boolean }> {
  try {
    const res = await chatFetch(
      `/messages/conversation/${conversationId}/read-all`,
      { method: "POST" },
    );
    return { success: res.ok };
  } catch {
    return { success: false };
  }
}

// ── Search users ─────────────────────────────────────────────

export async function searchUsers(
  query: string,
  tokenOverride?: string | null,
): Promise<UserSearchResult[]> {
  const token = tokenOverride ?? (await getToken());
  if (!token || query.trim().length < 2) return [];
  try {
    const res = await fetch(
      `${API_BASE_URL}/users?search=${encodeURIComponent(query)}&limit=10`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.data ?? [];
  } catch {
    return [];
  }
}
