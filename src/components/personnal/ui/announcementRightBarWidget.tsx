"use client";

import { useEffect, useState, useCallback } from "react";
import { Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { fetchActiveAnnouncements } from "@/app/(Client)/organizations/announcementActions";
import type { Announcement } from "@/src/types/announcement";
import { useSocketEvent } from "@/src/hooks/useSocketEvent";
import Link from "next/link";

const AnnouncementRightBarWidget = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchActiveAnnouncements()
      .then((data) => {
        if (!cancelled) setAnnouncements(data.slice(0, 5));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Socket listeners for real-time updates
  const handleNew = useCallback((ann: Announcement) => {
    setAnnouncements((prev) => {
      if (prev.some((a) => a.id === ann.id)) return prev;
      return [ann, ...prev].slice(0, 5);
    });
  }, []);

  const handleUpdated = useCallback((ann: Announcement) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === ann.id ? ann : a))
    );
  }, []);

  const handleRemoved = useCallback((data: { id: string }) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== data.id));
  }, []);

  useSocketEvent<Announcement>("announcement:new", handleNew);
  useSocketEvent<Announcement>("announcement:updated", handleUpdated);
  useSocketEvent<{ id: string }>("announcement:archived", handleRemoved);
  useSocketEvent<{ id: string }>("announcement:deleted", handleRemoved);

  if (loading) return null;
  if (announcements.length === 0) return null;

  return (
    <Card className="gap-0 py-3 px-0 border shadow-none border-amber-200 dark:border-amber-800/40">
      <CardHeader className="px-4 pb-2 pt-0">
        <div className="flex flex-row items-center gap-2">
          <Megaphone className="size-4 text-amber-600" />
          <CardTitle className="text-sm font-semibold">
            Annonces officielles
          </CardTitle>
          <Badge
            variant="secondary"
            className="ml-auto text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          >
            {announcements.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-0 pt-0 flex flex-col gap-0.5">
        {announcements.map((ann) => (
          <Link
            key={ann.id}
            href={`/organizations/${ann.orgId}`}
            className="flex flex-col gap-0.5 px-2 py-2 rounded-md hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate leading-tight">
                {ann.title}
              </span>
              {!ann.isRead && (
                <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {ann.organization.name}
            </p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
};

export default AnnouncementRightBarWidget;
