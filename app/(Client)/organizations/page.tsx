"use client";

import OrgCard from "@/src/components/personnal/ui/orgCard";
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
import type { OrganizationResponse } from "@/src/types/organization";
import type { UserSearchResult } from "@/src/types/user";
import { getInitials } from "@/src/lib/getInitials";
import {
  Building2,
  Plus,
  Search,
  Users,
  Compass,
  Clock,
  Globe,
  Loader2,
  X,
  UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchMyOrgs,
  fetchDiscoverOrgs,
  fetchPendingOrgs,
  createOrganization,
  requestJoinOrg,
  cancelJoinRequest,
  searchUsers,
} from "./action";
import { useUserStore } from "@/src/store/userStore";
import { useOrganizationStore } from "@/src/store/organizationStore";
import { toast } from "sonner";
import { getAvatarFallbackColor } from "@/src/lib/avatarColor";

// ── Types & constants ────────────────────────────────────────

type Tab = "my-orgs" | "discover" | "pending";

const tabDefs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "my-orgs", label: "Mes organisations", icon: Building2 },
  { key: "discover", label: "Découvrir", icon: Compass },
  { key: "pending", label: "En attente", icon: Clock },
];

const sectors = [
  "Technologie",
  "Infrastructure & Cloud",
  "Design & Création",
  "Éducation & Formation",
  "Data & Intelligence Artificielle",
  "Développement Mobile",
  "Entrepreneuriat",
  "Cybersécurité",
  "Blockchain & Web3",
  "Santé",
  "Finance",
  "Agriculture",
  "Autre",
];

const countries = [
  "Cameroun",
  "Sénégal",
  "Côte d'Ivoire",
  "Gabon",
  "Congo",
  "Tchad",
  "Bénin",
  "Togo",
  "Mali",
  "Burkina Faso",
  "Autre",
];

// ── Page component ───────────────────────────────────────────

const OrganizationsPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>("my-orgs");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);

  // Organisation store
  const tabs = useOrganizationStore((s) => s.tabs);
  const setTab = useOrganizationStore((s) => s.setTab);
  const addOrg = useOrganizationStore((s) => s.addOrg);
  const moveOrg = useOrganizationStore((s) => s.moveOrg);
  // const removeOrg = useOrganizationStore((s) => s.removeOrg);
  const loading = useOrganizationStore((s) => s.loading);
  const storeSetLoading = useOrganizationStore((s) => s.setLoading);

  // Aliases pour lisibilité
  const myOrgs = tabs["my-orgs"].data;
  const discoverOrgs = tabs.discover.data;
  const pendingOrgs = tabs.pending.data;
  const loaded = useMemo(
    () => ({
      "my-orgs": tabs["my-orgs"].loaded,
      discover: tabs.discover.loaded,
      pending: tabs.pending.loaded,
    }),
    [tabs],
  );

  const [loadingCreate, setLoadingCreate] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // ── Member search state ────────────────────────────────────
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<UserSearchResult[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<UserSearchResult[]>(
    [],
  );
  const [searchingMembers, setSearchingMembers] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Data fetchers ──────────────────────────────────────────

  const loadTab = useCallback(
    async (tab: Tab) => {
      if (!isAuthenticated) return;
      storeSetLoading(true);
      try {
        let res: Awaited<ReturnType<typeof fetchMyOrgs>>;
        switch (tab) {
          case "my-orgs":
            res = await fetchMyOrgs();
            break;
          case "discover":
            res = await fetchDiscoverOrgs();
            break;
          case "pending":
            res = await fetchPendingOrgs();
            break;
        }
        setTab(tab, res);
      } catch {
        toast.error(
          "Une erreur est survenue lors de la récupération des organisations.",
        );
      } finally {
        storeSetLoading(false);
      }
    },
    [isAuthenticated, setTab, storeSetLoading],
  );

  // Load current tab if not yet loaded
  useEffect(() => {
    if (!loaded[activeTab]) {
      void loadTab(activeTab);
    }
  }, [activeTab, loaded, loadTab]);

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
          const results = await searchUsers(value);
          // Exclure les membres déjà sélectionnés
          const selectedIds = new Set(selectedMembers.map((m) => m.id));
          setMemberResults(results.filter((u) => !selectedIds.has(u.id)));
        } catch {
          setMemberResults([]);
        } finally {
          setSearchingMembers(false);
        }
      }, 350);
    },
    [selectedMembers],
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

  const currentList: OrganizationResponse[] = useMemo(() => {
    const list =
      activeTab === "my-orgs"
        ? myOrgs
        : activeTab === "discover"
          ? discoverOrgs
          : pendingOrgs;

    if (!search.trim()) return list;

    const q = search.toLowerCase();
    return list.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.bio ?? "").toLowerCase().includes(q) ||
        o.sector.toLowerCase().includes(q) ||
        o.domain.toLowerCase().includes(q) ||
        o.country.toLowerCase().includes(q),
    );
  }, [activeTab, search, myOrgs, discoverOrgs, pendingOrgs]);

  const totalMembers = useMemo(
    () => myOrgs.reduce((sum, o) => sum + o._count.memberships, 0),
    [myOrgs],
  );

  // ── Handlers ──────────────────────────────────────────────

  const handleCreateOrg = useCallback(
    async (event: React.SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);
      const name = (formData.get("name") as string)?.trim();
      const domain = (formData.get("domain") as string)?.trim();
      const country = (formData.get("country") as string)?.trim();
      const sector = (formData.get("sector") as string)?.trim();
      const description = (formData.get("description") as string)?.trim();

      // Validation
      if (!name) {
        toast.error("Le nom de l'organisation est requis.");
        return;
      }
      if (!country) {
        toast.error("Le pays de l'organisation est requis.");
        return;
      }
      if (!sector) {
        toast.error("Le secteur d'activité de l'organisation est requis.");
        return;
      }

      setLoadingCreate(true);
      try {
        const result = await createOrganization({
          name,
          domain,
          country,
          sector,
          bio: description,
          memberIds: selectedMembers.map((m) => m.id),
        });
        if (!result.success || !result.org) {
          toast.error(
            result.error ??
              "Une erreur est survenue lors de la création de l'organisation.",
          );
          return;
        }

        // Ajouter l'org au store « my-orgs » et fermer le dialog
        addOrg("my-orgs", result.org);
        form.reset();
        setSelectedMembers([]);
        setMemberSearch("");
        setMemberResults([]);
        setDialogOpen(false);
        toast.success("Organisation créée avec succès !");
      } catch {
        toast.error(
          "Une erreur est survenue lors de la création de l'organisation.",
        );
      } finally {
        setLoadingCreate(false);
      }
    },
    [addOrg, selectedMembers],
  );

  // ── Rejoindre une organisation ───────────────────────────────

  const handleJoin = useCallback(
    async (orgId: string) => {
      setActionLoadingId(orgId);
      try {
        const result = await requestJoinOrg(orgId);
        if (!result.success) {
          toast.error(result.error ?? "Impossible d'envoyer la demande.");
          return;
        }
        // Déplacer l'org de discover → pending dans le store
        moveOrg("discover", "pending", orgId);
        toast.success("Demande envoyée !");
      } catch {
        toast.error("Une erreur est survenue.");
      } finally {
        setActionLoadingId(null);
      }
    },
    [moveOrg],
  );

  // ── Annuler une demande ─────────────────────────────────────

  const handleCancel = useCallback(
    async (orgId: string) => {
      setActionLoadingId(orgId);
      try {
        const result = await cancelJoinRequest(orgId);
        if (!result.success) {
          toast.error(result.error ?? "Impossible d'annuler la demande.");
          return;
        }
        // Remettre l'org dans discover et la retirer de pending
        moveOrg("pending", "discover", orgId);
        toast.success("Demande annulée.");
      } catch {
        toast.error("Une erreur est survenue.");
      } finally {
        setActionLoadingId(null);
      }
    },
    [moveOrg],
  );

  return (
    <div className="xl:w-2xl xl:max-w-2xl w-full pb-20 flex flex-col gap-0 h-full overflow-scroll hide-scrollbar md:px-10 xl:px-0">
      {/* Community header */}
      <div className="relative rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 dark:border-primary/30 p-5 mt-6 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/15 dark:bg-primary/20 flex items-center justify-center">
              <Building2 className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Organisations</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gérez vos entités officielles, publiez du contenu et collaborez
                avec votre équipe.
              </p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex flex-row items-center gap-2 cursor-pointer">
                <Plus className="size-4" />
                Créer une organisation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md md:max-w-lg">
              <form onSubmit={handleCreateOrg}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="size-5" />
                    Créer une organisation
                  </DialogTitle>
                  <DialogDescription>
                    Lancez une entité officielle sur Tarna. Vous en serez
                    automatiquement le propriétaire (Owner).
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                  {/* Nom */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="org-name">
                      Nom de l&apos;organisation *
                    </Label>
                    <Input
                      id="org-name"
                      name="name"
                      placeholder="Ex : KIAMA Technologies, StartupHub"
                      required
                    />
                  </div>

                  {/* Domaine */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="org-domain">Domaine</Label>
                    <div className="flex items-center gap-2">
                      <Globe className="size-4 text-muted-foreground shrink-0" />
                      <Input
                        id="org-domain"
                        name="domain"
                        placeholder="Ex : kiama.cm, monentreprise.com"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Le domaine web associé à votre organisation (optionnel).
                    </p>
                  </div>

                  {/* Pays & Secteur côte à côte */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Pays */}
                    <div className="flex flex-col gap-1.5">
                      <Label>Pays *</Label>
                      <Select name="country" required>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner un pays" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Secteur d'activité */}
                    <div className="flex flex-col gap-1.5">
                      <Label>Secteur d&apos;activité *</Label>
                      <Select name="sector" required>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner un secteur" />
                        </SelectTrigger>
                        <SelectContent>
                          {sectors.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="org-description">Description</Label>
                    <Textarea
                      id="org-description"
                      name="description"
                      placeholder="Décrivez brièvement votre organisation, ses objectifs et son activité..."
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
                      Recherchez des utilisateurs à inviter directement comme
                      membres.
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
                      <Building2 className="size-4 mr-1.5" />
                    )}
                    {"Créer l'organisation"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Inline stats */}
      <div className="flex items-center gap-2 mb-3 px-1 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full px-2.5 py-1">
          <Building2 className="size-3" />
          {myOrgs.length} organisations
        </span>
        {pendingOrgs.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-full px-2.5 py-1">
            <Clock className="size-3" />
            {pendingOrgs.length} en attente
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {/* Barre de recherche */}
        <InputGroup className="w-full">
          <InputGroupInput
            placeholder="Rechercher une organisation par nom, secteur, pays..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>

        {/* Underline tabs */}
        <div className="flex border-b mb-4">
          {tabDefs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon className="size-3.5" />
                {tab.label}
                {tab.key === "pending" && pendingOrgs.length > 0 && (
                  <span className="ml-1 text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full px-1.5 leading-4">
                    {pendingOrgs.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Grille d'organisations */}
        {loading && !loaded[activeTab] ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : currentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Search className="size-10 opacity-30" />
            <p className="text-sm text-center">
              {search.trim()
                ? "Aucune organisation ne correspond à votre recherche."
                : activeTab === "my-orgs"
                  ? "Vous n'êtes membre d'aucune organisation pour le moment."
                  : activeTab === "pending"
                    ? "Aucune demande d'adhésion en attente."
                    : "Aucune organisation disponible pour le moment."}
            </p>
            {activeTab !== "discover" && !search.trim() && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => setActiveTab("discover")}
              >
                <Compass className="size-4 mr-1.5" />
                Découvrir des organisations
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentList.map((org) => (
              <OrgCard
                key={org.id}
                org={org}
                variant={
                  activeTab === "my-orgs"
                    ? "mine"
                    : activeTab === "discover"
                      ? "discover"
                      : "pending"
                }
                actionLoading={actionLoadingId === org.id}
                onJoin={handleJoin}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}
      </div>
    </div>
    // <InBuild/>
  );
};

export default OrganizationsPage;
