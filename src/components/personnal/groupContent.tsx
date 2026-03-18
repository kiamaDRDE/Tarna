import AddPostCard from "./addPostCard";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { ChevronLeft, Globe, Lock, EyeOff, Settings, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DetailedGroupResponse } from "@/src/types/group";
import { getInitials } from "@/src/lib/getInitials";
import { getAvatarFallbackColor } from "@/src/lib/avatarColor";
import { getGradientFallback } from "@/src/lib/gradientColor";
import { fetchInitialPosts } from "@/app/(Client)/home/actions";
import { Suspense } from "react";
import { Spinner } from "../ui/spinner";
import NewOrgFeed from "./orgFeed";

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
      {/* Group Header */}
      <Card className="flex flex-col gap-0 p-0 overflow-hidden mb-2">
        {/* Cover / Banner */}
        <div
          className={`relative w-full h-32 ${getGradientFallback(
            group?.name || "Group"
          )}`}
        >
          <div className="absolute top-3 left-3">
            <Link href="/groups">
              <Card className="cursor-pointer p-1.5 rounded-full hover:bg-white/20 border-0 shadow-none bg-black/30">
                <ChevronLeft className="size-5 text-white" />
              </Card>
            </Link>
          </div>
        </div>
        {/* Group Info */}
        <div>
          <div className="flex flex-row justify-between items-center">
            <div className="flex flex-row items-end gap-3 px-4">
              <Avatar className="size-16 border-3 border-background">
                <AvatarImage
                  src={group?.imageUrl || ""}
                  alt={group?.name || "Group"}
                />
                <AvatarFallback
                  className={`text-2xl font-bold ${getAvatarFallbackColor(group?.name || "Group")}`}
                >
                  {getInitials(group?.name || "Group")}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 pb-1">
                <p className="text-lg font-bold leading-tight">
                  {group?.name || "Group Name"}
                </p>
                <div className="flex flex-row items-center gap-2 text-xs text-gray-400">
                  <div className="flex flex-row items-center gap-1">
                    <VisIcon className="size-3" />
                    <span>{vis.label}</span>
                  </div>
                  <span>·</span>
                  <div className="flex flex-row items-center gap-1">
                    <Users className="size-3" />
                    <span>{group?._count.memberships || 0} members</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm text-gray-400">{group?.description || ""}</p>
            <div className="flex flex-row gap-2 mt-2">
              {group?.organization && (
                <Badge variant="secondary">{group.organization.name}</Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

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
