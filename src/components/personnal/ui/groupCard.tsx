import {
  Crown,
  ShieldCheck,
  Shield,
  UserCheck,
  Users,
  Clock,
  Loader2,
  Globe,
  Lock,
  EyeOff,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import type { GroupResponse, GroupRole } from "@/src/types/group";
import { getAvatarFallbackColor } from "@/src/lib/avatarColor";

const roleConfig: Record<
  GroupRole,
  { icon: React.ElementType; label: string; color: string }
> = {
  owner: {
    icon: Crown,
    label: "Owner",
    color:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  },
  admin: {
    icon: ShieldCheck,
    label: "Admin",
    color:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  },
  moderator: {
    icon: Shield,
    label: "Modérateur",
    color:
      "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400",
  },
  member: {
    icon: UserCheck,
    label: "Membre",
    color:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  },
};

const visibilityConfig: Record<
  string,
  { icon: React.ElementType; label: string }
> = {
  public: { icon: Globe, label: "Public" },
  private: { icon: Lock, label: "Privé" },
  secret: { icon: EyeOff, label: "Secret" },
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

type GroupCardProps = {
  group: GroupResponse;
  variant: "mine" | "discover" | "pending";
  actionLoading?: boolean;
  onJoin?: (id: string) => void;
  onCancel?: (id: string) => void;
};

const GroupCard = ({
  group,
  variant,
  actionLoading,
  onJoin,
  onCancel,
}: GroupCardProps) => {
  const role = group.currentUserRole
    ? roleConfig[group.currentUserRole]
    : null;
  const RoleIcon = role?.icon;
  const initials = getInitials(group.name);
  const vis = visibilityConfig[group.visibility] ?? visibilityConfig.public;
  const VisIcon = vis.icon;

  return (
    <Card className="overflow-hidden rounded-xl border shadow-sm hover:shadow-md transition-shadow py-0 gap-0">
      {/* Banner + Avatar wrapper */}
      <div className="relative">
        {/* Banner — gradient since groups don't have a banner URL */}
        <div className="relative h-24 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-primary/30 to-primary/10" />
          <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />

          {/* Role badge */}
          {role && RoleIcon && (
            <div className="absolute top-2 right-2">
              <Badge
                variant="secondary"
                className={`text-[10px] gap-1 ${role.color}`}
              >
                <RoleIcon className="size-2.5" />
                {role.label}
              </Badge>
            </div>
          )}

          {/* Visibility badge */}
          <div className="absolute bottom-2 left-2">
            <Badge
              variant="secondary"
              className="text-[10px] bg-white/90 text-gray-700 dark:bg-black/60 dark:text-gray-300"
            >
              <VisIcon className="size-2.5 mr-0.5" />
              {vis.label}
            </Badge>
          </div>
        </div>

        {/* Avatar overlay */}
        <div className="absolute -bottom-6 right-3 z-10">
          <Avatar className="size-12 border-2 border-background shadow-md rounded-lg">
            {group.imageUrl && (
              <AvatarImage src={group.imageUrl} alt={group.name} />
            )}
            <AvatarFallback
              className={`rounded-lg text-sm font-bold ${getAvatarFallbackColor(group.name)}`}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Content */}
      <CardHeader className="pt-6 pb-1 px-3 gap-0">
        <CardTitle className="text-base font-semibold leading-tight truncate flex items-center gap-1.5">
          <Users className="size-3.5 text-muted-foreground shrink-0" />
          {group.name}
        </CardTitle>
        {group.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
            {group.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="px-3 pb-2 pt-1">
        <div className="flex flex-row items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="size-3" />
            {group._count.memberships.toLocaleString()} membres
          </span>
        </div>
      </CardContent>

      {/* Footer */}
      <CardFooter className="px-3 pb-3 pt-0">
        {variant === "mine" ? (
          <Button
            asChild
            className="w-full cursor-pointer"
            variant="outline"
            size="sm"
          >
            <Link href={`/groups/${group.id}`}>
              <Users className="size-3.5 mr-1.5" />
              Accéder
            </Link>
          </Button>
        ) : variant === "pending" ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full cursor-pointer text-amber-600 hover:text-amber-700"
            disabled={actionLoading}
            onClick={() => onCancel?.(group.id)}
          >
            {actionLoading ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <Clock className="size-3.5 mr-1.5" />
            )}
            En attente — Annuler
          </Button>
        ) : (
          <Button
            size="sm"
            className="w-full cursor-pointer"
            disabled={actionLoading}
            onClick={() => onJoin?.(group.id)}
          >
            {actionLoading ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : null}
            Rejoindre
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default GroupCard;
