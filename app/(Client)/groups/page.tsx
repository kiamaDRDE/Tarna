"use client";

import GroupCard from "@/src/components/personnal/ui/groupCard";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/src/components/ui/input-group";
import { Label } from "@/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import type { GroupResponse } from "@/src/types/group";
import type { UserSearchResult } from "@/src/types/user";
import { getInitials } from "@/src/lib/getInitials";
import {
  Users,
  Plus,
  Search,
  Compass,
  Clock,
  Loader2,
  X,
  UserPlus,
  Globe,
  Lock,
  EyeOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchMyGroups,
  fetchDiscoverGroups,
  fetchPendingGroups,
  createGroup,
  requestJoinGroup,
  cancelGroupJoinRequest,
  searchUsers,
} from "./action";
import { useUserStore } from "@/src/store/userStore";
import { useGroupStore } from "@/src/store/groupStore";
import { useOrganizationStore } from "@/src/store/organizationStore";
import { toast } from "sonner";
import { getAvatarFallbackColor } from "@/src/lib/avatarColor";
import { fetchMyOrgs } from "../organizations/action";

// ── Types & constants ────────────────────────────────────────

type Tab = "my-groups" | "discover" | "pending";

const tabDefs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "my-groups", label: "Mes groupes", icon: Users },
  { key: "discover", label: "Découvrir", icon: Compass },
  { key: "pending", label: "En attente", icon: Clock },
];

// ── Page component ───────────────────────────────────────────

const GroupsPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>("my-groups");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const userId = useUserStore((s) => s.user?.id);

  // Group store
  const tabs = useGroupStore((s) => s.tabs);
  const setTab = useGroupStore((s) => s.setTab);
  const addGroup = useGroupStore((s) => s.addGroup);
  const moveGroup = useGroupStore((s) => s.moveGroup);
  const loading = useGroupStore((s) => s.loading);
  const storeSetLoading = useGroupStore((s) => s.setLoading);

  // Aliases
  const myGroups = tabs["my-groups"].data;
  const discoverGroups = tabs.discover.data;
  const pendingGroups = tabs.pending.data;
  const loaded = {
    "my-groups": tabs["my-groups"].loaded,
    discover: tabs.discover.loaded,
    pending: tabs.pending.loaded,
  };

  const [loadingCreate, setLoadingCreate] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // ── Organization list for optional org link ────────────────
  const orgTabs = useOrganizationStore((s) => s.tabs);
  const setOrgTab = useOrganizationStore((s) => s.setTab);
  const myOrgs = orgTabs["my-orgs"].data;

  useEffect(() => {
    if (isAuthenticated && !orgTabs["my-orgs"].loaded) {
      fetchMyOrgs().then((res) => setOrgTab("my-orgs", res));
    }
  }, [isAuthenticated, orgTabs, setOrgTab, userId]);

  // ── Member search state ────────────────────────────────────
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<UserSearchResult[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<UserSearchResult[]>(
    [],
  );
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Data fetchers ──────────────────────────────────────────

  const loadTab = useCallback(
    async (tab: Tab) => {
      if (!isAuthenticated) return;
      storeSetLoading(true);
      try {
        let res: Awaited<ReturnType<typeof fetchMyGroups>>;
        switch (tab) {
          case "my-groups":
            res = await fetchMyGroups();
            break;
          case "discover":
            res = await fetchDiscoverGroups();
            break;
          case "pending":
            res = await fetchPendingGroups();
            break;
        }
        setTab(tab, res);
      } catch {
        toast.error(
          "Une erreur est survenue lors de la récupération des groupes.",
        );
      } finally {
        storeSetLoading(false);
      }
    },
    [isAuthenticated, setTab, storeSetLoading, userId],
  );

  // Load current tab if not yet loaded
  useEffect(() => {
    if (!loaded[activeTab]) {
      void loadTab(activeTab);
    }
  }, [activeTab, loaded, loadTab, userId]);

  // ── Debounced member search ────────────────────────────────

  const handleMemberSearch = useCallback(
    (value: string) => {
      setMemberSearch(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (value.trim().length < 2) {
        setMemberResults([]);
        setSearchingMembers(false);
        return;
      }

      setSearchingMembers(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const results = await searchUsers(value, selectedOrgId);
          const selectedIds = new Set(selectedMembers.map((m) => m.id));
          setMemberResults(results.filter((u) => !selectedIds.has(u.id)));
        } catch {
          setMemberResults([]);
        } finally {
          setSearchingMembers(false);
        }
      }, 350);
    },
    [selectedMembers, selectedOrgId],
  );

  const addMember = useCallback(
    (user: UserSearchResult) => {
      if (selectedMembers.some((m) => m.id === user.id)) return;
      setSelectedMembers((prev) => [...prev, user]);
      setMemberSearch("");
      setMemberResults([]);
    },
    [selectedMembers],
  );

  const removeMember = useCallback((userId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== userId));
  }, []);

  // ── Derived lists ──────────────────────────────────────────

  const currentList: GroupResponse[] = useMemo(() => {
    const list =
      activeTab === "my-groups"
        ? myGroups
        : activeTab === "discover"
          ? discoverGroups
          : pendingGroups;

    if (!search.trim()) return list;

    const q = search.toLowerCase();
    return list.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.description ?? "").toLowerCase().includes(q),
    );
  }, [activeTab, search, myGroups, discoverGroups, pendingGroups]);

  const totalMembers = useMemo(
    () => myGroups.reduce((sum, g) => sum + g._count.memberships, 0),
    [myGroups],
  );

  // ── Handlers ──────────────────────────────────────────────

  const handleCreateGroup = useCallback(
    async (event: React.SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);
      const name = (formData.get("name") as string)?.trim();
      const description = (formData.get("description") as string)?.trim();
      const visibility = (formData.get("visibility") as string)?.trim() || "public";
      const orgId = (formData.get("orgId") as string)?.trim() || undefined;

      if (!name) {
        toast.error("Le nom du groupe est requis.");
        return;
      }

      setLoadingCreate(true);
      try {
        const result = await createGroup({
          name,
          description: description || undefined,
          visibility: visibility as "public" | "private" | "secret",
          orgId: orgId || undefined,
          memberIds: selectedMembers.map((m) => m.id),
        });
        if (!result.success || !result.group) {
          toast.error(
            result.error ??
              "Une erreur est survenue lors de la création du groupe.",
          );
          return;
        }

        addGroup("my-groups", result.group);
        form.reset();
        setSelectedMembers([]);
        setMemberSearch("");
        setMemberResults([]);
        setSelectedOrgId(undefined);
        setDialogOpen(false);
        toast.success("Groupe créé avec succès !");
      } catch {
        toast.error(
          "Une erreur est survenue lors de la création du groupe.",
        );
      } finally {
        setLoadingCreate(false);
      }
    },
    [addGroup, selectedMembers],
  );

  // ── Rejoindre un groupe ────────────────────────────────────

  const handleJoin = useCallback(
    async (groupId: string) => {
      setActionLoadingId(groupId);
      try {
        const result = await requestJoinGroup(groupId);
        if (!result.success) {
          toast.error(result.error ?? "Impossible d'envoyer la demande.");
          return;
        }
        moveGroup("discover", "pending", groupId);
        toast.success("Demande envoyée !");
      } catch {
        toast.error("Une erreur est survenue.");
      } finally {
        setActionLoadingId(null);
      }
    },
    [moveGroup],
  );

  // ── Annuler une demande ────────────────────────────────────

  const handleCancel = useCallback(
    async (groupId: string) => {
      setActionLoadingId(groupId);
      try {
        const result = await cancelGroupJoinRequest(groupId);
        if (!result.success) {
          toast.error(result.error ?? "Impossible d'annuler la demande.");
          return;
        }
        moveGroup("pending", "discover", groupId);
        toast.success("Demande annulée.");
      } catch {
        toast.error("Une erreur est survenue.");
      } finally {
        setActionLoadingId(null);
      }
    },
    [moveGroup],
  );

  return (
    <div className="xl:w-2xl xl:max-w-2xl w-full pb-20 flex flex-col gap-4 h-full overflow-scroll hide-scrollbar md:px-10 xl:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row w-full gap-3 justify-between pt-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="size-6" />
            Groupes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rejoignez des communautés, échangez et collaborez avec des personnes
            partageant vos centres d&apos;intérêt.
          </p>
        </div>
        <div className="flex flex-col justify-end shrink-0">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex flex-row items-center gap-2 cursor-pointer">
                <Plus className="size-4" />
                Créer un groupe
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md md:max-w-lg">
              <form onSubmit={handleCreateGroup}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Users className="size-5" />
                    Créer un groupe
                  </DialogTitle>
                  <DialogDescription>
                    Créez une communauté sur Tarna. Vous en serez automatiquement
                    le propriétaire (Owner).
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                  {/* Nom */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="group-name">Nom du groupe *</Label>
                    <Input
                      id="group-name"
                      name="name"
                      placeholder="Ex : React & Next.js Africa, DevOps Cameroun"
                      required
                    />
                  </div>

                  {/* Visibilité & Organisation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Visibilité */}
                    <div className="flex flex-col gap-1.5">
                      <Label>Visibilité *</Label>
                      <Select name="visibility" defaultValue="public">
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">
                            <div className="flex items-center gap-1.5">
                              <Globe className="size-3.5" />
                              Public
                            </div>
                          </SelectItem>
                          <SelectItem value="private">
                            <div className="flex items-center gap-1.5">
                              <Lock className="size-3.5" />
                              Privé
                            </div>
                          </SelectItem>
                          <SelectItem value="secret">
                            <div className="flex items-center gap-1.5">
                              <EyeOff className="size-3.5" />
                              Secret
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Organisation (optionnel) */}
                    <div className="flex flex-col gap-1.5">
                      <Label>Organisation (optionnel)</Label>
                      <Select
                        name="orgId"
                        value={selectedOrgId ?? ""}
                        onValueChange={(v) => {
                          setSelectedOrgId(v || undefined);
                          // Réinitialiser la recherche de membres quand l'org change
                          setSelectedMembers([]);
                          setMemberSearch("");
                          setMemberResults([]);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Aucune" />
                        </SelectTrigger>
                        <SelectContent>
                          {myOrgs.map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Rattacher ce groupe à une de vos organisations.
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="group-description">Description</Label>
                    <Textarea
                      id="group-description"
                      name="description"
                      placeholder="Décrivez brièvement votre groupe, ses objectifs et ses thèmes..."
                      rows={3}
                    />
                  </div>

                  {/* Ajouter des membres */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="flex items-center gap-1.5">
                      <UserPlus className="size-4" />
                      Ajouter des membres
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {selectedOrgId
                        ? "Recherchez parmi les membres de l'organisation sélectionnée."
                        : "Recherchez des utilisateurs à inviter directement comme membres."}
                    </p>

                    {/* Chips des membres sélectionnés */}
                    {selectedMembers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedMembers.map((member) => (
                          <Badge
                            key={member.id}
                            variant="secondary"
                            className="flex items-center gap-1 pr-1"
                          >
                            <Avatar size="sm" className="size-4">
                              {member.avatarUrl && (
                                <AvatarImage
                                  src={member.avatarUrl}
                                  alt={member.username}
                                />
                              )}
                              <AvatarFallback
                                className={`text-[8px] ${getAvatarFallbackColor(
                                  getInitials(
                                    member.displayName ?? member.username,
                                  ),
                                )}`}
                              >
                                {getInitials(
                                  member.displayName ?? member.username,
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs">
                              {member.displayName ?? member.username}
                            </span>
                            <button
                              type="button"
                              className="ml-0.5 rounded-full p-0.5 hover:bg-muted cursor-pointer"
                              onClick={() => removeMember(member.id)}
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Search input */}
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <Search className="size-4 text-muted-foreground shrink-0" />
                        <Input
                          placeholder="Rechercher par nom ou username..."
                          value={memberSearch}
                          onChange={(e) => handleMemberSearch(e.target.value)}
                          autoComplete="off"
                        />
                      </div>

                      {/* Search results dropdown */}
                      {(memberResults.length > 0 || searchingMembers) && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                          {searchingMembers && memberResults.length === 0 ? (
                            <div className="flex items-center justify-center py-3">
                              <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            memberResults.map((user) => (
                              <button
                                key={user.id}
                                type="button"
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                                onClick={() => addMember(user)}
                              >
                                <Avatar size="sm">
                                  {user.avatarUrl && (
                                    <AvatarImage
                                      src={user.avatarUrl}
                                      alt={user.username}
                                    />
                                  )}
                                  <AvatarFallback
                                    className={`text-[9px] ${getAvatarFallbackColor(
                                      getInitials(
                                        user.displayName ?? user.username,
                                      ),
                                    )}`}
                                  >
                                    {getInitials(
                                      user.displayName ?? user.username,
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start">
                                  <span className="font-medium leading-tight">
                                    {user.displayName ?? user.username}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    @{user.username}
                                  </span>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" type="button">
                      Annuler
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={loadingCreate}>
                    {loadingCreate ? (
                      <Loader2 className="size-4 mr-1.5 animate-spin" />
                    ) : (
                      <Users className="size-4 mr-1.5" />
                    )}
                    Créer le groupe
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2 rounded-lg border p-3 bg-muted/30">
          <Users className="size-4 text-primary" />
          <div>
            <p className="text-lg font-bold leading-none">{myGroups.length}</p>
            <p className="text-[11px] text-muted-foreground">Mes groupes</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border p-3 bg-muted/30">
          <Users className="size-4 text-primary" />
          <div>
            <p className="text-lg font-bold leading-none">
              {totalMembers.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground">Membres total</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border p-3 bg-muted/30">
          <Clock className="size-4 text-amber-500" />
          <div>
            <p className="text-lg font-bold leading-none">
              {pendingGroups.length}
            </p>
            <p className="text-[11px] text-muted-foreground">En attente</p>
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <InputGroup className="w-full">
        <InputGroupInput
          placeholder="Rechercher un groupe par nom, description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
      </InputGroup>

      {/* Onglets */}
      <div className="flex flex-row gap-2">
        {tabDefs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <Button
              key={tab.key}
              variant={isActive ? "default" : "outline"}
              size="sm"
              className={`cursor-pointer gap-1.5 rounded-full text-black dark:text-white ${isActive ? "bg-primary/20 hover:bg-primary/30" : "bg-transparent hover:bg-primary/10"}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon className="size-3.5" />
              {tab.label}
              {tab.key === "pending" && pendingGroups.length > 0 && (
                <span
                  className={`ml-0.5 text-[10px] font-bold rounded-full px-1.5 ${
                    isActive
                      ? "bg-primary-foreground/20"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {pendingGroups.length}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Grille de groupes */}
      {loading && !loaded[activeTab] ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : currentList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Search className="size-10 opacity-30" />
          <p className="text-sm text-center">
            {search.trim()
              ? "Aucun groupe ne correspond à votre recherche."
              : activeTab === "my-groups"
                ? "Vous n'êtes membre d'aucun groupe pour le moment."
                : activeTab === "pending"
                  ? "Aucune demande d'adhésion en attente."
                  : "Aucun groupe disponible pour le moment."}
          </p>
          {activeTab !== "discover" && !search.trim() && (
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setActiveTab("discover")}
            >
              <Compass className="size-4 mr-1.5" />
              Découvrir des groupes
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentList.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              variant={
                activeTab === "my-groups"
                  ? "mine"
                  : activeTab === "discover"
                    ? "discover"
                    : "pending"
              }
              actionLoading={actionLoadingId === group.id}
              onJoin={handleJoin}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupsPage;
