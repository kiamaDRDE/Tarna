"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchGroupConversation,
  fetchMessages,
  sendMessage,
  markAllRead,
} from "@/app/(Client)/messages/action";
import type { Conversation, Message } from "@/src/types/conversation";
import { useConversationStore } from "@/src/store/conversationStore";
import { useUserStore } from "@/src/store/userStore";
import { useSocket } from "@/src/components/providers/socketProvider";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Spinner } from "@/src/components/ui/spinner";
import { getInitials } from "@/src/lib/getInitials";
import { getAvatarFallbackColor } from "@/src/lib/avatarColor";
import { Check, CheckCheck, Clock, Send } from "lucide-react";
import { toast } from "sonner";

type Props = {
  groupId: string;
  groupName: string;
};

const GroupChatView = ({ groupId, groupName }: Props) => {
  const userId = useUserStore((s) => s.user?.id) ?? "";
  const accessToken = useUserStore((s) => s.accessToken);
  const socket = useSocket();

  const {
    messages,
    typingUsers,
    setMessages,
    addMessage,
    prependMessages,
    setTypingUser,
    clearTypingUser,
    markMessagesRead,
    updateMessage,
  } = useConversationStore();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [msgInput, setMsgInput] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ── Message queue ──────────────────────────────────────────
  const messageQueueRef = useRef<{ tempId: string; conversationId: string; text: string }[]>([]);
  const processingQueueRef = useRef(false);

  const convId = conversation?.id;
  const currentMessages = convId ? (messages[convId] ?? []) : [];
  const currentTyping = convId ? (typingUsers[convId] ?? []) : [];

  // ── Load or create group conversation ─────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const conv = await fetchGroupConversation(groupId, accessToken);
      if (!cancelled) {
        setConversation(conv);
        if (conv) {
          // Load messages
          setLoadingMsgs(true);
          const data = await fetchMessages(conv.id, null, 30, accessToken);
          setMessages(conv.id, data.messages);
          setHasMore(data.hasMore);
          setNextCursor(data.nextCursor);
          setLoadingMsgs(false);
          void markAllRead(conv.id);
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId, accessToken, setMessages]);

  // ── Join conversation room ─────────────────────────────────

  useEffect(() => {
    if (!socket || !convId) return;
    socket.emit("join_conversation", { conversationId: convId });
  }, [socket, convId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages.length]);

  // ── Socket events ──────────────────────────────────────────

  useEffect(() => {
    if (!socket || !convId) return;

    const handleNewMessage = (msg: Message) => {
      if (msg.conversationId !== convId) return;
      // Skip addMessage for own messages — we already have the optimistic version
      if (msg.expediteurId !== userId) {
        addMessage(convId, msg);
      }
      if (msg.expediteurId !== userId) {
        void markAllRead(convId);
      }
    };

    const handleTyping = (data: {
      conversationId: string;
      userId: string;
      username: string;
    }) => {
      if (data.conversationId !== convId || data.userId === userId) return;
      const key = `${data.conversationId}:${data.username}`;
      const existing = typingClearTimers.current.get(key);
      if (existing) clearTimeout(existing);
      setTypingUser(convId, data.username);
      const timer = setTimeout(() => {
        clearTypingUser(convId, data.username);
        typingClearTimers.current.delete(key);
      }, 1000);
      typingClearTimers.current.set(key, timer);
    };

    const handleMessagesRead = (data: {
      conversationId: string;
      messageIds: string[];
      userId: string;
    }) => {
      if (data.conversationId !== convId || data.userId === userId) return;
      markMessagesRead(convId, data.messageIds);
    };

    socket.on("nouveau_message", handleNewMessage);
    socket.on("utilisateur_frappe", handleTyping);
    socket.on("messages_lus", handleMessagesRead);

    return () => {
      socket.off("nouveau_message", handleNewMessage);
      socket.off("utilisateur_frappe", handleTyping);
      socket.off("messages_lus", handleMessagesRead);
      typingClearTimers.current.forEach((t) => clearTimeout(t));
      typingClearTimers.current.clear();
    };
  }, [socket, convId, userId, addMessage, setTypingUser, clearTypingUser, markMessagesRead]);

  // ── Load more ──────────────────────────────────────────────

  const loadMore = useCallback(async () => {
    if (!convId || !hasMore || loadingMsgs || !nextCursor) return;
    setLoadingMsgs(true);
    const data = await fetchMessages(convId, nextCursor, 30, accessToken);
    prependMessages(convId, data.messages);
    setHasMore(data.hasMore);
    setNextCursor(data.nextCursor);
    setLoadingMsgs(false);
  }, [convId, hasMore, loadingMsgs, nextCursor, accessToken, prependMessages]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (e.currentTarget.scrollTop < 50 && hasMore && !loadingMsgs) {
        void loadMore();
      }
    },
    [hasMore, loadingMsgs, loadMore],
  );

  // ── Send message (queue system) ─────────────────────────────

  const processQueue = useCallback(async () => {
    if (processingQueueRef.current || messageQueueRef.current.length === 0) return;
    processingQueueRef.current = true;

    while (messageQueueRef.current.length > 0) {
      const item = messageQueueRef.current[0];
      try {
        const result = await sendMessage({ conversationId: item.conversationId, message: item.text });
        if (result.success && result.data) {
          updateMessage(item.conversationId, item.tempId, { ...result.data, status: "sent" });
        } else {
          useConversationStore.setState((s) => ({
            messages: {
              ...s.messages,
              [item.conversationId]: (s.messages[item.conversationId] ?? []).filter(
                (m) => m.id !== item.tempId,
              ),
            },
          }));
          toast.error(result.error ?? "Erreur d'envoi");
        }
      } catch {
        useConversationStore.setState((s) => ({
          messages: {
            ...s.messages,
            [item.conversationId]: (s.messages[item.conversationId] ?? []).filter(
              (m) => m.id !== item.tempId,
            ),
          },
        }));
      }
      messageQueueRef.current.shift();
    }

    processingQueueRef.current = false;
  }, [updateMessage]);

  const handleSend = useCallback(() => {
    if (!convId || !msgInput.trim()) return;
    const text = msgInput.trim();
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const user = useUserStore.getState().user;

    const pendingMsg: Message = {
      id: tempId,
      conversationId: convId,
      expediteurId: userId,
      contenu: text,
      type: "text",
      fichierUrl: null,
      fichierNom: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      expediteur: {
        id: userId,
        username: user?.username ?? "",
        displayName: user?.displayName ?? null,
        avatarUrl: user?.avatarUrl ?? null,
      },
      status: "pending",
    };
    addMessage(convId, pendingMsg);
    setMsgInput("");

    messageQueueRef.current.push({ tempId, conversationId: convId, text });
    void processQueue();
  }, [convId, msgInput, userId, addMessage, processQueue]);

  // ── Typing ─────────────────────────────────────────────────

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMsgInput(e.target.value);
      if (!socket || !convId) return;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      socket.emit("frappe", { conversationId: convId });
      typingTimerRef.current = setTimeout(() => {}, 2000);
    },
    [socket, convId],
  );

  // ── Render ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">
          Aucune conversation de groupe disponible
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Typing indicator bar */}
      {currentTyping.length > 0 && (
        <div className="px-4 py-1 text-[11px] text-primary animate-pulse border-b">
          {currentTyping.join(", ")} écrit...
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 flex flex-col gap-1.5 px-3 py-3 overflow-y-auto hide-scrollbar"
        onScroll={handleScroll}
      >
        {loadingMsgs && (
          <div className="flex justify-center py-2">
            <Spinner className="size-4" />
          </div>
        )}
        {currentMessages.length === 0 && !loadingMsgs && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucun message — commencez la discussion !
          </p>
        )}
        {currentMessages.map((msg) => {
          const isMe = msg.expediteurId === userId;
          const readCount = msg._count?.readReceipts ?? 0;
          const msgStatus = msg.status === "pending"
            ? "pending"
            : msg.status === "read" || readCount > 1
              ? "read"
              : "sent";
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"} gap-2`}
            >
              {!isMe && (
                <Avatar className="size-7 mt-1 shrink-0">
                  <AvatarImage src={msg.expediteur.avatarUrl ?? ""} />
                  <AvatarFallback
                    className={`text-[10px] ${getAvatarFallbackColor(
                      msg.expediteur.displayName ?? msg.expediteur.username,
                    )}`}
                  >
                    {getInitials(
                      msg.expediteur.displayName ?? msg.expediteur.username,
                    )}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-accent rounded-bl-sm"
                }`}
              >
                {!isMe && (
                  <p className="text-[10px] font-semibold opacity-70 mb-0.5">
                    {msg.expediteur.displayName ?? msg.expediteur.username}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{msg.contenu}</p>
                <div
                  className={`flex items-center gap-1 justify-end mt-0.5 ${
                    isMe
                      ? "text-primary-foreground/60"
                      : "text-muted-foreground"
                  }`}
                >
                  <span className="text-[9px]">
                    {new Date(msg.createdAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {isMe && (
                    msgStatus === "pending" ? (
                      <Clock className="size-3 opacity-50" />
                    ) : msgStatus === "read" ? (
                      <CheckCheck className="size-3 text-blue-400" />
                    ) : (
                      <Check className="size-3" />
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="h-14 flex items-center gap-2 px-3 border-t shrink-0">
        <Input
          className="flex-1 border-0 focus-visible:ring-0"
          placeholder={`Message ${groupName}...`}
          value={msgInput}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
        />
        <Button
          size="icon"
          className="cursor-pointer shrink-0"
          onClick={() => void handleSend()}
          disabled={!msgInput.trim()}
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
};

export default GroupChatView;
