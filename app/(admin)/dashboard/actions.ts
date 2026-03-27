"use server";
import { FetchUser, User } from "@/src/types/user";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.API_BASE_URL ?? "https://localhost";

export type UserState = {
  users: FetchUser[];
  error: string | null;
  nextCursor: string | null;
  hasMore: boolean;
};

// export async function fetchPostsAction(): Promise<FeedState> {
export async function fetchUsersAction(): Promise<UserState> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value ?? null;

  if (!token) {
    return {
      users: [],
      error: "Not authenticated.",
      nextCursor: null,
      hasMore: false,
    };
  }

  try {
    const url = new URL(`${API_BASE_URL}/users`);
    // if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return {
        users: [],
        error: data?.message ?? `Request failed (${res.status})`,
        nextCursor: null,
        hasMore: false,
      };
    }
    const json = await res.json();
    const rawPosts = Array.isArray(json)
      ? json
      : (json.data ?? json.posts ?? []);

    // // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const users: FetchUser[] = rawPosts.map((p: User) => {
      return {
        id: p.id,
        userName: p.username,
        fullName: p.displayName ?? p.username,
        email: p.email,
        role: p.role ?? "user",
        status: p.status ?? "active",
      };
    });

    return {
      users,
      error: null,
      nextCursor: json.meta?.nextCursor ?? null,
      hasMore: json.meta?.hasMore ?? false,
    };
  } catch {
    return {
      users: [],
      error: "Failed to fetch posts.",
      nextCursor: null,
      hasMore: false,
    };
  }
}
