import AddPostCard from "./addPostCard";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { ChevronLeft, Globe, Settings, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DetailedOrganizationResponse } from "@/src/types/organization";
import { getInitials } from "@/src/lib/getInitials";
import { getAvatarFallbackColor } from "@/src/lib/avatarColor";
import { fetchInitialPosts } from "@/app/(Client)/home/actions";
import { Suspense } from "react";
import { Skeleton } from "../ui/skeleton";
import NewOrgFeed from "./orgFeed";
import OrgJoinRequestListener from "./orgJoinRequestListener";
import OrgSettingsDrawer from "./orgSettingsDrawer";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import { Button } from "../ui/button";

async function PostsSection({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName: string;
}) {
  const data = await fetchInitialPosts({ orgId });

  return (
    <>
      <NewOrgFeed
        firstPost={data.posts}
        initialCursor={data.nextCursor}
        initialHasMore={data.hasMore}
        roomType="org"
        roomId={orgId}
        roomName={orgName}
      />
    </>
  );
}

const OrgContent = ({ org }: { org: DetailedOrganizationResponse | null }) => {
  const isMember = !!org?.currentUserRole;

  return (
    <div className="xl:max-w-2xl xl:w-2xl pb-20 h-full overflow-scroll hide-scrollbar md:px-10 xl:p-0">
      {/* Group Header */}
      <Card className="flex flex-col gap-0 p-0 overflow-hidden mb-2">
        {/* Cover / Banner */}
        <div className="relative w-full h-32 bg-linear-to-r from-blue-600 to-indigo-700">
          <div className="absolute top-3 left-3">
            <Link href="/organizations">
              <Card className="cursor-pointer p-1.5 rounded-full hover:bg-white/20 border-0 shadow-none bg-black/30">
                <ChevronLeft className="size-5 text-white" />
              </Card>
            </Link>
          </div>
          <div className="absolute top-3 right-3">
            {/* <Card className="cursor-pointer p-1.5 rounded-full hover:bg-white/20 border-0 shadow-none bg-black/30">
              <Settings className="size-5 text-white" />
            </Card> */}
          </div>
        </div>
        {/* Group Info */}
        <div>
          <div className="flex flex-row justify-between items-center">
            <div className="flex flex-row items-end gap-3 px-4">
              <Avatar className={`size-16 border-3 border-background`}>
                <AvatarImage
                  src={org?.logoUrl || ""}
                  alt={org?.name || "Organization Logo"}
                />
                <AvatarFallback
                  className={`text-2xl font-bold  ${getAvatarFallbackColor(org?.name || "Organization")}`}
                >
                  {getInitials(org?.name || "Organization")}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 pb-1">
                <p className="text-lg font-bold leading-tight">
                  {org?.name || "Organization Name"}
                </p>
                <div className="flex flex-row items-center gap-2 text-xs text-gray-400">
                  <div className="flex flex-row items-center gap-1">
                    <Globe className="size-3" />
                    <span>{org?.visibility || "Public"}</span>
                  </div>
                  <span>·</span>
                  <div className="flex flex-row items-center gap-1">
                    <Users className="size-3" />
                    <span>{org?._count.memberships || 0} members</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="pr-5">
              {isMember && (
                <Drawer direction="right">
                  <DrawerTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 cursor-pointer rounded-full"
                    >
                      <Settings className="size-3.5" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerTitle className="sr-only">
                      {"Paramètres de l'organisation"}
                    </DrawerTitle>
                    {org && <OrgSettingsDrawer org={org} />}
                  </DrawerContent>
                </Drawer>
              )}
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm text-gray-400">{org?.bio || ""}</p>
            <div className="flex flex-row gap-2 mt-2">
              {org?.sector && <Badge variant="secondary">{org.sector}</Badge>}
              {org?.domain && <Badge variant="secondary">{org.domain}</Badge>}
            </div>
            <div className="flex flex-row gap-2 mt-2">
              {org?.emailContact && <Badge variant="secondary">{org.emailContact}</Badge>}
            </div>
          </div>
        </div>
      </Card>

      {/* Add Post — only for members */}
      {isMember && (
        <AddPostCard isgroup={true} orgId={org?.id} orgName={org?.name} />
      )}

      {/* Socket listener pour les demandes d'adhésion (admins) */}
      {org?.id && <OrgJoinRequestListener orgId={org.id} />}

      {/* Group Feed */}
      <Suspense
        fallback={
          <div className="flex flex-col gap-4 mt-2">
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
        }
      >
        <PostsSection orgId={org?.id ?? ""} orgName={org?.name ?? ""} />
      </Suspense>
    </div>
  );
};

export default OrgContent;
