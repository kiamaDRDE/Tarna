"use server";

import { Post, ReceivePost } from "@/src/types/post";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.API_BASE_URL ?? "https://localhost";

export type FeedState = {
  posts: Post[];
  error: string | null;
  nextCursor: string | null;
  hasMore: boolean;
};

/**
 * Server action utilisée par useActionState (reçoit prevState + formData).
 * Lit le cursor + token depuis les champs cachés du formulaire.
 */
export async function fetchPostsAction(
  _prev: FeedState,
  formData: FormData,
): Promise<FeedState> {
  const cursor = (formData.get("cursor") as string) || null;
  const formToken = (formData.get("token") as string) || null;
  return fetchPosts(cursor, formToken);
}

/**
 * Appel direct (SSR) — utilisé dans le RSC pour le chargement initial.
 */
export async function fetchInitialPosts(options?: {
  orgId?: string;
  groupId?: string;
}): Promise<FeedState> {
  return fetchPosts(null, null, options);
}

/**
 * Appel direct depuis le client — pagination (cursor + token explicites).
 */
export async function fetchMorePosts(
  cursor: string | null,
  token: string | null,
  options?: { orgId?: string; groupId?: string },
): Promise<FeedState> {
  return fetchPosts(cursor, token, options);
}

async function fetchPosts(
  cursor: string | null,
  tokenOverride: string | null,
  options?: { orgId?: string; groupId?: string },
): Promise<FeedState> {
  // Prefer the token passed explicitly (fresh from Zustand store);
  // fall back to the HTTP-only cookie (set at login).
  let token = tokenOverride;
  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get("access_token")?.value ?? null;
  }

  if (!token) {
    return {
      posts: [],
      error: "Not authenticated.",
      nextCursor: null,
      hasMore: false,
    };
  }

  try {
    const url = new URL(`${API_BASE_URL}/posts`);
    if (cursor) url.searchParams.set("cursor", cursor);
    if (options?.orgId) url.searchParams.set("orgId", options.orgId);
    if (options?.groupId) url.searchParams.set("groupId", options.groupId);
    const res = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return {
        posts: [],
        error: data?.message ?? `Request failed (${res.status})`,
        nextCursor: null,
        hasMore: false,
      };
    }

    const json = await res.json();
    const rawPosts = Array.isArray(json)
      ? json
      : (json.data ?? json.posts ?? []);

    const posts: Post[] = rawPosts.map((p: ReceivePost) => {
      const displayName: string =
        p.author?.displayName ?? p.author?.username ?? "Unknown";
      const initials = displayName
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      const now = Date.now();
      const created = new Date(p.createdAt).getTime();
      const diffH = Math.floor((now - created) / (1000 * 60 * 60));
      const timeAgo =
        diffH < 1
          ? "now"
          : diffH < 24
            ? `${diffH}h`
            : `${Math.floor(diffH / 24)}d`;

      return {
        id: p.id,
        authorId: p.authorId ?? p.author?.id,
        orgId: p.orgId ?? null,
        groupId: p.groupId ?? null,
        parentPostId: p.parentPostId ?? null,
        author: {
          id: p.author?.id,
          name: displayName,
          username: p.author?.username ?? "",
          avatar: p.author?.avatarUrl ?? "",
          initials,
          isVerified: p.author?.isVerified ?? false,
        },
        organization: {
          id: p.organization?.id,
          name: p.organization?.name,
          logoUrl: p.organization?.logoUrl ?? null,
          sector: p.organization?.sector,
        },
        content: p.contentText ?? p.content ?? "",
        visibility: p.visibility ?? "public",
        isPinned: p.isPinned ?? false,
        isEdited: p.isEdited ?? false,
        commentsEnabled: p.commentsEnabled ?? true,
        sharesEnabled: p.sharesEnabled ?? true,
        media: p.media ?? [],
        reactions: p.reactions ?? {
          heart: p.stats?.reactions_count ?? 0,
          lightbulb: 0,
          handshake: 0,
        },
        images: p.images ?? [],
        files: p.files ?? [],
        stats: p.stats ?? {
          likes_count: 0,
          views_count: 0,
          shares_count: 0,
          comments_count: 0,
          supports_count: 0,
          reactions_count: 1,
          illuminates_count: 0,
        },
        comments: p._count?.comments ?? 0,
        shares: p.stats?.shares_count ?? p.shares ?? 0,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        timeAgo,
        myReaction: p.myReaction ?? null,
      };
    });

    return {
      posts,
      error: null,
      nextCursor: json.meta?.nextCursor ?? null,
      hasMore: json.meta?.hasMore ?? false,
    };
  } catch {
    return {
      posts: [],
      error: "Failed to fetch posts.",
      nextCursor: null,
      hasMore: false,
    };
  }
}

// ---------- Create Post ----------
export type CreatePostState = {
  success: boolean;
  error: string | null;
  post: Post | null;
};

export async function createPostAction(
  _prev: CreatePostState,
  formData: FormData,
  _isOrg: boolean,
  orgId?: string,
  groupId?: string,
): Promise<CreatePostState> {
  const token = formData.get("token") as string;
  const authorId = formData.get("authorId") as string;
  const contentText = (formData.get("contentText") as string) ?? "";
  const visibility = (formData.get("visibility") as string) ?? "public";

  if (!token) {
    return { success: false, error: "Not authenticated.", post: null };
  }

  if (!contentText.trim()) {
    return { success: false, error: "Content cannot be empty.", post: null };
  }

  // fichiers reçus depuis le form client
  const images = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const doc = formData.get("files");
  const document = doc instanceof File && doc.size > 0 ? doc : null;

  const payload = new FormData();
  payload.append("authorId", authorId);
  payload.append("contentText", contentText);
  payload.append("visibility", visibility);
  if (orgId) {
    payload.append("orgId", orgId);
  }
  if (groupId) {
    payload.append("groupId", groupId);
  }

  // multer.array("images")
  for (const image of images) {
    payload.append("images", image, image.name);
  }

  if (document) {
    payload.append("files", document, document.name);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: payload,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return {
        success: false,
        error: data?.message ?? `Request failed (${res.status})`,
        post: null,
      };
    }

    const p = await res.json();
    const displayName: string =
      p.author?.displayName ?? p.author?.username ?? "Unknown";
    const initials = displayName
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const post: Post = {
      id: p.id,
      authorId: p.authorId ?? p.author?.id,
      orgId: p.orgId ?? null,
      groupId: p.groupId ?? null,
      parentPostId: p.parentPostId ?? null,
      author: {
        id: p.author?.id,
        name: displayName,
        username: p.author?.username ?? "",
        avatar: p.author?.avatarUrl ?? "",
        initials,
        isVerified: p.author?.isVerified ?? false,
      },
      content: p.contentText ?? "",
      visibility: p.visibility ?? "public",
      isPinned: p.isPinned ?? false,
      isEdited: p.isEdited ?? false,
      commentsEnabled: p.commentsEnabled ?? true,
      sharesEnabled: p.sharesEnabled ?? true,
      media: p.media ?? [],
      reactions: { heart: 0, lightbulb: 0, handshake: 0 },
      images: p.images ?? [],
      files: p.files ?? [],
      stats: p.stats ?? {
        likes_count: 0,
        views_count: 0,
        shares_count: 0,
        comments_count: 0,
        supports_count: 0,
        reactions_count: 1,
        illuminates_count: 0,
      },
      organization: {
        id: p.organization?.id,
        name: p.organization?.name ?? "",
        logoUrl: p.organization?.logoUrl ?? "",
        sector: p.organization?.sector ?? "",
      },
      comments: 0,
      shares: 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      timeAgo: "now",
    };

    return { success: true, error: null, post };
  } catch {
    return { success: false, error: "Failed to create post.", post: null };
  }
}

export async function deletePost(_id: string) {
  void _id;
  // TODO: implement server-side post deletion
}
