"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  fetchConversations,
  fetchMessages,
  findOrCreateDm,
  sendMessage,
  markAllRead,
  searchUsers,
} from "./action";
import type { UserSearchResult } from "@/src/types/user";
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
import { Card } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Spinner } from "@/src/components/ui/spinner";
import { getInitials } from "@/src/lib/getInitials";
import { getAvatarFallbackColor } from "@/src/lib/avatarColor";
import { ChevronLeft, Check, CheckCheck, Clock, Plus, Search, Send } from "lucide-react";
import { toast } from "sonner";

// ── Helpers ──────────────────────────────────────────────────

function getConversationName(conv: Conversation, userId: string): string {
  if (conv.titre) return conv.titre;
  const other = conv.members.find((m) => m.userId !== userId);
  return other?.user?.displayName ?? other?.user?.username ?? "Conversation";
}

function getConversationAvatar(conv: Conversation, userId: string) {
  if (conv.estGroupe)
    return { url: conv.imageUrl, name: conv.titre ?? "Groupe" };
  const other = conv.members.find((m) => m.userId !== userId);
  return {
    url: other?.user?.avatarUrl ?? null,
    name: other?.user?.displayName ?? other?.user?.username ?? "?",
  };
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate())
    return d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  if (diff < 172800000) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

// ── Component ────────────────────────────────────────────────

const MessagesPage = () => {
  const userId = useUserStore((s) => s.user?.id) ?? "";
  const accessToken = useUserStore((s) => s.accessToken);
  const socket = useSocket();

  const {
    conversations,
    messages,
    typingUsers,
    setConversations,
    addConversation,
    setMessages,
    addMessage,
    prependMessages,
    setTypingUser,
    clearTypingUser,
    markConversationRead,
    markMessagesRead,
    updateMessage,
  } = useConversationStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const [showNewConv, setShowNewConv] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [creatingDm, setCreatingDm] = useState(false);

  const [renderedConvs, setRenderedConvs] = useState<"chat" | "groupe">('chat'); // For animation

  const bottomRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ── Message queue ──────────────────────────────────────────
  const messageQueueRef = useRef<{ tempId: string; conversationId: string; text: string }[]>([]);
  const processingQueueRef = useRef(false);

  const currentMessages = selectedId ? (messages[selectedId] ?? []) : [];
  const currentTyping = selectedId ? (typingUsers[selectedId] ?? []) : [];

  // ── Load conversations ────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingConvs(true);
      const data = await fetchConversations(accessToken);
      if (!cancelled) setConversations(data);
      setLoadingConvs(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [setConversations, accessToken]);

  // ── Join conversation rooms ────────────────────────────────

  useEffect(() => {
    if (!socket || conversations.length === 0) return;
    for (const conv of conversations) {
      socket.emit("join_conversation", { conversationId: conv.id });
    }
  }, [socket, conversations]);

  // ── Load messages when conversation selected ───────────────

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    (async () => {
      setLoadingMsgs(true);
      setNextCursor(null);
      const data = await fetchMessages(selectedId, null, 30, accessToken);
      if (!cancelled) {
        setMessages(selectedId, data.messages);
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
      }
      setLoadingMsgs(false);
      void markAllRead(selectedId);
      markConversationRead(selectedId);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, setMessages, markConversationRead, accessToken]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages.length]);

  // ── Socket events ──────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: Message) => {
      // Skip addMessage for own messages — we already have the optimistic version
      if (msg.expediteurId !== userId) {
        addMessage(msg.conversationId, msg);
      }
      useConversationStore.setState((s) => {
        const convs = [...s.conversations];
        const idx = convs.findIndex((c) => c.id === msg.conversationId);
        if (idx > 0) {
          const [conv] = convs.splice(idx, 1);
          conv.dernierMessage = msg;
          if (msg.expediteurId !== userId) {
            conv.nonLus = (conv.nonLus ?? 0) + 1;
          }
          convs.unshift(conv);
        } else if (idx === 0) {
          convs[0] = { ...convs[0], dernierMessage: msg };
          if (msg.expediteurId !== userId) {
            convs[0] = { ...convs[0], nonLus: (convs[0].nonLus ?? 0) + 1 };
          }
        }
        return { conversations: convs };
      });
      if (msg.conversationId === selectedId && msg.expediteurId !== userId) {
        void markAllRead(msg.conversationId);
        markConversationRead(msg.conversationId);
      }
    };

    const handleTyping = (data: {
      conversationId: string;
      userId: string;
      username: string;
    }) => {
      if (data.userId === userId) return;
      const key = `${data.conversationId}:${data.username}`;
      // Clear any existing timer for this user
      const existing = typingClearTimers.current.get(key);
      if (existing) clearTimeout(existing);
      // Show the indicator
      setTypingUser(data.conversationId, data.username);
      // Clear after 1s of silence
      const timer = setTimeout(() => {
        clearTypingUser(data.conversationId, data.username);
        typingClearTimers.current.delete(key);
      }, 1000);
      typingClearTimers.current.set(key, timer);
    };

    const handleNewConversation = (conv: Conversation) => {
      addConversation(conv);
      if (socket) {
        socket.emit("join_conversation", { conversationId: conv.id });
      }
    };

    const handleOnline = (data: { userId: string }) => {
      setOnlineUserIds((prev) => new Set(prev).add(data.userId));
    };

    const handleOffline = (data: { userId: string }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    };

    const handleMessagesRead = (data: {
      conversationId: string;
      messageIds: string[];
      userId: string;
    }) => {
      if (data.userId === userId) return;
      markMessagesRead(data.conversationId, data.messageIds);
    };

    socket.on("nouveau_message", handleNewMessage);
    socket.on("utilisateur_frappe", handleTyping);
    socket.on("conversation:new", handleNewConversation);
    socket.on("user:online", handleOnline);
    socket.on("user:offline", handleOffline);
    socket.on("messages_lus", handleMessagesRead);

    return () => {
      socket.off("nouveau_message", handleNewMessage);
      socket.off("utilisateur_frappe", handleTyping);
      socket.off("conversation:new", handleNewConversation);
      socket.off("user:online", handleOnline);
      socket.off("user:offline", handleOffline);
      socket.off("messages_lus", handleMessagesRead);
      // Clear all typing timers
      typingClearTimers.current.forEach((t) => clearTimeout(t));
      typingClearTimers.current.clear();
    };
  }, [
    socket,
    userId,
    selectedId,
    addMessage,
    setTypingUser,
    clearTypingUser,
    addConversation,
    markConversationRead,
    markMessagesRead,
  ]);

  // ── Load more (scroll up) ─────────────────────────────────

  const loadMore = useCallback(async () => {
    if (!selectedId || !hasMore || loadingMsgs || !nextCursor) return;
    setLoadingMsgs(true);
    const data = await fetchMessages(selectedId, nextCursor, 30, accessToken);
    prependMessages(selectedId, data.messages);
    setHasMore(data.hasMore);
    setNextCursor(data.nextCursor);
    setLoadingMsgs(false);
  }, [selectedId, hasMore, loadingMsgs, nextCursor, accessToken, prependMessages]);

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
        const result = await sendMessage({
          conversationId: item.conversationId,
          message: item.text,
        });
        if (result.success && result.data) {
          updateMessage(item.conversationId, item.tempId, {
            ...result.data,
            status: "sent",
          });
        } else {
          // Remove failed optimistic message
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
    if (!selectedId || !msgInput.trim()) return;
    const text = msgInput.trim();
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const user = useUserStore.getState().user;

    const pendingMsg: Message = {
      id: tempId,
      conversationId: selectedId,
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
    addMessage(selectedId, pendingMsg);
    setMsgInput("");

    messageQueueRef.current.push({ tempId, conversationId: selectedId, text });
    void processQueue();
  }, [selectedId, msgInput, userId, addMessage, processQueue]);

  // ── Typing indicator ──────────────────────────────────────

  const emitTyping = useCallback(() => {
    if (!socket || !selectedId) return;
    socket.emit("frappe", { conversationId: selectedId });
  }, [socket, selectedId]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMsgInput(e.target.value);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      emitTyping();
      typingTimerRef.current = setTimeout(() => {}, 2000);
    },
    [emitTyping],
  );

  // ── New conversation: user search ──────────────────────────

  useEffect(() => {
    if (!showNewConv) return;
    if (userSearch.trim().length < 2) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearchingUsers(true);
      const results = await searchUsers(userSearch, accessToken);
      setUserResults(results.filter((u) => u.id !== userId));
      setSearchingUsers(false);
    }, 350);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [userSearch, showNewConv, userId, accessToken]);

  const handleSelectUser = useCallback(
    async (user: UserSearchResult) => {
      setCreatingDm(true);
      const result = await findOrCreateDm(user.id, accessToken);
      if (!result) {
        toast.error("Impossible de créer la conversation");
        setCreatingDm(false);
        return;
      }
      const conv = result.conversation;
      if (result.created) {
        addConversation(conv);
        if (socket) {
          socket.emit("join_conversation", { conversationId: conv.id });
        }
      }
      setSelectedId(conv.id);
      setShowNewConv(false);
      setUserSearch("");
      setUserResults([]);
      setCreatingDm(false);
    },
    [socket, accessToken, addConversation],
  );

  // ── Filtered conversations ─────────────────────────────────

  const filteredConvs = useMemo(() => {
    const byType = renderedConvs === 'chat'
      ? conversations.filter((c) => !c.estGroupe)
      : conversations.filter((c) => c.estGroupe);
    if (!search.trim()) return byType;
    const q = search.toLowerCase();
    return byType.filter((c) => getConversationName(c, userId).toLowerCase().includes(q));
  }, [conversations, search, userId, renderedConvs]);

  const selectedConv = conversations.find((c) => c.id === selectedId);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="xl:max-w-2xl w-full xl:w-2xl h-full pb-20 flex flex-row gap-0 justify-between md:px-10 xl:px-0">
      {/* ─── Conversation List ─── */}
      <Card
        className={`${
          selectedId !== null ? "hidden md:flex" : "flex"
        } w-full md:w-2/5 flex-col rounded h-full border-0 shadow-none px-1 gap-1`}
      >
        {/* Search + New */}
        <div className="flex items-center gap-1 p-1">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-8 h-9"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Dialog
            open={showNewConv}
            onOpenChange={(open) => {
              setShowNewConv(open);
              if (!open) {
                setUserSearch("");
                setUserResults([]);
                setSearchingUsers(false);
                if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 shrink-0 cursor-pointer"
              >
                <Plus className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nouvelle conversation</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="Rechercher un utilisateur..."
                value={userSearch}
                onChange={(e) => {
                  const next = e.target.value;
                  setUserSearch(next);
                  if (next.trim().length < 2) {
                    setUserResults([]);
                    setSearchingUsers(false);
                    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                  }
                }}
                autoFocus
              />
              <div className="max-h-60 overflow-y-auto space-y-1 mt-2">
                {searchingUsers && (
                  <div className="flex justify-center py-4">
                    <Spinner className="size-5" />
                  </div>
                )}
                {!searchingUsers &&
                  userResults.length === 0 &&
                  userSearch.length >= 2 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun utilisateur trouvé
                    </p>
                  )}
                {userResults.map((user) => (
                  <button
                    key={user.id}
                    disabled={creatingDm}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer text-left disabled:opacity-50"
                    onClick={() => void handleSelectUser(user)}
                  >
                    <Avatar className="size-9">
                      <AvatarImage src={user.avatarUrl ?? ""} />
                      <AvatarFallback
                        className={getAvatarFallbackColor(
                          user.displayName ?? user.username,
                        )}
                      >
                        {getInitials(user.displayName ?? user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {user.displayName ?? user.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Ordner conversation type */}
        <div className="flex items-center gap-1 mb-1 px-1">
          <button
            onClick={() => setRenderedConvs('chat')}
            className={`px-3 py-1 text-sm rounded-full cursor-pointer transition-colors ${
              renderedConvs === 'chat'
                ? 'bg-primary/30 text-primary-foreground font-semibold'
                : 'bg-accent text-muted-foreground hover:bg-accent/80'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setRenderedConvs('groupe')}
            className={`px-3 py-1 text-sm rounded-full cursor-pointer transition-colors ${
              renderedConvs === 'groupe'
                ? 'bg-primary/30 text-primary-foreground font-semibold'
                : 'bg-accent text-muted-foreground hover:bg-accent/80'
            }`}
          >
            Groupe
          </button>
        </div>

        {/* Conversation list */}
        {loadingConvs ? (
          <div className="flex justify-center py-8">
            <Spinner className="size-5" />
          </div>
        ) : filteredConvs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucune conversation
          </p>
        ) : (
          <div className="flex flex-col gap-0.5 overflow-y-auto hide-scrollbar">
            {filteredConvs.map((conv) => {
              const avatar = getConversationAvatar(conv, userId);
              const name = getConversationName(conv, userId);
              const lastMsg = conv.dernierMessage;
              const isActive = conv.id === selectedId;

              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer text-left transition-colors ${
                    isActive ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar className="size-10">
                      <AvatarImage src={avatar.url ?? ""} />
                      <AvatarFallback
                        className={getAvatarFallbackColor(avatar.name)}
                      >
                        {getInitials(avatar.name)}
                      </AvatarFallback>
                    </Avatar>
                    {!conv.estGroupe && (() => {
                      const otherId = conv.members.find((m) => m.userId !== userId)?.userId;
                      return otherId && onlineUserIds.has(otherId);
                    })() && (
                      <span className="absolute bottom-0 right-0 size-2.5 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        {conv.estGroupe && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                            Groupe
                          </Badge>
                        )}
                      </div>
                      {lastMsg && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatTime(lastMsg.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground truncate">
                        {lastMsg ? lastMsg.contenu : "Pas encore de messages"}
                      </p>
                      {(conv.nonLus ?? 0) > 0 && (
                        <span className="ml-1 shrink-0 size-5 flex items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                          {conv.nonLus}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* ─── Conversation Thread ─── */}
      {selectedId && selectedConv ? (
        <Card className="flex w-full md:w-3/5 rounded h-full py-0 flex-col justify-between gap-0">
          {/* Header */}
          <div className="flex h-14 items-center justify-between px-3 border-b shrink-0">
            <div className="flex items-center gap-2">
              <button
                className="md:hidden cursor-pointer p-1 rounded-full hover:bg-accent"
                onClick={() => setSelectedId(null)}
              >
                <ChevronLeft className="size-5" />
              </button>
              <Avatar className="size-9">
                <AvatarImage
                  src={
                    getConversationAvatar(selectedConv, userId).url ?? ""
                  }
                />
                <AvatarFallback
                  className={getAvatarFallbackColor(
                    getConversationName(selectedConv, userId),
                  )}
                >
                  {getInitials(
                    getConversationName(selectedConv, userId),
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col leading-tight">
                <p className="font-semibold text-sm truncate max-w-40">
                  {getConversationName(selectedConv, userId)}
                </p>
                {currentTyping.length > 0 ? (
                  <p className="text-[11px] text-primary animate-pulse">
                    {currentTyping.join(", ")} écrit...
                  </p>
                ) : !selectedConv.estGroupe && (() => {
                  const otherId = selectedConv.members.find((m) => m.userId !== userId)?.userId;
                  return otherId && onlineUserIds.has(otherId);
                })() ? (
                  <p className="text-[11px] text-green-500">En ligne</p>
                ) : null}
              </div>
            </div>
          </div>

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
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-accent rounded-bl-sm"
                    }`}
                  >
                    {!isMe && selectedConv.estGroupe && (
                      <p className="text-[10px] font-semibold opacity-70 mb-0.5">
                        {msg.expediteur.displayName ??
                          msg.expediteur.username}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">
                      {msg.contenu}
                    </p>
                    <div
                      className={`flex items-center gap-1 justify-end mt-0.5 ${
                        isMe
                          ? "text-primary-foreground/60"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span className="text-[9px]">
                        {formatTime(msg.createdAt)}
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
              placeholder="Écrire un message..."
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
        </Card>
      ) : (
        /* Empty state */
        <Card className="hidden md:flex w-3/5 rounded h-full items-center justify-center border-0 shadow-none">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Search className="size-10 opacity-30" />
            <p className="text-sm">
              Sélectionnez une conversation pour commencer
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MessagesPage;
