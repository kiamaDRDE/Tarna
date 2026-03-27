import { create } from "zustand";
import { AuditLog } from "../types/audit";

type AuditLogState = {
  logs: AuditLog[];
  loading: boolean;
  nextCursor: string | null;
  hasMore: boolean;
  selectedLog: AuditLog | null;
  eventFilter: string | null;

  setLogs: (logs: AuditLog[], nextCursor?: string | null, hasMore?: boolean) => void;
  appendLogs: (logs: AuditLog[], nextCursor?: string | null, hasMore?: boolean) => void;
  addLog: (log: AuditLog) => void;
  setSelectedLog: (log: AuditLog | null) => void;
  setEventFilter: (event: string | null) => void;
  setLoading: (loading: boolean) => void;
};

export const useAuditLogStore = create<AuditLogState>()((set) => ({
  logs: [],
  loading: false,
  nextCursor: null,
  hasMore: false,
  selectedLog: null,
  eventFilter: null,

  setLogs: (logs, nextCursor = null, hasMore = false) =>
    set({ logs, nextCursor, hasMore }),

  appendLogs: (newLogs, nextCursor = null, hasMore = false) =>
    set((state) => {
      const existingIds = new Set(state.logs.map((l) => l.id));
      const unique = newLogs.filter((l) => !existingIds.has(l.id));
      return { logs: [...state.logs, ...unique], nextCursor, hasMore };
    }),

  addLog: (log) =>
    set((state) => {
      if (state.logs.some((l) => l.id === log.id)) return state;
      return { logs: [log, ...state.logs] };
    }),

  setSelectedLog: (log) => set({ selectedLog: log }),
  setEventFilter: (event) => set({ eventFilter: event }),
  setLoading: (loading) => set({ loading }),
}));
