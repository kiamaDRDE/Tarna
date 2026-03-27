"use client";
import {
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Card } from "../../ui/card";
import { Comment } from "@/src/types/post";
import { useState, useCallback } from "react";
import { useUserStore } from "@/src/store/userStore";
import { useCommentStore } from "@/src/store/commentStore";
import { createComment } from "@/src/lib/api";
import { mapRawComment } from "@/src/lib/mapComment";
import { toast } from "sonner";
import { getAvatarFallbackColor } from "@/src/lib/avatarColor";

const MAX_DEPTH = 3;

const CommentItem = ({
  comment,
  depth = 1,
}: {
  comment: Comment;
  depth?: number;
}) => {
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const currentUser = useUserStore((s) => s.user);
  const accessToken = useUserStore((s) => s.accessToken);
  const addComment = useCommentStore((s) => s.addComment);

  const hasReplies = comment.replies && comment.replies.length > 0;

  const handleSendReply = useCallback(async () => {
    if (!replyText.trim() || sending || !accessToken) return;
    setSending(true);
    try {
      const res = await createComment(
        {
          postId: comment.postId,
          authorId: currentUser?.id || "",
          contentText: replyText.trim(),
          parentCommentId: comment.id,
        },
        accessToken,
      );
      if (res.ok) {
        const data = await res.json();
        const mapped = mapRawComment(data);
        addComment(comment.postId, mapped);
        setReplyText("");
        setShowReplyInput(false);
        setShowReplies(true);
      } else {
        toast.error("Échec de l'envoi de la réponse");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSending(false);
    }
  }, [replyText, sending, accessToken, comment.postId, comment.id, addComment, currentUser?.id]);

  return (
    <div
      className={`flex flex-col gap-2 ${depth > 1 ? "ml-8 border-l-2 border-muted pl-3" : ""}`}
    >
      <div className="flex flex-row gap-2">
        <Avatar className="size-7">
          <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
          <AvatarFallback className={`text-xs font-semibold ${getAvatarFallbackColor(comment.author.initials)}`}>
            {comment.author.initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1 w-full">
          <Card className="bg-accent/50 px-3 py-2 gap-0">
            <div className="flex flex-row items-center gap-2">
              <p className="text-sm font-semibold">{comment.author.name}</p>
              <p className="text-xs text-muted-foreground">{comment.timeAgo}</p>
              {comment.isEdited && (
                <p className="text-[10px] text-muted-foreground italic">
                  modifié
                </p>
              )}
            </div>
            <p className="text-sm">{comment.content}</p>
          </Card>
          <div className="flex flex-row items-center gap-3 px-1">
            {/* <button
              type="button"
              onClick={() => setLiked(!liked)}
              className="flex flex-row items-center gap-1 text-xs text-muted-foreground hover:text-red-500 cursor-pointer"
            >
              <Heart
                className="size-3"
                fill={liked ? "red" : "none"}
                color={liked ? "red" : "currentColor"}
              />
              <span>
                {liked
                  ? comment.stats.reactions_count + 1
                  : comment.stats.reactions_count}
              </span>
            </button> */}
            {depth < MAX_DEPTH && (
              <button
                type="button"
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="flex flex-row items-center gap-1 text-xs text-muted-foreground hover:text-primary cursor-pointer"
              >
                <MessageCircle className="size-3" />
                <span>Répondre</span>
              </button>
            )}
            {hasReplies && (
              <button
                type="button"
                onClick={() => setShowReplies(!showReplies)}
                className="flex flex-row items-center gap-1 text-xs text-muted-foreground hover:text-primary cursor-pointer"
              >
                {showReplies ? (
                  <ChevronUp className="size-3" />
                ) : (
                  <ChevronDown className="size-3" />
                )}
                <span>
                  {comment.replies!.length}{" "}
                  {comment.replies!.length > 1 ? "réponses" : "réponse"}
                </span>
              </button>
            )}
          </div>

          {/* Champ de réponse */}
          {showReplyInput && depth < MAX_DEPTH && (
            <div className="flex flex-row items-center gap-2 mt-1">
              <Avatar className="size-6">
                <AvatarImage src={currentUser?.avatarUrl || ""} alt="vous" />
                <AvatarFallback className={`text-[10px] font-semibold ${getAvatarFallbackColor(currentUser?.initials)}`}>
                  {currentUser?.initials ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-row items-center gap-1 border rounded-full px-3 py-1 w-full">
                <Input
                  placeholder="Écrire une réponse..."
                  className="border-0 h-7 text-sm focus:outline-none focus:ring-0 focus-visible:ring-0 p-0"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSendReply()
                  }
                  disabled={sending}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-6 cursor-pointer"
                  onClick={handleSendReply}
                  disabled={sending || !replyText.trim()}
                >
                  {sending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Send className="size-3" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Réponses imbriquées */}
          {showReplies && hasReplies && (
            <div className="flex flex-col gap-2 mt-1">
              {comment.replies!.map((reply) => (
                <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentItem;
