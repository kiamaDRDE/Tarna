"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import {
  Camera,
  Check,
  FileText,
  Loader2,
  Lock,
  Settings,
  Trash,
  UserCheck,
  UserPen,
  X,
} from "lucide-react";
import { useUserStore } from "@/src/store/userStore";
import { apiFetch } from "@/src/lib/api";
import { User } from "@/src/types/user";
import FeedItem from "@/src/components/personnal/ui/feedItem";
import { Post, ReceivePost } from "@/src/types/post";
import { Skeleton } from "@/src/components/ui/skeleton";
import { getInitials } from "@/src/lib/getInitials";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { getAvatarFallbackColor } from "@/src/lib/avatarColor";
import {
  changePasswordAction,
  deleteProfileAction,
  updateProfileAction,
  uploadProfileImageAction,
} from "../action";

interface UserProfile extends User {
  followers?: number;
  following?: number;
  postsCount?: number;
}

const formatCount = (value?: number) => {
  if (!value) return "0";
  if (value < 1000) return `${value}`;
  return `${(value / 1000).toFixed(1)}k`;
};

const ProfilePage = () => {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const currentUser = useUserStore((s) => s.user);
  const accessToken = useUserStore((s) => s.accessToken);
  const updateCurrentUser = useUserStore((s) => s.updateUser);
  const logout = useUserStore((s) => s.logout);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [editForm, setEditForm] = useState({
    userName: "",
    fullName: "",
    phone: "",
    bio: "",
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  //   const [isFollowing, setIsFollowing] = useState(false);
  //   const [followLoading, setFollowLoading] = useState(false);

  const BIO_MAX_LENGTH = 160;

  const openPasswordDialog = useCallback(() => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setPasswordErrors({});
    setConfirmPassword(true);
  }, []);

  const handleImageUpload = useCallback(
    async (field: "avatar" | "cover", file: File) => {
      if (!profile?.id) return;
      const setUploading =
        field === "avatar" ? setAvatarUploading : setCoverUploading;
      setUploading(true);
      try {
        const result = await uploadProfileImageAction({
          userId: profile.id,
          token: accessToken,
          field,
          file,
        });
        if (result.success) {
          if (result.profilePatch) {
            setProfile((prev) =>
              prev ? { ...prev, ...result.profilePatch } : prev,
            );
          }
          if (currentUser?.id === profile.id && result.userPatch) {
            updateCurrentUser(result.userPatch);
          }
          toast.success(
            field === "avatar"
              ? "Photo de profil mise à jour"
              : "Photo de couverture mise à jour",
          );
        } else {
          toast.error(result.error || "Erreur lors de l'upload");
        }
      } catch {
        toast.error("Erreur réseau");
      } finally {
        setUploading(false);
      }
    },
    [profile?.id, accessToken, currentUser?.id, updateCurrentUser],
  );

  const onFileSelected = useCallback(
    (field: "avatar" | "cover") =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
          toast.error("Seules les images sont autorisées");
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error("L'image ne doit pas dépasser 5 Mo");
          return;
        }
        handleImageUpload(field, file);
        e.target.value = "";
      },
    [handleImageUpload],
  );

  const passwordRules = [
    { key: "minLength", label: "Au moins 8 caractères", test: (v: string) => v.length >= 8 },
    { key: "uppercase", label: "Au moins une lettre majuscule", test: (v: string) => /[A-Z]/.test(v) },
    { key: "lowercase", label: "Au moins une lettre minuscule", test: (v: string) => /[a-z]/.test(v) },
    { key: "digit", label: "Au moins un chiffre", test: (v: string) => /\d/.test(v) },
  ];

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    if (Object.keys(passwordErrors).length > 0) {
      setPasswordErrors({});
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordLoading) return;

    const errors: Record<string, string> = {};

    if (!passwordForm.currentPassword.trim()) {
      errors.currentPassword = "Le mot de passe actuel est requis.";
    }

    const pw = passwordForm.newPassword;
    if (!pw) {
      errors.newPassword = "Le nouveau mot de passe est requis.";
    } else {
      const failedRules = passwordRules.filter((r) => !r.test(pw));
      if (failedRules.length > 0) {
        errors.newPassword = failedRules.map((r) => r.label).join(", ") + ".";
      }
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      errors.confirmNewPassword = "Les mots de passe ne correspondent pas.";
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    try {
      setPasswordLoading(true);
      const result = await changePasswordAction({
        token: accessToken,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (result.success) {
        toast.success("Mot de passe modifié avec succès");
        setConfirmPassword(false);
      } else {
        toast.error("Erreur lors du changement de mot de passe", {
          description: result.error ?? "Impossible de changer le mot de passe.",
        });
      }
    } catch {
      toast.error("Erreur réseau", {
        description: "Impossible de changer le mot de passe.",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const openEditDialog = useCallback(() => {
    setEditForm({
      userName: profile?.username ?? "",
      fullName: profile?.displayName ?? "",
      phone: profile?.phone ?? "",
      bio: profile?.bio ?? "",
    });
    setConfirmEdit(true);
  }, [profile]);

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    if (name === "bio" && value.length > BIO_MAX_LENGTH) return;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDelete = async () => {
    if (!profile?.id || deleteLoading) return;

    try {
      setDeleteLoading(true);
      const result = await deleteProfileAction({
        userId: profile.id,
        token: accessToken,
      });
      if (!result.success) {
        toast.error("Erreur lors de la suppression du compte", {
          description: result.error ?? "Impossible de supprimer le compte.",
        });
        return;
      }

      toast.success("Compte supprimé avec succès");
      setConfirmDelete(false);

      if (currentUser?.id === profile.id) {
        logout();
        router.replace("/login");
      } else {
        router.replace("/home");
      }
    } catch {
      toast.error("Erreur réseau", {
        description: "Impossible de supprimer le compte.",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    try {
      setEditLoading(true);
      const result = await updateProfileAction({
        userId: profile.id,
        token: accessToken,
        form: editForm,
        currentUser: currentUser
          ? {
              id: currentUser.id,
              initials: currentUser.initials,
              online: currentUser.online,
            }
          : null,
      });

      if (result.success) {
        const nextUsername = result.profilePatch?.username?.trim();

        if (result.profilePatch) {
          setProfile((prev) =>
            prev ? { ...prev, ...result.profilePatch } : prev,
          );
        }

        if (currentUser?.id === profile.id && result.userPatch) {
          updateCurrentUser(result.userPatch);
        }

        toast.success("Profil mis à jour avec succès");
        setConfirmEdit(false);

        if (nextUsername && nextUsername !== username) {
          router.replace(`/profil/${nextUsername}`);
        }
      } else {
        toast.error("Erreur lors de la modification du profil", {
          description: result.error ?? "Impossible de modifier le profil.",
        });
      }
    } catch {
      toast.error("Erreur réseau", {
        description: "Impossible de modifier le profil.",
      });
    } finally {
      setEditLoading(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/users/${username}`, accessToken);
        if (!res.ok) return;

        const data = await res.json();
        setProfile(data);
      } catch {
        toast.error("Erreur lors du chargement du profil", {
          description: `Impossible de charger le profil de ${username}`,
        });
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchProfile();
    }
  }, [username, accessToken, currentUser?.id, isAuthenticated]);

  const fetchUserPosts = useCallback(async () => {
    if (!profile?.id) return;
    try {
      setPostsLoading(true);
      const res = await apiFetch(`/posts?authorId=${profile.id}`, accessToken);
      if (!res.ok) return;
      const json = await res.json();
      const rawPosts = Array.isArray(json)
        ? json
        : (json.data ?? json.posts ?? []);

      const posts: Post[] = rawPosts.map((p: ReceivePost) => {
        const displayName: string =
          p.author?.displayName ?? p.author?.username ?? "Unknown";
        const initials = displayName
          .split(" ")
          .map((w: string) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        const now = Date.now();
        const created = new Date(p.createdAt).getTime();
        const diffH = Math.floor((now - created) / (1000 * 60 * 60));
        const timeAgo =
          diffH < 1
            ? "now"
            : diffH < 24
              ? `${diffH}h`
              : `${Math.floor(diffH / 24)}d`;

        return {
          id: p.id,
          authorId: p.authorId ?? p.author?.id,
          groupId: p.orgId ?? null,
          parentPostId: p.parentPostId ?? null,
          author: {
            id: p.author?.id,
            name: displayName,
            username: p.author?.username ?? "",
            avatar: p.author?.avatarUrl ?? "",
            initials,
            isVerified: p.author?.isVerified ?? false,
          },
          organization: p.organization
            ? {
                id: p.organization.id,
                name: p.organization.name,
                logoUrl: p.organization.logoUrl ?? null,
                sector: p.organization.sector,
              }
            : undefined,
          content: p.contentText ?? p.content ?? "",
          visibility: p.visibility ?? "public",
          isPinned: p.isPinned ?? false,
          isEdited: p.isEdited ?? false,
          commentsEnabled: p.commentsEnabled ?? true,
          sharesEnabled: p.sharesEnabled ?? true,
          media: p.media ?? [],
          reactions: p.reactions ?? {
            heart: p.stats?.reactions_count ?? 0,
            lightbulb: 0,
            handshake: 0,
          },
          images: p.images ?? [],
          files: p.files ?? [],
          stats: p.stats ?? {
            likes_count: 0,
            views_count: 0,
            shares_count: 0,
            comments_count: 0,
            supports_count: 0,
            reactions_count: 1,
            illuminates_count: 0,
          },
          comments: p._count?.comments ?? 0,
          shares: p.stats?.shares_count ?? p.shares ?? 0,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          timeAgo,
          myReaction: p.myReaction ?? null,
        };
      });

      setPosts(posts);
    } catch {
      toast.error("Erreur lors du chargement des posts", {
        description: "Impossible de charger les posts de cet utilisateur.",
      });
    } finally {
      setPostsLoading(false);
    }
  }, [profile?.id, accessToken]);

  useEffect(() => {
    if (profile?.id) {
      fetchUserPosts();
    }
  }, [profile?.id, accessToken, fetchUserPosts]);

  //   const handleFollow = useCallback(async () => {
  //     if (!profile?.id) return;

  //     try {
  //       const method = isFollowing ? "DELETE" : "POST";
  //       const res = await apiFetch(`/users/${profile.id}/follow`, accessToken, {
  //         method,
  //       });

  //       if (res.ok) {
  //         setIsFollowing(!isFollowing);
  //       }
  //     } catch (error) {
  //       toast.error("Erreur lors de la modification du follow", {
  //         description: "Impossible de modifier le follow.",
  //       });
  //     } finally {
  //       setFollowLoading(false);
  //     }
  //   }, [profile?.id, isFollowing, accessToken, followLoading]);
  if (loading) {
    return (
      <div className="xl:max-w-2xl xl:w-2xl w-full pb-20 h-full overflow-scroll hide-scrollbar md:px-10 xl:px-0">
        {/* Cover skeleton */}
        <Skeleton className="h-52 md:h-64 w-full rounded-2xl" />
        {/* Card skeleton */}
        <div className="relative -mt-14 md:-mt-16 mx-3 md:mx-4 rounded-xl border bg-card p-5 md:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start gap-5">
            <Skeleton className="size-24 md:size-28 rounded-full -mt-16 md:-mt-20 shrink-0 border-4 border-background" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-44" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3.5 w-64" />
              <div className="grid grid-cols-3 gap-2 pt-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Post skeletons */}
        <div className="flex flex-col gap-4 mt-6 px-3 md:px-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-4/5" />
              </div>
              <div className="flex items-center gap-6 pt-1">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Utilisateur non trouve</p>
      </div>
    );
  }

  return (
    <div className="xl:max-w-2xl xl:w-2xl w-full pb-20 h-full overflow-scroll hide-scrollbar md:px-10 xl:px-0">
      <div className="relative h-52 md:h-64 rounded-2xl overflow-hidden border bg-linear-to-br from-primary/20 via-primary/5 to-background group">
        {profile?.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile?.coverUrl}
            alt="cover"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-primary/40 via-primary/10 to-transparent" />

        {/* Cover edit button */}
        {currentUser?.username === username && (
          <>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileSelected("cover")}
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading}
              className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-background/85 backdrop-blur px-3 py-1.5 text-xs font-medium border shadow-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
            >
              {coverUploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Camera className="size-3.5" />
              )}
              Modifier la couverture
            </button>
          </>
        )}
      </div>

      <Card className="relative -mt-14 md:-mt-16 mx-3 md:mx-4 p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start gap-5">
          {/* Avatar with edit overlay */}
          <div className="relative shrink-0 -mt-16 md:-mt-20 group/avatar">
            <Avatar className="size-24 md:size-28 border-4 border-background shadow-sm">
              <AvatarImage
                src={profile?.avatarUrl ?? ""}
                alt={profile?.displayName ?? profile?.username}
              />
              <AvatarFallback
                className={`text-2xl font-bold ${getAvatarFallbackColor(
                  getInitials(
                    profile?.displayName || profile?.username || "User Name",
                  ),
                )}`}
              >
                {getInitials(
                  profile?.displayName || profile?.username || "User Name",
                )}
              </AvatarFallback>
            </Avatar>

            {currentUser?.username === username && (
              <>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileSelected("avatar")}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                >
                  {avatarUploading ? (
                    <Loader2 className="size-5 text-white animate-spin" />
                  ) : (
                    <Camera className="size-5 text-white" />
                  )}
                </button>
              </>
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {profile?.displayName || profile?.username}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  @{profile?.username}
                </p>
                {profile?.isVerified && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 mt-2">
                    <UserCheck className="size-3.5" />
                    Verified
                  </div>
                )}
              </div>

              <div className="shrink-0">
                {currentUser?.username === username && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 cursor-pointer rounded-full"
                      >
                        <Settings className="size-3.5" />
                        Paramètres
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      className="w-52"
                      align="end"
                      sideOffset={8}
                    >
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={openEditDialog}
                        >
                          <UserPen className="size-4" />
                          <span className="flex-1">Modifier le profil</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={openPasswordDialog}
                        >
                          <Lock className="size-4" />
                          <span className="flex-1">
                            Changer le mot de passe
                          </span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer text-destructive focus:text-destructive"
                          onClick={() => setConfirmDelete(true)}
                        >
                          <Trash className="size-4" />
                          Supprimer le compte
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {profile?.bio && (
              <p className="text-sm text-foreground/80 leading-relaxed mt-3">
                {profile?.bio}
              </p>
            )}

            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="rounded-xl border bg-muted/25 px-3 py-2">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <FileText className="size-3.5" />
                  Posts
                </div>
                <p className="text-base md:text-lg font-bold mt-1">
                  {formatCount(posts.length)}
                </p>
              </div>

              {/* <div className="rounded-xl border bg-muted/25 px-3 py-2">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <Users2 className="size-3.5" />
                  Followers
                </div>
                <p className="text-base md:text-lg font-bold mt-1">
                  {formatCount(profile.followers)}
                </p>
              </div>

              <div className="rounded-xl border bg-muted/25 px-3 py-2">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <CalendarDays className="size-3.5" />
                  Following
                </div>
                <p className="text-base md:text-lg font-bold mt-1">
                  {formatCount(profile.following)}
                </p>
              </div> */}
            </div>
          </div>
        </div>
      </Card>

      <div className="px-3 md:px-4 pb-8">
        <Card className="p-4 mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base md:text-lg font-semibold">Posts</h2>
            <p className="text-xs text-muted-foreground">
              Latest publications from this profile.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatCount(posts.length)} total
          </div>
        </Card>

        {postsLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-4/5" />
                </div>
                {i === 0 && <Skeleton className="h-44 w-full rounded-lg" />}
                <div className="flex items-center gap-6 pt-1">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card className="py-12 px-6 text-center">
            <p className="text-sm font-medium">No post yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              This user has not published content for now.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post, index) => {
              return <FeedItem key={index} post={post} />;
            })}
          </div>
        )}
      </div>
      <Dialog open={confirmEdit} onOpenChange={setConfirmEdit}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-center gap-3 mb-1">
            <Avatar className="size-12 border-2 border-primary/20 shrink-0">
              <AvatarImage
                src={profile?.avatarUrl ?? ""}
                alt={profile?.displayName ?? profile?.username}
              />
              <AvatarFallback
                className={`text-sm font-bold ${getAvatarFallbackColor(
                  getInitials(
                    profile?.displayName || profile?.username || "User Name",
                  ),
                )}`}
              >
                {getInitials(profile?.displayName || profile?.username || "UN")}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-lg">Modifier le profil</DialogTitle>
              <DialogDescription className="text-xs">
                Mettez à jour vos informations personnelles.
              </DialogDescription>
            </div>
          </div>

          <form noValidate onSubmit={handleEditSubmit} className="mt-2">
            <FieldGroup className="gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="userName">
                    {"Nom d'utilisateur"}
                  </FieldLabel>
                  <Input
                    id="userName"
                    name="userName"
                    type="text"
                    value={editForm.userName}
                    onChange={handleEditChange}
                    placeholder="@nom_utilisateur"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="fullName">Nom complet</FieldLabel>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={editForm.fullName}
                    onChange={handleEditChange}
                    placeholder="Prénom Nom"
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="phone">Numéro de téléphone</FieldLabel>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={handleEditChange}
                  placeholder="+237 6XX XXX XXX"
                />
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="bio">Bio</FieldLabel>
                  <span
                    className={`text-[11px] tabular-nums ${
                      editForm.bio.length >= BIO_MAX_LENGTH
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {editForm.bio.length}/{BIO_MAX_LENGTH}
                  </span>
                </div>
                <Textarea
                  id="bio"
                  name="bio"
                  value={editForm.bio}
                  onChange={handleEditChange}
                  placeholder="Décrivez-vous en quelques mots…"
                  rows={3}
                  className="resize-none"
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="cursor-pointer"
                  onClick={() => setConfirmEdit(false)}
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  className="cursor-pointer"
                  type="submit"
                  disabled={editLoading}
                >
                  {editLoading && (
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  )}
                  Enregistrer
                </Button>
              </div>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{"Supprimer le compte"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {
              "Etes-vous sur de vouloir supprimer ce compte ? Cette action est irreversible."
            }
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setConfirmDelete(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="cursor-pointer"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading && (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              )}
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmPassword} onOpenChange={setConfirmPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Changer le mot de passe</DialogTitle>
            <DialogDescription className="text-xs">
              Saisissez votre mot de passe actuel puis choisissez-en un nouveau.
            </DialogDescription>
          </DialogHeader>

          <form noValidate onSubmit={handlePasswordSubmit} className="mt-2">
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="currentPassword">
                  Mot de passe actuel
                </FieldLabel>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  className={passwordErrors.currentPassword ? "border-red-500" : ""}
                />
                {passwordErrors.currentPassword && (
                  <p className="text-xs text-red-500">{passwordErrors.currentPassword}</p>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="newPassword">
                  Nouveau mot de passe
                </FieldLabel>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Min. 8 caractères, 1 majuscule, 1 chiffre"
                  className={passwordErrors.newPassword ? "border-red-500" : ""}
                />
                {passwordForm.newPassword.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {passwordRules.map((rule) => {
                      const passed = rule.test(passwordForm.newPassword);
                      return (
                        <li
                          key={rule.key}
                          className={`flex items-center gap-1.5 text-xs ${
                            passed ? "text-green-600" : "text-muted-foreground"
                          }`}
                        >
                          {passed ? (
                            <Check className="size-3" />
                          ) : (
                            <X className="size-3" />
                          )}
                          {rule.label}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {passwordErrors.newPassword && (
                  <p className="text-xs text-red-500 mt-1">{passwordErrors.newPassword}</p>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmNewPassword">
                  Confirmer le nouveau mot de passe
                </FieldLabel>
                <Input
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  type="password"
                  value={passwordForm.confirmNewPassword}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  className={passwordErrors.confirmNewPassword ? "border-red-500" : ""}
                />
                {passwordErrors.confirmNewPassword && (
                  <p className="text-xs text-red-500">{passwordErrors.confirmNewPassword}</p>
                )}
              </Field>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="cursor-pointer"
                  onClick={() => setConfirmPassword(false)}
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  className="cursor-pointer"
                  type="submit"
                  disabled={passwordLoading}
                >
                  {passwordLoading && (
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  )}
                  Modifier
                </Button>
              </div>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
