import { create } from "zustand";

export interface AdminPost {
  id: string;
  authorId: string;
  orgId: string | null;
  groupId: string | null;
  contentText: string | null;
  visibility: string;
  isPinned: boolean;
  isEdited: boolean;
  commentsEnabled: boolean;
  sharesEnabled: boolean;
  images: string[];
  files: unknown[];
  stats: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  organization: {
    id: string;
    name: string;
    logoUrl: string | null;
    sector: string | null;
  } | null;
  _count: { comments: number };
}

type AdminPostState = {
  posts: AdminPost[];
  loading: boolean;
  nextCursor: string | null;
  hasMore: boolean;

  setPosts: (posts: AdminPost[], nextCursor?: string | null, hasMore?: boolean) => void;
  appendPosts: (posts: AdminPost[], nextCursor?: string | null, hasMore?: boolean) => void;
  removePost: (postId: string) => void;
  setLoading: (loading: boolean) => void;
};

export const useAdminPostStore = create<AdminPostState>()((set) => ({
  posts: [],
  loading: false,
  nextCursor: null,
  hasMore: false,

  setPosts: (posts, nextCursor = null, hasMore = false) =>
    set({ posts, nextCursor, hasMore }),

  appendPosts: (newPosts, nextCursor = null, hasMore = false) =>
    set((state) => {
      const existingIds = new Set(state.posts.map((p) => p.id));
      const unique = newPosts.filter((p) => !existingIds.has(p.id));
      return { posts: [...state.posts, ...unique], nextCursor, hasMore };
    }),

  removePost: (postId) =>
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== postId),
    })),

  setLoading: (loading) => set({ loading }),
}));
