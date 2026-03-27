import { create } from "zustand";
import type { Conversation, Message } from "../types/conversation";

type ConversationState = {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  typingUsers: Record<string, string[]>;

  setConversations: (convs: Conversation[]) => void;
  addConversation: (conv: Conversation) => void;
  updateConversation: (conv: Partial<Conversation> & { id: string }) => void;

  setMessages: (conversationId: string, msgs: Message[]) => void;
  addMessage: (conversationId: string, msg: Message) => void;
  prependMessages: (conversationId: string, msgs: Message[]) => void;

  setTypingUser: (conversationId: string, userId: string) => void;
  clearTypingUser: (conversationId: string, userId: string) => void;

  markConversationRead: (conversationId: string) => void;
  markMessagesRead: (conversationId: string, messageIds: string[]) => void;
  updateMessage: (conversationId: string, messageId: string, patch: Partial<Message>) => void;
};

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  messages: {},
  typingUsers: {},

  setConversations: (convs) => {
    // Deduplicate by id
    const seen = new Set<string>();
    const unique = convs.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    set({ conversations: unique });
  },

  addConversation: (conv) =>
    set((s) => {
      if (s.conversations.some((c) => c.id === conv.id)) return s;
      return { conversations: [conv, ...s.conversations] };
    }),

  updateConversation: (conv) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conv.id ? { ...c, ...conv } : c,
      ),
    })),

  setMessages: (conversationId, msgs) =>
    set((s) => ({
      messages: { ...s.messages, [conversationId]: msgs },
    })),

  addMessage: (conversationId, msg) =>
    set((s) => {
      const existing = s.messages[conversationId] ?? [];
      // Prevent duplicates
      if (existing.some((m) => m.id === msg.id)) return s;
      return {
        messages: {
          ...s.messages,
          [conversationId]: [...existing, msg],
        },
      };
    }),

  prependMessages: (conversationId, msgs) =>
    set((s) => {
      const existing = s.messages[conversationId] ?? [];
      const existingIds = new Set(existing.map((m) => m.id));
      const newMsgs = msgs.filter((m) => !existingIds.has(m.id));
      return {
        messages: {
          ...s.messages,
          [conversationId]: [...newMsgs, ...existing],
        },
      };
    }),

  setTypingUser: (conversationId, userId) =>
    set((s) => {
      const current = s.typingUsers[conversationId] ?? [];
      if (current.includes(userId)) return s;
      return {
        typingUsers: {
          ...s.typingUsers,
          [conversationId]: [...current, userId],
        },
      };
    }),

  clearTypingUser: (conversationId, userId) =>
    set((s) => ({
      typingUsers: {
        ...s.typingUsers,
        [conversationId]: (s.typingUsers[conversationId] ?? []).filter(
          (id) => id !== userId,
        ),
      },
    })),

  markConversationRead: (conversationId) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, nonLus: 0 } : c,
      ),
    })),

  markMessagesRead: (conversationId, messageIds) =>
    set((s) => {
      const msgs = s.messages[conversationId];
      if (!msgs) return s;
      const idSet = new Set(messageIds);
      return {
        messages: {
          ...s.messages,
          [conversationId]: msgs.map((m) =>
            idSet.has(m.id) ? { ...m, status: "read" as const } : m,
          ),
        },
      };
    }),

  updateMessage: (conversationId, messageId, patch) =>
    set((s) => {
      const msgs = s.messages[conversationId];
      if (!msgs) return s;
      return {
        messages: {
          ...s.messages,
          [conversationId]: msgs.map((m) =>
            m.id === messageId ? { ...m, ...patch } : m,
          ),
        },
      };
    }),
}));
