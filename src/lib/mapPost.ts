import { Post } from "@/src/types/post";

/**
 * Transforme un post brut de l'API / WebSocket en Post frontend.
 * Réutilisable partout (server actions, WS events, etc.).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapRawPost(p: any): Post {
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
    diffH < 1 ? "now" : diffH < 24 ? `${diffH}h` : `${Math.floor(diffH / 24)}d`;

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
    organization: p.organization ?? null,
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
      views_count: 0,
      shares_count: 0,
      comments_count: 0,
      reactions_count: 0,
    },
    comments: p.stats?.comments_count ?? p.comments ?? 0,
    shares: p.stats?.shares_count ?? p.shares ?? 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    timeAgo,
  };
}
