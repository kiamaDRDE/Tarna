"use client";
import {
  FileText,
  Globe,
  GlobeLock,
  ImageIcon,
  LucideIcon,
  Plus,
  X,
  Send,
  Building2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
// import {\n//   Select, SelectContent, SelectGroup, SelectItem,\n//   SelectLabel, SelectTrigger, SelectValue,\n// } from \"../ui/select\";", "oldString": "import {\n  Select,\n  SelectContent,\n  SelectGroup,\n  SelectItem,\n  SelectLabel,\n  SelectTrigger,\n  SelectValue,\n} from \"../ui/select\";
import { useActionState, useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { useUserStore } from "@/src/store/userStore";
import { useFeedStore } from "@/src/store/feedStore";
import {
  createPostAction,
  type CreatePostState,
} from "@/app/(Client)/home/actions";
import { Spinner } from "../ui/spinner";
import { toast } from "sonner";
import { getAvatarFallbackColor } from "@/src/lib/avatarColor";
import { getInitials } from "@/src/lib/getInitials";
import { fetchMembers, fetchMyOrgs } from "@/app/(Client)/organizations/action";
import { OrgRole, OrganizationResponse } from "@/src/types/organization";

type VisibilityOption = {
  value: string;
  label: string;
  icon: LucideIcon;
};

type MediaAction = {
  id: number;
  label: string;
  icon: LucideIcon;
};

const AddPostCard = ({
  isgroup,
  orgId,
  orgName,
  groupId,
  groupName,
}: {
  isgroup: boolean;
  orgId?: string;
  orgName?: string;
  groupId?: string;
  groupName?: string;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [content, setContent] = useState("");
  // const [postType, setPostType] = useState("post");
  const [visibility, setVisibility] = useState(
    isgroup ? "group_only" : "public",
  );
  const [imagePreview, setImagePreview] = useState<string[] | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const currentUser = useUserStore((state) => state.user);
  const accessToken = useUserStore((state) => state.accessToken);
  const addPost = useFeedStore((s) => s.addPost);
  const [isOrg, setIsOrg] = useState(isgroup);
  const [myRole, setMyRole] = useState<OrgRole | null>(null);
  const [myOrgs, setMyOrgs] = useState<OrganizationResponse[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(
    isgroup && orgId ? orgId : null,
  );

  useEffect(() => {
    if (!isgroup || !orgId) return;
    let isActive = true;
    fetchMembers(orgId)
      .then((res) => {
        if (!isActive || !currentUser) return;
        const me = res.data.find((m) => m.user.id === currentUser.id);
        if (me) setMyRole(me.role);
      })
      .catch(() => {});
    return () => {
      isActive = false;
    };
  }, [isgroup, orgId, currentUser]);

  // Fetch user's orgs on main feed
  useEffect(() => {
    if (isgroup) return;
    fetchMyOrgs()
      .then((res) => setMyOrgs(res.data))
      .catch(() => {});
  }, [isgroup]);

  const initialState: CreatePostState = {
    success: false,
    error: null,
    post: null,
  };

  const visibilityOptions: VisibilityOption[] = [
    { value: "public", label: "Public", icon: Globe },
    { value: "private", label: "Privé", icon: GlobeLock },
    // { value: "friends", label: "Amis", icon: Users },
  ];
  const labelForGroup = groupName ?? orgName;
  const visibilityGroupOptions: VisibilityOption[] = [
    ...(myRole === "owner" || myRole === "admin" || myRole === "manager"
      ? [{ value: "public", label: "Public", icon: Globe }]
      : []),

    {
      value: "group_only",
      label: isOrg && labelForGroup ? labelForGroup : "Privé",
      icon: GlobeLock,
    },
  ];

  const handleVisibilityChange = (value: string) => {
    setVisibility(value);
    setIsOrg(isgroup);
    setSelectedOrgId(null);
  };

  const handleSelectOrg = (org: OrganizationResponse) => {
    setVisibility("group_only");
    setIsOrg(true);
    setSelectedOrgId(org.id);
  };

  const selectedOrgName = myOrgs.find((o) => o.id === selectedOrgId)?.name;

  
  const currentVisibilityOption =
    visibility === "group_only"
      ? {
          label: selectedOrgName || labelForGroup || "Organisation",
          icon: Building2,
        }
      : (() => {
          const allOpts = isgroup ? visibilityGroupOptions : visibilityOptions;
          return allOpts.find((o) => o.value === visibility) ?? allOpts[0];
        })();
  
  const effectiveOrgId = isgroup && orgId ? orgId : selectedOrgId ?? undefined;
  const effectiveGroupId = isgroup && groupId ? groupId : undefined;

  const handleFormAction = async (
    prevState: CreatePostState,
    formData: FormData,
  ) => {
    const result = await createPostAction(
      prevState,
      formData,
      visibility === "group_only" || isOrg,
      effectiveOrgId,
      effectiveGroupId,
    );
    console.log(result)
    if (result.success) {
      if (result.post) addPost(result.post);
      setContent("");
      setImagePreview(null);
      setPdfFile(null);
      setIsFocused(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (pdfInputRef.current) pdfInputRef.current.value = "";
      toast.success("Post publié", {
        description: "Votre publication est en ligne.",
      });
    } else if (result.error) {
      toast.error("Échec de la publication", {
        description: result.error,
      });
    }
    return result;
  };

  const [, formAction, isPending] = useActionState(
    handleFormAction,
    initialState,
  );
  // useEffect(() => {
  //   if (!isPending) {
  //     formFetchAction(); // Re-fetch posts après création pour mettre à jour les stats

  //   }
  // }, [isPending])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImagePreview(null);
    const files = e.target.files;
    if (files) {
      const previews = Array.from(files).map((file) =>
        URL.createObjectURL(file),
      );
      setImagePreview(previews);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPdfFile(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePdf = () => {
    setPdfFile(null);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  const hasContent = content.trim().length > 0 || imagePreview || pdfFile;

  const handleMediaAction = (id: number) => {
    if (id === 0) fileInputRef.current?.click();
    else if (id === 2) pdfInputRef.current?.click();
  };

  const mediaActions: MediaAction[] = [
    { id: 0, label: "Photo", icon: ImageIcon },
    // { id: 1, label: "Vidéo", icon: Camera },
    { id: 2, label: "Document", icon: FileText },
    // { id: 3, label: "Lien", icon: Link2 },
    // { id: 4, label: "Emoji", icon: Smile },
    // { id: 5, label: "Hashtag", icon: Hash },
  ];

  return (
    <form ref={formRef} action={formAction} className="pt-4 pb-2">
      <Card
        className={`px-4 py-3 transition-shadow ${
          isFocused ? "shadow-md ring-1 ring-primary/20" : "shadow-sm"
        }`}
      >
        {/* Hidden inputs for server action */}
        <input type="hidden" name="token" value={accessToken ?? ""} />
        <input type="hidden" name="authorId" value={currentUser?.id ?? ""} />
        <input type="hidden" name="contentText" value={content} />
        <input type="hidden" name="visibility" value={visibility} />

        {/* File inputs */}
        <input
          type="file"
          name="images"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          multiple
        />
        <input
          type="file"
          name="files"
          ref={pdfInputRef}
          accept="application/pdf"
          className="hidden"
          onChange={handlePdfChange}
          multiple
        />

        {/* ─── Top: Avatar + Textarea ─── */}
        <div className="flex flex-row gap-3">
          <Avatar className="size-10 shrink-0 mt-0.5">
            <AvatarImage src={currentUser?.avatarUrl || ""} alt="profil" />
            <AvatarFallback
              className={`text-xs font-semibold ${getAvatarFallbackColor(isgroup && orgName ? orgName : currentUser?.initials || "")}`}
            >
              {isgroup && orgName
                ? getInitials(orgName)
                : currentUser?.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              placeholder="Quoi de neuf ?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              rows={isFocused || hasContent ? 3 : 1}
              className="w-full resize-none border-0 bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-0 py-2"
            />
          </div>
        </div>

        {/* ─── Previews ─── */}
        {(imagePreview || pdfFile) && (
          <div className="flex flex-col gap-3">
            {/* Images */}
            {imagePreview && imagePreview.length > 0 && (
              <div className="relative">
                <div
                  className={`grid gap-2 rounded-xl overflow-hidden ${
                    imagePreview.length === 1
                      ? "grid-cols-1"
                      : imagePreview.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-3"
                  }`}
                >
                  {imagePreview.map((src, idx) => {
                    const isFullWidth = imagePreview.length === 1;
                    return (
                      <div
                        key={idx}
                        className={`relative overflow-hidden rounded-lg bg-muted ${
                          isFullWidth ? "col-span-1 h-32" : "h-24"
                        }`}
                      >
                        <NextImage
                          src={src}
                          alt={`preview ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                        {/* Overlay +N si > 4 images */}
                        {imagePreview.length > 4 && idx === 3 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white text-lg font-bold">
                              +{imagePreview.length - 4}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bouton supprimer toutes les images */}
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 cursor-pointer z-10"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            {/* PDF */}
            {pdfFile && (
              <div className="flex flex-row items-center gap-2 bg-accent rounded-lg px-3 py-2 w-fit">
                <FileText className="size-4 text-red-500 shrink-0" />
                <p className="text-xs truncate max-w-32">{pdfFile.name}</p>
                <button
                  type="button"
                  onClick={removePdf}
                  className="bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70 cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Séparateur ─── */}
        <div className="h-px bg-border ml-13" />

        {/* ─── Bottom: Actions ─── */}
        <div className="flex flex-row items-center justify-between ml-13">
          <div className="flex flex-row items-center gap-0.5">
            {/* Desktop: boutons individuels */}
            <div className="hidden sm:flex flex-row items-center gap-0.5">
              {mediaActions.map((media) => (
                <button
                  key={media.id}
                  type="button"
                  onClick={() => handleMediaAction(media.id)}
                  className="p-2 rounded-lg hover:bg-accent transition-colors cursor-pointer group"
                  title={media.label}
                >
                  <media.icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>

            {/* Mobile: dropdown */}
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="p-2 rounded-lg hover:bg-accent cursor-pointer"
                  >
                    <Plus className="size-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40" align="start">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Médias</DropdownMenuLabel>
                    {mediaActions.map((media) => (
                      <DropdownMenuItem
                        key={media.id}
                        className="cursor-pointer gap-2"
                        onClick={() => handleMediaAction(media.id)}
                      >
                        <media.icon className="size-4" />
                        {media.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex flex-row items-center gap-2">
            {/* Post type: */}
            {/* <Select
                defaultValue="publication"
                value={postType}
                onValueChange={setPostType}
              >
                <SelectTrigger className="h-8 text-xs w-28 border-0 shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>type de post</SelectLabel>
                    {postOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-row items-center gap-1.5">
                          <opt.icon className="size-3.5" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select> */}
            {/* Visibilité */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5 px-2.5"
                >
                  <currentVisibilityOption.icon className="size-3.5" />
                  <span className="truncate max-w-20 sm:max-w-28">
                    {currentVisibilityOption.label}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48" align="end">
                <DropdownMenuLabel>Visibilité</DropdownMenuLabel>
                <DropdownMenuGroup>
                  {(isgroup ? visibilityGroupOptions : visibilityOptions).map(
                    (opt) => (
                      <DropdownMenuItem
                        key={opt.value}
                        className="cursor-pointer gap-2"
                        onClick={() => handleVisibilityChange(opt.value)}
                      >
                        <opt.icon className="size-4" />
                        {opt.label}
                      </DropdownMenuItem>
                    ),
                  )}
                  {!isgroup && myOrgs.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer gap-2">
                          <Building2 className="size-4" />
                          Organisation
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            {myOrgs.map((org) => (
                              <DropdownMenuItem
                                key={org.id}
                                className="cursor-pointer gap-2"
                                onClick={() => handleSelectOrg(org)}
                              >
                                <Building2 className="size-3.5" />
                                <span className="truncate">{org.name}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    </>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Publier */}
            <Button
              type="submit"
              size="sm"
              className="cursor-pointer gap-1.5 rounded-full px-4"
              disabled={
                !hasContent ||
                isPending ||
                (visibility === "group_only" && !selectedOrgId && !groupId)
              }
            >
              {isPending ? (
                <Spinner className="size-3.5" />
              ) : (
                <Send className="size-3.5" />
              )}
              <span className="hidden sm:inline">
                {isPending ? "Publication…" : "Publier"}
              </span>
            </Button>
          </div>
        </div>
      </Card>
    </form>
  );
};

export default AddPostCard;
