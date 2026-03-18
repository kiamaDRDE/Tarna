"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
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
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
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

type Tab = "main" | "edit" | "members" | "add-member" | "requests" | "danger";

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

  const [tab, setTab] = useState<Tab>("main");

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
    if (tab === "members" && members.length === 0) loadMembers();
    if (tab === "requests" && requests.length === 0) loadRequests();
  }, [tab, members.length, requests.length, loadMembers, loadRequests]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const users = await searchUsers(searchQuery);
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
      setTab("main");
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

  // ── Tab header with back button ─────────────────────────

  const TabHeader = ({
    title,
    backTo = "main",
  }: {
    title: string;
    backTo?: Tab;
  }) => (
    <div className="flex items-center gap-3 px-4 py-3 border-b">
      <button
        onClick={() => setTab(backTo)}
        className="p-1 rounded-full hover:bg-muted cursor-pointer"
      >
        <ArrowLeft className="size-5" />
      </button>
      <h2 className="text-base font-semibold">{title}</h2>
    </div>
  );

  // ── Content via useMemo ─────────────────────────────────

  const content = useMemo(() => {
    // ── MAIN ────────────────────────────────────────────
    if (tab === "main") {
      return (
        <div className="flex flex-col h-full">
          {/* Group header */}
          <div className="flex flex-col items-center py-6 gap-2">
            <Avatar className="size-20">
              <AvatarImage src={group.imageUrl ?? ""} alt={group.name} />
              <AvatarFallback
                className={`text-3xl font-bold ${getAvatarFallbackColor(group.name)}`}
              >
                {getInitials(group.name)}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-bold">{group.name}</h2>
            <p className="text-xs text-muted-foreground">
              Groupe · {group._count.memberships} membres
            </p>
          </div>

          <Separator />

          {/* Info */}
          {group.description && (
            <div className="px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{group.description}</p>
            </div>
          )}

          <div className="px-4 py-2 flex flex-wrap gap-1.5">
            <Badge variant="outline">{group.visibility}</Badge>
            {group.organization && (
              <Badge variant="secondary">{group.organization.name}</Badge>
            )}
          </div>

          <Separator />

          {/* Menu items */}
          <div className="flex flex-col">
            {canEditGroup(myRole) && (
              <button
                onClick={() => setTab("edit")}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted text-left cursor-pointer"
              >
                <Pencil className="size-4 text-muted-foreground" />
                <span className="text-sm flex-1">
                  Modifier les informations
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            )}

            <button
              onClick={() => setTab("members")}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted text-left cursor-pointer"
            >
              <Users className="size-4 text-muted-foreground" />
              <span className="text-sm flex-1">
                Membres ({members.length || group._count.memberships})
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>

            {canManageMembers(myRole) && (
              <button
                onClick={() => setTab("requests")}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted text-left cursor-pointer"
              >
                <UserPlus className="size-4 text-muted-foreground" />
                <span className="text-sm flex-1">
                  Demandes d&apos;adhésion
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            )}

            <Separator />

            <button
              onClick={() => setTab("danger")}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted text-left cursor-pointer"
            >
              <LogOut className="size-4 text-red-500" />
              <span className="text-sm text-red-500 flex-1">
                Quitter / Supprimer
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          </div>

          {/* Creator */}
          <div className="mt-auto px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground">
              Créé par{" "}
              <span className="font-medium text-foreground">
                {group.creator.displayName ?? group.creator.username}
              </span>{" "}
              le{" "}
              {new Date(group.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      );
    }

    // ── EDIT ────────────────────────────────────────────
    if (tab === "edit") {
      return (
        <div className="flex flex-col h-full">
          <TabHeader title="Modifier le groupe" />
          <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-4">
            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
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
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
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
          </div>
          <div className="p-4 border-t">
            <Button
              className="w-full cursor-pointer"
              onClick={handleSaveEdit}
              disabled={saving}
            >
              {saving ? <Spinner className="size-4" /> : "Enregistrer"}
            </Button>
          </div>
        </div>
      );
    }

    // ── MEMBERS ─────────────────────────────────────────
    if (tab === "members") {
      return (
        <div className="flex flex-col h-full">
          <TabHeader title={`Membres (${members.length})`} />

          {/* Add member button */}
          {canManageMembers(myRole) && (
            <button
              onClick={() => setTab("add-member")}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted text-left cursor-pointer border-b"
            >
              <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center">
                <UserPlus className="size-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-primary">
                Ajouter un membre
              </span>
            </button>
          )}

          {/* Member list */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
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
                className="w-full text-sm text-primary py-3 hover:bg-muted cursor-pointer"
              >
                Charger plus
              </button>
            )}
          </div>
        </div>
      );
    }

    // ── ADD MEMBER ──────────────────────────────────────
    if (tab === "add-member") {
      return (
        <div className="flex flex-col h-full">
          <TabHeader title="Ajouter un membre" backTo="members" />

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

          <div className="flex-1 overflow-y-auto no-scrollbar">
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
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted"
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

    // ── REQUESTS ────────────────────────────────────────
    if (tab === "requests") {
      return (
        <div className="flex flex-col h-full">
          <TabHeader title="Demandes d'adhésion" />

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {requests.length === 0 && !loadingRequests && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune demande en attente
              </p>
            )}

            {requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted"
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
                    className="cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleJoinDecision(req.id, "accepted")}
                  >
                    <Check className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-50"
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
                className="w-full text-sm text-primary py-3 hover:bg-muted cursor-pointer"
              >
                Charger plus
              </button>
            )}
          </div>
        </div>
      );
    }

    // ── DANGER ZONE ─────────────────────────────────────
    if (tab === "danger") {
      return (
        <div className="flex flex-col h-full">
          <TabHeader title="Quitter / supprimer" />
          <div className="flex-1 px-4 py-4 space-y-4">
            {/* Quitter */}
            <Dialog>
              <DialogTrigger asChild>
                <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950 text-left cursor-pointer">
                  <LogOut className="size-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-red-600">
                      Quitter le groupe
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vous ne pourrez plus voir le contenu
                    </p>
                  </div>
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

            {/* Archiver */}
            {canArchive(myRole) && (
              <Dialog>
                <DialogTrigger asChild>
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950 text-left cursor-pointer">
                    <Trash2 className="size-5 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-red-600">
                        Archiver le groupe
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cette action est irréversible
                      </p>
                    </div>
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
        </div>
      );
    }

    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tab,
    group,
    myRole,
    members,
    membersHasMore,
    loadingMembers,
    requests,
    requestsHasMore,
    loadingRequests,
    editForm,
    saving,
    searchQuery,
    searchResults,
    searching,
    addingUserId,
    currentUser,
    membersCursor,
    requestsCursor,
    handleSaveEdit,
    handleAddMember,
    handleRemoveMember,
    handleUpdateRole,
    handleJoinDecision,
    handleLeaveGroup,
    handleArchiveGroup,
    loadMembers,
    loadRequests,
  ]);

  return <div className="flex flex-col h-full">{content}</div>;
}

// ── MemberRow sub-component ──────────────────────────────────

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
