import AddPostCard from "./addPostCard";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { ChevronLeft, Globe, Lock, EyeOff, Settings, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DetailedGroupResponse } from "@/src/types/group";
import { getInitials } from "@/src/lib/getInitials";
import { getAvatarFallbackColor } from "@/src/lib/avatarColor";
import { fetchInitialPosts } from "@/app/(Client)/home/actions";
import { Suspense } from "react";
import { Spinner } from "../ui/spinner";
import NewOrgFeed from "./orgFeed";
import GroupSettingsDrawer from "./groupSettingsDrawer";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import { Button } from "../ui/button";

const visibilityConfig: Record<
  string,
  { icon: React.ElementType; label: string }
> = {
  public: { icon: Globe, label: "Public" },
  private: { icon: Lock, label: "Privé" },
  secret: { icon: EyeOff, label: "Secret" },
};

async function PostsSection({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const data = await fetchInitialPosts({ groupId });

  return (
    <NewOrgFeed
      firstPost={data.posts}
      initialCursor={data.nextCursor}
      initialHasMore={data.hasMore}
      roomType="group"
      roomId={groupId}
      roomName={groupName}
    />
  );
}

const GroupContent = ({
  group,
}: {
  group: DetailedGroupResponse | null;
}) => {
  const isMember = !!group?.currentUserRole;
  const vis = visibilityConfig[group?.visibility ?? "public"] ?? visibilityConfig.public;
  const VisIcon = vis.icon;

  return (
    <div className="xl:max-w-2xl xl:w-2xl pb-20 h-full overflow-scroll hide-scrollbar md:px-10 xl:p-0">
      {/* Group Header — compact community style */}
      <div className="rounded-2xl border bg-card mb-2 mt-1 overflow-hidden">
        {/* Top bar with back + settings */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <Link href="/groups">
            <button className="p-1.5 rounded-lg hover:bg-accent cursor-pointer">
              <ChevronLeft className="size-5" />
            </button>
          </Link>
          {isMember && group && (
            <Drawer direction="right">
              <DrawerTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 cursor-pointer rounded-lg h-8"
                >
                  <Settings className="size-3.5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerTitle className="sr-only">
                  {"Paramètres du groupe"}
                </DrawerTitle>
                <GroupSettingsDrawer group={group} />
              </DrawerContent>
            </Drawer>
          )}
        </div>

        {/* Group identity */}
        <div className="flex items-center gap-3.5 px-4 pb-3">
          <Avatar className="size-14 rounded-xl shrink-0">
            <AvatarImage
              src={group?.imageUrl || ""}
              alt={group?.name || "Group"}
            />
            <AvatarFallback
              className={`rounded-xl text-xl font-bold ${getAvatarFallbackColor(group?.name || "Group")}`}
            >
              {getInitials(group?.name || "Group")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold leading-tight truncate">
              {group?.name || "Group Name"}
            </p>
            <div className="flex items-center gap-2.5 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <VisIcon className="size-3" />
                {vis.label}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Users className="size-3" />
                {group?._count.memberships || 0} membres
              </span>
            </div>
          </div>
        </div>

        {/* Description + org badge */}
        {(group?.description || group?.organization) && (
          <div className="px-4 pb-3 border-t pt-2.5">
            {group?.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {group.description}
              </p>
            )}
            {group?.organization && (
              <Badge variant="outline" className="text-[10px] mt-2 h-4 px-1.5 font-normal">
                {group.organization.name}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Add Post — only for members */}
      {isMember && (
        <AddPostCard
          isgroup={true}
          groupId={group?.id}
          groupName={group?.name}
        />
      )}

      {/* Group Feed */}
      <Suspense
        fallback={
          <div className="xl:max-w-2xl xl:w-2xl w-full flex flex-row justify-center pb-20 h-full overflow-scroll hide-scrollbar md:px-10 xl:px-0 pt-2">
            <Spinner className="size-5" />
          </div>
        }
      >
        <PostsSection groupId={group?.id ?? ""} groupName={group?.name ?? ""} />
      </Suspense>
    </div>
  );
};

export default GroupContent;
