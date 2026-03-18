"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
  LogOut,
  Pencil,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
  Globe,
  Lock,
  EyeOff,
  Settings2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Spinner } from "../ui/spinner";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { getInitials } from "@/src/lib/getInitials";
import { getAvatarFallbackColor } from "@/src/lib/avatarColor";
import { useUserStore } from "@/src/store/userStore";
import { toast } from "sonner";
import type {
  DetailedGroupResponse,
  GroupJoinRequest,
  GroupMember,
  GroupRole,
} from "@/src/types/group";
import type { UserSearchResult } from "@/src/types/user";
import {
  fetchGroupMembers,
  fetchGroupJoinRequests,
  addGroupMember,
  removeGroupMember,
  updateGroupMemberRole,
  handleGroupJoinRequest,
  updateGroup,
  archiveGroup,
  searchUsers,
  type UpdateGroupInput,
} from "@/app/(Client)/groups/action";

// ── Types ────────────────────────────────────────────────────

type View = "main" | "members-full" | "add-member" | "requests-full";

type Props = {
  group: DetailedGroupResponse;
};

// ── Role helpers ─────────────────────────────────────────────

const ROLE_HIERARCHY: Record<GroupRole, number> = {
  owner: 40,
  admin: 30,
  moderator: 20,
  member: 10,
};

const ROLE_LABELS: Record<GroupRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  moderator: "Modérateur",
  member: "Membre",
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown className="size-3.5 text-yellow-500" />,
  admin: <ShieldCheck className="size-3.5 text-blue-500" />,
  moderator: <Shield className="size-3.5 text-green-500" />,
};

const canManageMembers = (role: GroupRole | null) =>
  role !== null && ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.moderator;

const canEditGroup = (role: GroupRole | null) =>
  role !== null && ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.admin;

const canArchive = (role: GroupRole | null) =>
  role !== null && ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.owner;

// ── Component ────────────────────────────────────────────────

export default function GroupSettingsDrawer({ group }: Props) {
  const currentUser = useUserStore((s) => s.user);
  const myRole = group.currentUserRole ?? null;

  const [view, setView] = useState<View>("main");

  // Collapsible sections
  const [editOpen, setEditOpen] = useState(false);

  // Members
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersCursor, setMembersCursor] = useState<string | null>(null);
  const [membersHasMore, setMembersHasMore] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingDeleteUser, setLoadingDeleteUser] = useState(false);
  const [loadingUpdateRole, setLoadingUpdateRole] = useState(false);

  // Requests
  const [requests, setRequests] = useState<GroupJoinRequest[]>([]);
  const [requestsCursor, setRequestsCursor] = useState<string | null>(null);
  const [requestsHasMore, setRequestsHasMore] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Edit
  const [editForm, setEditForm] = useState<UpdateGroupInput>({
    name: group.name,
    description: group.description ?? "",
    visibility: group.visibility,
  });
  const [saving, setSaving] = useState(false);

  // Add member search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  // ── Loaders ───────────────────────────────────────────────

  const loadMembers = useCallback(
    async (cursor?: string | null) => {
      setLoadingMembers(true);
      const res = await fetchGroupMembers(group.id, cursor);
      setMembers((prev) => (cursor ? [...prev, ...res.data] : res.data));
      setMembersCursor(res.meta.nextCursor);
      setMembersHasMore(res.meta.hasMore);
      setLoadingMembers(false);
    },
    [group.id],
  );

  const loadRequests = useCallback(
    async (cursor?: string | null) => {
      setLoadingRequests(true);
      const res = await fetchGroupJoinRequests(group.id, cursor);
      setRequests((prev) => (cursor ? [...prev, ...res.data] : res.data));
      setRequestsCursor(res.meta.nextCursor);
      setRequestsHasMore(res.meta.hasMore);
      setLoadingRequests(false);
    },
    [group.id],
  );

  // Load members/requests when switching tabs
  useEffect(() => {
    if (view === "members-full" && members.length === 0) loadMembers();
    if (view === "requests-full" && requests.length === 0) loadRequests();
  }, [view, members.length, requests.length, loadMembers, loadRequests]);

  // Also load members preview for main view
  useEffect(() => {
    if (view === "main" && members.length === 0) loadMembers();
  }, [view, members.length, loadMembers]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const users = await searchUsers(searchQuery, group.orgId ?? undefined);
      const memberIds = new Set(members.map((m) => m.user.id));
      setSearchResults(users.filter((u) => !memberIds.has(u.id)));
      setSearching(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery, members]);

  // ── Handlers ──────────────────────────────────────────────

  const handleSaveEdit = useCallback(async () => {
    setSaving(true);
    const res = await updateGroup(group.id, editForm);
    setSaving(false);
    if (res.success) {
      toast.success("Groupe mis à jour");
      setEditOpen(false);
    } else {
      toast.error(res.error ?? "Erreur");
    }
  }, [group.id, editForm]);

  const handleAddMember = useCallback(
    async (userId: string) => {
      setAddingUserId(userId);
      const res = await addGroupMember(group.id, userId);
      setAddingUserId(null);
      if (res.success) {
        toast.success("Membre ajouté");
        setSearchResults((prev) => prev.filter((u) => u.id !== userId));
        loadMembers();
      } else {
        toast.error(res.error ?? "Erreur");
      }
    },
    [group.id, loadMembers],
  );

  const handleRemoveMember = useCallback(
    async (userId: string) => {
      setLoadingDeleteUser(true);
      const res = await removeGroupMember(group.id, userId);
      if (res.success) {
        toast.success("Membre retiré");
        setLoadingDeleteUser(false);
        setMembers((prev) => prev.filter((m) => m.user.id !== userId));
      } else {
        toast.error(res.error ?? "Erreur");
        setLoadingDeleteUser(false);
      }
    },
    [group.id],
  );

  const handleUpdateRole = useCallback(
    async (userId: string, role: GroupRole) => {
      setLoadingUpdateRole(true);
      const res = await updateGroupMemberRole(group.id, userId, role);
      if (res.success) {
        toast.success("Rôle mis à jour");
        setMembers((prev) =>
          prev.map((m) => (m.user.id === userId ? { ...m, role } : m)),
        );
        setLoadingUpdateRole(false);
      } else {
        toast.error(res.error ?? "Erreur");
        setLoadingUpdateRole(false);
      }
    },
    [group.id],
  );

  const handleJoinDecision = useCallback(
    async (requestId: string, decision: "accepted" | "rejected") => {
      const res = await handleGroupJoinRequest(group.id, requestId, decision);
      if (res.success) {
        toast.success(
          decision === "accepted" ? "Membre accepté" : "Demande rejetée",
        );
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        if (decision === "accepted") loadMembers();
      } else {
        toast.error(res.error ?? "Erreur");
      }
    },
    [group.id, loadMembers],
  );

  const handleLeaveGroup = useCallback(async () => {
    if (!currentUser) return;
    const res = await removeGroupMember(group.id, currentUser.id);
    if (res.success) {
      toast.success("Vous avez quitté le groupe");
      window.location.href = "/groups";
    } else {
      toast.error(res.error ?? "Erreur");
    }
  }, [group.id, currentUser]);

  const handleArchiveGroup = useCallback(async () => {
    const res = await archiveGroup(group.id);
    if (res.success) {
      toast.success("Groupe archivé");
      window.location.href = "/groups";
    } else {
      toast.error(res.error ?? "Erreur");
    }
  }, [group.id]);

  // ── Sub-view header with back button ─────────────────────

  const ViewHeader = ({
    title,
    backTo = "main",
  }: {
    title: string;
    backTo?: View;
  }) => (
    <div className="flex items-center gap-3 px-4 py-3 border-b">
      <button
        onClick={() => setView(backTo)}
        className="p-1 rounded-full hover:bg-muted cursor-pointer"
      >
        <ArrowLeft className="size-5" />
      </button>
      <h2 className="text-base font-semibold">{title}</h2>
    </div>
  );

  // ── Content via useMemo ─────────────────────────────────

  const visIcon = group.visibility === "public" ? Globe : group.visibility === "private" ? Lock : EyeOff;
  const VisIcon = visIcon;
  const visLabel = group.visibility === "public" ? "Public" : group.visibility === "private" ? "Privé" : "Secret";
  const previewMembers = members.slice(0, 5);

  // ── SUB VIEWS (full-screen overlays) ──────────────────

  // Members full view
  if (view === "members-full") {
    return (
      <div className="flex flex-col h-full">
        <ViewHeader title={`Membres (${members.length})`} />

        {canManageMembers(myRole) && (
          <button
            onClick={() => setView("add-member")}
            className="flex items-center gap-3 px-4 py-3 hover:bg-accent text-left cursor-pointer border-b"
          >
            <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="size-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-primary">
              Ajouter un membre
            </span>
          </button>
        )}

        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              myRole={myRole}
              currentUserId={currentUser?.id ?? ""}
              onRemove={handleRemoveMember}
              onUpdateRole={handleUpdateRole}
              loadingDelete={loadingDeleteUser}
              loadingUpdateRole={loadingUpdateRole}
            />
          ))}

          {loadingMembers && (
            <div className="flex justify-center py-4">
              <Spinner className="size-5" />
            </div>
          )}

          {membersHasMore && !loadingMembers && (
            <button
              onClick={() => loadMembers(membersCursor)}
              className="w-full text-sm text-primary py-3 hover:bg-accent cursor-pointer"
            >
              Charger plus
            </button>
          )}
        </div>
      </div>
    );
  }

  // Add member view
  if (view === "add-member") {
    return (
      <div className="flex flex-col h-full">
        <ViewHeader title="Ajouter un membre" backTo="members-full" />

        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher un utilisateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {searching && (
            <div className="flex justify-center py-4">
              <Spinner className="size-5" />
            </div>
          )}

          {!searching &&
            searchResults.length === 0 &&
            searchQuery.length >= 2 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun utilisateur trouvé
              </p>
            )}

          {searchResults.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent"
            >
              <Avatar className="size-9">
                <AvatarImage src={user.avatarUrl ?? ""} />
                <AvatarFallback
                  className={`text-xs font-bold ${getAvatarFallbackColor(user.displayName ?? user.username)}`}
                >
                  {getInitials(user.displayName ?? user.username)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.displayName ?? user.username}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  @{user.username}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer"
                disabled={addingUserId === user.id}
                onClick={() => handleAddMember(user.id)}
              >
                {addingUserId === user.id ? (
                  <Spinner className="size-3" />
                ) : (
                  <UserPlus className="size-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Requests full view
  if (view === "requests-full") {
    return (
      <div className="flex flex-col h-full">
        <ViewHeader title="Demandes d'adhésion" />

        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {requests.length === 0 && !loadingRequests && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune demande en attente
            </p>
          )}

          {requests.map((req) => (
            <div
              key={req.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-accent"
            >
              <Avatar className="size-9">
                <AvatarImage src={req.user.avatarUrl ?? ""} />
                <AvatarFallback
                  className={`text-xs font-bold ${getAvatarFallbackColor(req.user.displayName ?? req.user.username)}`}
                >
                  {getInitials(req.user.displayName ?? req.user.username)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {req.user.displayName ?? req.user.username}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  @{req.user.username}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                  onClick={() => handleJoinDecision(req.id, "accepted")}
                >
                  <Check className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={() => handleJoinDecision(req.id, "rejected")}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}

          {loadingRequests && (
            <div className="flex justify-center py-4">
              <Spinner className="size-5" />
            </div>
          )}

          {requestsHasMore && !loadingRequests && (
            <button
              onClick={() => loadRequests(requestsCursor)}
              className="w-full text-sm text-primary py-3 hover:bg-accent cursor-pointer"
            >
              Charger plus
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── MAIN VIEW — scrollable sections ────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header — compact community card */}
      <div className="p-4 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="size-14 rounded-xl">
            <AvatarImage src={group.imageUrl ?? ""} alt={group.name} />
            <AvatarFallback
              className={`rounded-xl text-xl font-bold ${getAvatarFallbackColor(group.name)}`}
            >
              {getInitials(group.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold truncate">{group.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="size-3" />
                {group._count.memberships} membres
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <VisIcon className="size-3" />
                {visLabel}
              </span>
            </div>
            {group.organization && (
              <Badge variant="outline" className="text-[10px] mt-1 h-4 px-1.5 font-normal">
                {group.organization.name}
              </Badge>
            )}
          </div>
        </div>
        {group.description && (
          <p className="text-xs text-muted-foreground mt-2.5 leading-relaxed">
            {group.description}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground/70 mt-2">
          Créé par{" "}
          <span className="font-medium text-muted-foreground">
            {group.creator.displayName ?? group.creator.username}
          </span>{" "}
          · {new Date(group.createdAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>

      {/* ── Scrollable sections ── */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">

      {/* ── Edit Section (collapsible) ── */}
      {canEditGroup(myRole) && (
        <div className="mx-4 mb-3 rounded-xl border overflow-hidden">
          <button
            onClick={() => setEditOpen(!editOpen)}
            className="flex items-center gap-3 w-full px-3.5 py-2.5 text-left hover:bg-accent cursor-pointer"
          >
            <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Pencil className="size-3.5 text-primary" />
            </div>
            <span className="text-sm font-medium flex-1">Modifier</span>
            {editOpen ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </button>

          {editOpen && (
            <div className="px-3.5 pb-3.5 space-y-3 border-t pt-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Nom
                </label>
                <Input
                  value={editForm.name ?? ""}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Description
                </label>
                <Textarea
                  value={editForm.description ?? ""}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Visibilité
                </label>
                <Select
                  value={editForm.visibility ?? "public"}
                  onValueChange={(v) =>
                    setEditForm((prev) => ({
                      ...prev,
                      visibility: v as "public" | "private" | "secret",
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Privé</SelectItem>
                    <SelectItem value="secret">Secret</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full cursor-pointer"
                size="sm"
                onClick={handleSaveEdit}
                disabled={saving}
              >
                {saving ? <Spinner className="size-3.5" /> : "Enregistrer"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Members Section ── */}
      <div className="mx-4 mb-3 rounded-xl border overflow-hidden">
        <button
          onClick={() => setView("members-full")}
          className="flex items-center gap-3 w-full px-3.5 py-2.5 text-left hover:bg-accent cursor-pointer"
        >
          <div className="size-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Users className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-sm font-medium flex-1">
            Membres · {members.length || group._count.memberships}
          </span>
          <ChevronDown className="size-4 text-muted-foreground -rotate-90" />
        </button>

        {/* Member preview list */}
        {previewMembers.length > 0 && (
          <div className="border-t">
            {previewMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-2.5 px-3.5 py-2">
                <Avatar className="size-7">
                  <AvatarImage src={member.user.avatarUrl ?? ""} />
                  <AvatarFallback
                    className={`text-[10px] font-bold ${getAvatarFallbackColor(member.user.displayName ?? member.user.username)}`}
                  >
                    {getInitials(member.user.displayName ?? member.user.username)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs truncate flex-1">
                  {member.user.displayName ?? member.user.username}
                </span>
                {ROLE_ICONS[member.role] && (
                  <span className="shrink-0">{ROLE_ICONS[member.role]}</span>
                )}
              </div>
            ))}
            {(members.length > 5 || membersHasMore) && (
              <button
                onClick={() => setView("members-full")}
                className="w-full text-xs text-primary py-2 hover:bg-accent cursor-pointer border-t"
              >
                Voir tous les membres
              </button>
            )}
          </div>
        )}

        {loadingMembers && previewMembers.length === 0 && (
          <div className="flex justify-center py-3 border-t">
            <Spinner className="size-4" />
          </div>
        )}
      </div>

      {/* ── Requests Section ── */}
      {canManageMembers(myRole) && (
        <div className="mx-4 mb-3 rounded-xl border overflow-hidden">
          <button
            onClick={() => setView("requests-full")}
            className="flex items-center gap-3 w-full px-3.5 py-2.5 text-left hover:bg-accent cursor-pointer"
          >
            <div className="size-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <UserPlus className="size-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-medium flex-1">
              Demandes d&apos;adhésion
            </span>
            {requests.length > 0 && (
              <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full px-1.5 leading-4">
                {requests.length}
              </span>
            )}
            <ChevronDown className="size-4 text-muted-foreground -rotate-90" />
          </button>
        </div>
      )}

      {/* ── Danger zone ── */}
      <div className="mx-4 mb-4 pt-2 space-y-2">
        <Dialog>
          <DialogTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-red-200/60 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/50 text-left cursor-pointer">
              <LogOut className="size-4 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">
                Quitter le groupe
              </span>
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Quitter le groupe ?</DialogTitle>
              <DialogDescription>
                Vous serez retiré de {group.name} et ne pourrez plus accéder
                à son contenu.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" className="cursor-pointer">
                  Annuler
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleLeaveGroup}
                className="cursor-pointer"
              >
                Quitter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {canArchive(myRole) && (
          <Dialog>
            <DialogTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-red-200/60 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/50 text-left cursor-pointer">
                <Trash2 className="size-4 text-red-500" />
                <span className="text-sm text-red-600 dark:text-red-400">
                  Archiver le groupe
                </span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Archiver {group.name} ?</DialogTitle>
                <DialogDescription>
                  Le groupe sera archivé et ne sera plus accessible. Cette
                  action est irréversible.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" className="cursor-pointer">
                    Annuler
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleArchiveGroup}
                  className="cursor-pointer"
                >
                  Archiver
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      </div>{/* end scrollable sections */}
    </div>
  );
}

function MemberRow({
  member,
  myRole,
  currentUserId,
  onRemove,
  onUpdateRole,
  loadingDelete,
  loadingUpdateRole,
}: {
  member: GroupMember;
  myRole: GroupRole | null;
  currentUserId: string;
  onRemove: (userId: string) => void;
  onUpdateRole: (userId: string, role: GroupRole) => void;
  loadingDelete: boolean;
  loadingUpdateRole: boolean;
}) {
  const isMe = member.user.id === currentUserId;
  const canManage =
    !isMe && myRole && ROLE_HIERARCHY[myRole] > ROLE_HIERARCHY[member.role];

  const assignableRoles: GroupRole[] = myRole
    ? (["admin", "moderator", "member"] as GroupRole[]).filter(
        (r) => ROLE_HIERARCHY[r] < ROLE_HIERARCHY[myRole],
      )
    : [];

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted group">
      <Avatar className="size-9">
        <AvatarImage src={member.user.avatarUrl ?? ""} />
        <AvatarFallback
          className={`text-xs font-bold ${getAvatarFallbackColor(member.user.displayName ?? member.user.username)}`}
        >
          {getInitials(member.user.displayName ?? member.user.username)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">
            {member.user.displayName ?? member.user.username}
            {isMe && (
              <span className="text-xs text-muted-foreground ml-1">(vous)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {ROLE_ICONS[member.role]}
          <span className="text-xs text-muted-foreground">
            {ROLE_LABELS[member.role]}
          </span>
        </div>
      </div>

      {/* Actions: change role / remove */}
      {canManage && (
        <div className="flex flex-row items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {loadingUpdateRole ? (
            <Spinner className="size-3" />
          ) : (
            assignableRoles.length > 0 && (
              <Select
                value={member.role}
                onValueChange={(v) =>
                  onUpdateRole(member.user.id, v as GroupRole)
                }
              >
                <SelectTrigger className="h-7 text-xs w-auto gap-1 px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      <div className="flex items-center gap-1.5">
                        {ROLE_ICONS[r]}
                        {ROLE_LABELS[r]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          )}

          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                disabled={loadingDelete}
              >
                {loadingDelete ? (
                  <Spinner className="size-3" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Retirer ce membre ?</DialogTitle>
                <DialogDescription>
                  {member.user.displayName ?? member.user.username} sera retiré
                  définitivement du groupe. Cette action est irréversible.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" className="cursor-pointer">
                    Annuler
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={() => onRemove(member.user.id)}
                  className="cursor-pointer"
                >
                  {loadingDelete ? <Spinner className="size-3" /> : null}
                  {"Retirer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
