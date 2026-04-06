"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useAnnouncementStore } from "@/src/store/announcementStore";
import { fetchOrgAnnouncements } from "@/app/(Client)/organizations/announcementActions";
import AnnouncementBanner from "./announcementBanner";
import type { Announcement } from "@/src/types/announcement";

import { Spinner } from "../../ui/spinner";
import { Button } from "../../ui/button";
import { Archive, ChevronDown, ChevronUp } from "lucide-react";
import { useSocketEvent } from "@/src/hooks/useSocketEvent";

type Props = {
  orgId: string;
  userRole: string | null | undefined;
  isAdmin: boolean;
  groupId?: string;
};

const AnnouncementSection = ({ orgId, userRole, groupId }: Props) => {
  const announcements = useAnnouncementStore((s) => s.announcements);
  const setAnnouncements = useAnnouncementStore((s) => s.setAnnouncements);
  const addAnnouncement = useAnnouncementStore((s) => s.addAnnouncement);
  const updateAnnouncement = useAnnouncementStore((s) => s.updateAnnouncement);
  const removeAnnouncement = useAnnouncementStore((s) => s.removeAnnouncement);
  const loading = useAnnouncementStore((s) => s.loading);
  const setLoading = useAnnouncementStore((s) => s.setLoading);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedAnnouncements, setArchivedAnnouncements] = useState<
    Announcement[]
  >([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const hydrated = useRef(false);

  // ── Fetch active announcements ──
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    setLoading(true);
    fetchOrgAnnouncements(orgId, null, "active", groupId)
      .then((res) => {
        setAnnouncements(res.data, res.meta.nextCursor, res.meta.hasMore);
      })
      .finally(() => setLoading(false));
  }, [orgId, groupId, setAnnouncements, setLoading]);

  // ── WebSocket listeners ──
  const handleNewAnnouncement = useCallback(
    (data: Announcement) => {
      if (data.orgId !== orgId) return;
      // In group context, only show announcements targeting this group
      if (groupId) {
        const targetsThisGroup =
          data.scope === "groups" &&
          data.targets?.some((t) => t.groupId === groupId);
        if (!targetsThisGroup) return;
      }
      addAnnouncement(data);
    },
    [orgId, groupId, addAnnouncement],
  );

  const handleUpdatedAnnouncement = useCallback(
    (data: Announcement) => {
      if (data.orgId !== orgId) return;
      if (groupId) {
        const targetsThisGroup =
          data.scope === "groups" &&
          data.targets?.some((t) => t.groupId === groupId);
        if (!targetsThisGroup) {
          // If updated and no longer targets this group, remove it
          removeAnnouncement(data.id);
          return;
        }
      }
      updateAnnouncement(data.id, data);
    },
    [orgId, groupId, updateAnnouncement, removeAnnouncement],
  );

  const handleArchivedAnnouncement = useCallback(
    (data: { id: string }) => {
      removeAnnouncement(data.id);
    },
    [removeAnnouncement],
  );

  const handleDeletedAnnouncement = useCallback(
    (data: { id: string }) => {
      removeAnnouncement(data.id);
    },
    [removeAnnouncement],
  );

  useSocketEvent("announcement:new", handleNewAnnouncement);
  useSocketEvent("announcement:updated", handleUpdatedAnnouncement);
  useSocketEvent("announcement:archived", handleArchivedAnnouncement);
  useSocketEvent("announcement:deleted", handleDeletedAnnouncement);

  // ── Fetch archived on demand ──
  const loadArchived = useCallback(async () => {
    if (!showArchived) {
      setShowArchived(true);
      setArchivedLoading(true);
      const res = await fetchOrgAnnouncements(orgId, null, "archived", groupId);
      setArchivedAnnouncements(res.data);
      setArchivedLoading(false);
    } else {
      setShowArchived(false);
    }
  }, [orgId, showArchived, groupId]);

  const pinned = announcements.filter(
    (a) => a.isPinned && a.status === "active",
  );
  const unpinned = announcements.filter(
    (a) => !a.isPinned && a.status === "active",
  );
  const hasAnnouncements = announcements.length > 0;

  // Ne rien afficher s'il n'y a pas d'annonces
  if (!hasAnnouncements && !loading) return null;

  return (
    <div className="flex flex-col gap-2 mt-1">
      {/* ─── Loading ─── */}
      {loading && (
        <div className="flex justify-center py-4">
          <Spinner className="size-5" />
        </div>
      )}

      {/* ─── Pinned announcements ─── */}
      {pinned.map((ann) => (
        <AnnouncementBanner
          key={ann.id}
          announcement={ann}
          userRole={userRole}
        />
      ))}

      {/* ─── Other active announcements ─── */}
      {unpinned.map((ann) => (
        <AnnouncementBanner
          key={ann.id}
          announcement={ann}
          userRole={userRole}
        />
      ))}

      {/* ─── Archive toggle ─── */}
      {hasAnnouncements && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={loadArchived}
          >
            <Archive className="size-3" />
            {showArchived ? "Masquer les archives" : "Voir les archives"}
            {showArchived ? (
              <ChevronUp className="size-3" />
            ) : (
              <ChevronDown className="size-3" />
            )}
          </Button>
        </div>
      )}

      {/* ─── Archived announcements ─── */}
      {showArchived && (
        <div className="flex flex-col gap-2">
          {archivedLoading ? (
            <div className="flex justify-center py-3">
              <Spinner className="size-4" />
            </div>
          ) : archivedAnnouncements.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-2">
              Aucune annonce archivée.
            </p>
          ) : (
            archivedAnnouncements.map((ann) => (
              <AnnouncementBanner
                key={ann.id}
                announcement={ann}
                userRole={userRole}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AnnouncementSection;
