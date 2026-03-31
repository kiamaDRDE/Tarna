import { create } from "zustand";
import { Announcement } from "../types/announcement";

type AnnouncementState = {
  announcements: Announcement[];
  loading: boolean;
  error: string | null;
  nextCursor: string | null;
  hasMore: boolean;

  setAnnouncements: (
    items: Announcement[],
    nextCursor?: string | null,
    hasMore?: boolean,
  ) => void;
  appendAnnouncements: (
    items: Announcement[],
    nextCursor?: string | null,
    hasMore?: boolean,
  ) => void;
  addAnnouncement: (item: Announcement) => void;
  removeAnnouncement: (id: string) => void;
  updateAnnouncement: (id: string, data: Partial<Announcement>) => void;
  markAsRead: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
};

export const useAnnouncementStore = create<AnnouncementState>()((set) => ({
  announcements: [],
  loading: false,
  error: null,
  nextCursor: null,
  hasMore: false,

  setAnnouncements: (items, nextCursor = null, hasMore = false) =>
    set({ announcements: items, error: null, nextCursor, hasMore }),

  appendAnnouncements: (newItems, nextCursor = null, hasMore = false) =>
    set((state) => {
      const existingIds = new Set(state.announcements.map((a) => a.id));
      const unique = newItems.filter((a) => !existingIds.has(a.id));
      return {
        announcements: [...state.announcements, ...unique],
        nextCursor,
        hasMore,
      };
    }),

  addAnnouncement: (item) =>
    set((state) => {
      if (state.announcements.some((a) => a.id === item.id)) return state;
      return { announcements: [item, ...state.announcements] };
    }),

  removeAnnouncement: (id) =>
    set((state) => ({
      announcements: state.announcements.filter((a) => a.id !== id),
    })),

  updateAnnouncement: (id, data) =>
    set((state) => ({
      announcements: state.announcements.map((a) =>
        a.id === id ? { ...a, ...data } : a,
      ),
    })),

  markAsRead: (id) =>
    set((state) => ({
      announcements: state.announcements.map((a) =>
        a.id === id ? { ...a, isRead: true } : a,
      ),
    })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
