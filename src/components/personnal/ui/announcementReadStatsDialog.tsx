"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Progress } from "../../ui/progress";
import { Button } from "../../ui/button";
import {
  fetchReadStats,
  fetchReaders,
} from "@/app/(Client)/organizations/announcementActions";
import type {
  AnnouncementReader,
  AnnouncementReadStats,
} from "@/src/types/announcement";
import { getAvatarFallbackColor } from "@/src/lib/avatarColor";
import { getInitials } from "@/src/lib/getInitials";

type Props = {
  announcementId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const AnnouncementReadStatsDialog = ({
  announcementId,
  open,
  onOpenChange,
}: Props) => {
  const [stats, setStats] = useState<AnnouncementReadStats | null>(null);
  const [readers, setReaders] = useState<AnnouncementReader[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    if (!announcementId) return;
    setLoading(true);
    const [statsData, readersData] = await Promise.all([
      fetchReadStats(announcementId),
      fetchReaders(announcementId),
    ]);
    setStats(statsData);
    setReaders(readersData.data);
    setNextCursor(readersData.meta.nextCursor);
    setHasMore(readersData.meta.hasMore);
    setLoading(false);
  }, [announcementId]);

  useEffect(() => {
    if (open && announcementId) {
      load();
    }
    if (!open) {
      setStats(null);
      setReaders([]);
    }
  }, [open, announcementId, load]);

  const loadMore = async () => {
    if (!announcementId || !nextCursor) return;
    const more = await fetchReaders(announcementId, nextCursor);
    setReaders((prev) => [...prev, ...more.data]);
    setNextCursor(more.meta.nextCursor);
    setHasMore(more.meta.hasMore);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="size-4" />
            Confirmations de lecture
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats summary */}
            {stats && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {stats.readCount} / {stats.totalRecipients} destinataires
                  </span>
                  <span className="font-semibold">
                    {stats.readPercentage}%
                  </span>
                </div>
                <Progress value={stats.readPercentage} className="h-2" />
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="size-3" />
                    {stats.readCount} lu{stats.readCount > 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <EyeOff className="size-3" />
                    {stats.unreadCount} non lu{stats.unreadCount > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            )}

            {/* Readers list */}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {readers.map((reader) => {
                const name =
                  reader.user.displayName || reader.user.username;
                return (
                  <div
                    key={reader.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
                  >
                    <Avatar className="size-7">
                      <AvatarImage
                        src={reader.user.avatarUrl || ""}
                        alt={name}
                      />
                      <AvatarFallback
                        className={`text-[9px] ${getAvatarFallbackColor(name)}`}
                      >
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        @{reader.user.username}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(reader.readAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}

              {readers.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune lecture enregistrée
                </p>
              )}
            </div>

            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={loadMore}
              >
                Charger plus
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AnnouncementReadStatsDialog;
