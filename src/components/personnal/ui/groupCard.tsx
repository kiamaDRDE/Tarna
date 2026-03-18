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
  ArrowRight,
} from "lucide-react";
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
      "text-amber-600 dark:text-amber-400",
  },
  admin: {
    icon: ShieldCheck,
    label: "Admin",
    color:
      "text-blue-600 dark:text-blue-400",
  },
  moderator: {
    icon: Shield,
    label: "Modérateur",
    color:
      "text-purple-600 dark:text-purple-400",
  },
  member: {
    icon: UserCheck,
    label: "Membre",
    color:
      "text-emerald-600 dark:text-emerald-400",
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

  const content = (
    <div className="flex items-center gap-3.5 p-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors group/card">
      {/* Avatar */}
      <Avatar className="size-11 shrink-0 rounded-xl">
        {group.imageUrl && (
          <AvatarImage src={group.imageUrl} alt={group.name} />
        )}
        <AvatarFallback
          className={`rounded-xl text-sm font-bold ${getAvatarFallbackColor(group.name)}`}
        >
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate">{group.name}</p>
          {role && RoleIcon && (
            <RoleIcon className={`size-3.5 shrink-0 ${role.color}`} />
          )}
        </div>
        {group.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {group.description}
          </p>
        )}
        <div className="flex items-center gap-2.5 mt-1">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="size-3" />
            {group._count.memberships.toLocaleString()}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <VisIcon className="size-3" />
            {vis.label}
          </span>
          {"organization" in group &&
            (group as { organization?: { name: string } | null }).organization != null && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
              {(group as { organization: { name: string } }).organization.name}
            </Badge>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="shrink-0">
        {variant === "mine" ? (
          <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover/card:opacity-100 transition-opacity" />
        ) : variant === "pending" ? (
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer text-amber-600 hover:text-amber-700 text-xs h-7 px-2"
            disabled={actionLoading}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel?.(group.id);
            }}
          >
            {actionLoading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <>
                <Clock className="size-3 mr-1" />
                Annuler
              </>
            )}
          </Button>
        ) : (
          <Button
            size="sm"
            className="cursor-pointer text-xs h-7 px-3"
            disabled={actionLoading}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onJoin?.(group.id);
            }}
          >
            {actionLoading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              "Rejoindre"
            )}
          </Button>
        )}
      </div>
    </div>
  );

  if (variant === "mine") {
    return (
      <Link href={`/groups/${group.id}`} className="block">
        {content}
      </Link>
    );
  }

  return content;
};

export default GroupCard;
