"use client";

import { useState, useCallback, useEffect } from "react";
import { Megaphone, CalendarIcon, Users, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Checkbox } from "../../ui/checkbox";
import { createAnnouncement } from "@/app/(Client)/organizations/announcementActions";
import { useAnnouncementStore } from "@/src/store/announcementStore";
import { toast } from "sonner";
import { Spinner } from "../../ui/spinner";
import type { Announcement } from "@/src/types/announcement";

type GroupOption = {
  id: string;
  name: string;
};

type Props = {
  orgId: string;
  orgGroups: GroupOption[];
  delegateOptions?: { id: string; displayName: string | null; username: string }[];
};

const CreateAnnouncementDialog = ({
  orgId,
  orgGroups,
  delegateOptions,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scope, setScope] = useState<"network" | "groups">("network");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [delegateId, setDelegateId] = useState<string | undefined>(undefined);
  const [isPinned, setIsPinned] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addAnnouncement = useAnnouncementStore((s) => s.addAnnouncement);

  const resetForm = useCallback(() => {
    setTitle("");
    setContent("");
    setScope("network");
    setSelectedGroups([]);
    setDelegateId(undefined);
    setIsPinned(true);
    setExpiresAt("");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !content.trim() || submitting) return;

    if (scope === "groups" && selectedGroups.length === 0) {
      toast.error("Sélectionnez au moins un groupe cible");
      return;
    }

    setSubmitting(true);
    const result = await createAnnouncement({
      orgId,
      title: title.trim(),
      contentText: content.trim(),
      scope,
      groupIds: scope === "groups" ? selectedGroups : undefined,
      delegateId,
      isPinned,
      expiresAt: expiresAt || undefined,
    });

    if (result.success && result.announcement) {
      addAnnouncement({ ...result.announcement, isRead: true } as Announcement);
      toast.success("Annonce publiée", {
        description: "L'annonce a été diffusée.",
      });
      resetForm();
      setOpen(false);
    } else {
      toast.error(result.error || "Erreur de publication");
    }
    setSubmitting(false);
  }, [
    title,
    content,
    scope,
    selectedGroups,
    delegateId,
    isPinned,
    expiresAt,
    orgId,
    submitting,
    addAnnouncement,
    resetForm,
  ]);

  const toggleGroup = (groupId: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId],
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 cursor-pointer border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
        >
          <Megaphone className="size-3.5" />
          Annonce
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="size-4 text-amber-600" />
            Nouvelle annonce officielle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">Titre</Label>
            <Input
              id="ann-title"
              placeholder="Titre de l'annonce…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-content">Contenu</Label>
            <Textarea
              id="ann-content"
              placeholder="Rédigez votre annonce…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          {/* Scope */}
          <div className="space-y-1.5">
            <Label>Diffusion</Label>
            <Select
              value={scope}
              onValueChange={(v) => setScope(v as "network" | "groups")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="network">
                  <div className="flex items-center gap-2">
                    <Globe className="size-3.5" />
                    Tout le réseau
                  </div>
                </SelectItem>
                <SelectItem value="groups">
                  <div className="flex items-center gap-2">
                    <Users className="size-3.5" />
                    Groupes ciblés
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Group selection */}
          {scope === "groups" && orgGroups.length > 0 && (
            <div className="space-y-1.5">
              <Label>Groupes cibles</Label>
              <div className="max-h-32 overflow-y-auto space-y-1 rounded-md border p-2">
                {orgGroups.map((group) => (
                  <label
                    key={group.id}
                    className="flex items-center gap-2 px-1 py-1 rounded hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedGroups.includes(group.id)}
                      onCheckedChange={() => toggleGroup(group.id)}
                    />
                    <span className="text-sm">{group.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Delegation */}
          {delegateOptions && delegateOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label>Publier au nom de (délégation)</Label>
              <Select
                value={delegateId || "__none__"}
                onValueChange={(v) =>
                  setDelegateId(v === "__none__" ? undefined : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Moi-même" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Moi-même</SelectItem>
                  {delegateOptions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.displayName || d.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Options row */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={isPinned}
                onCheckedChange={(v) => setIsPinned(!!v)}
              />
              Épingler en tête
            </label>
          </div>

          {/* Expiry date */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-expires" className="flex items-center gap-1">
              <CalendarIcon className="size-3" />
              Date d&apos;expiration (optionnel)
            </Label>
            <Input
              id="ann-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || submitting}
            className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {submitting ? (
              <Spinner className="size-4" />
            ) : (
              <Megaphone className="size-4" />
            )}
            Publier l&apos;annonce
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAnnouncementDialog;
