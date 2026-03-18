"use client";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import {
  Bell,
  Building,
  Building2,
  ChevronRight,
  Home,
  House,
  LucideIcon,
  MessageCircle,
  Settings,
  ShieldUser,
  User,
  Users,
  UsersRound,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserStore } from "@/src/store/userStore";
import { useGroupStore } from "@/src/store/groupStore";
import { getAvatarFallbackColor } from "@/src/lib/avatarColor";
import { getInitials } from "@/src/lib/getInitials";
import { IconHome, IconHomeFilled } from "@tabler/icons-react";

type menuItemType = {
  id: number;
  name: string;
  icon: LucideIcon;
  route: string;
  badge?: number;
};

const Sidebar = () => {
  const pathname = usePathname();
  const user = useUserStore((s) => s.user);
  const myGroups = useGroupStore((s) => s.tabs["my-groups"].data).slice(0, 4);

  const isActive = (prefix: string) =>
    pathname === prefix || pathname.startsWith(prefix + "/");
  const iconActive = isActive("/home") ? IconHomeFilled : IconHome;

  const initialMenu: menuItemType[] = [
    { id: 0, name: "Accueil", icon: Home, route: "/home" },
    { id: 1, name: "Organisations", icon: Building2, route: "/organizations" },
    { id: 6, name: "Groupes", icon: UsersRound, route: "/groups" },
    {
      id: 2,
      name: "Discussions",
      icon: MessageCircle,
      route: "/messages",
      badge: 4,
    },
    {
      id: 3,
      name: "Notifications",
      icon: Bell,
      route: "/notifications",
      badge: 3,
    },
    {
      id: 5,
      name: "Profile",
      icon: User,
      route: `/profil/${user?.username}`,
    },
  ];
  const menuItems =
    user?.role === "admin"
      ? [
          ...initialMenu,
          {
            id: 4,
            name: "Administration",
            icon: ShieldUser,
            route: "/dashboard/users",
          },
        ]
      : initialMenu;

  return (
    <Card className="lg:w-72 xl:w-62.5 rounded h-fit hidden lg:block border-0 shadow-none gap-0 py-3">
      {/* ─── Navigation principale ─── */}
      <nav className="flex flex-col gap-0.5 px-2">
        {menuItems.map((item) => {
          const active = isActive(item.route);
          return (
            <Button
              asChild
              key={item.id}
              variant="ghost"
              className={`justify-start py-5 px-3 cursor-pointer transition-colors ${
                active
                  ? "bg-primary/10 dark:text-primary-foreground hover:bg-primary/30"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              <Link
                href={item.route}
                className={`px-3.5 py-1.5 rounded-lg transition-colors ${
                  active
                    ? "dark:text-white bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <item.icon
                  className={`size-4.5 mr-1 ${active ? "text-primary" : ""}`}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span
                  className={`flex-1 text-left text-sm ${active ? "font-bold text-primary" : "font-medium"}`}
                >
                  {item.name}
                </span>
                {/* {item.badge && item.badge > 0 && (
                  <span
                    className={`flex items-center justify-center text-[10px] font-bold rounded-full size-5 ${
                      active
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {item.badge}
                  </span>
                )} */}
              </Link>
            </Button>
          );
        })}
      </nav>

      {/* ─── Séparateur ─── */}
      <div className="mx-4 my-3 h-px bg-border" />

      {/* ─── Mes groupes ─── */}
      {myGroups.length > 0 && (
        <div className="flex flex-col gap-1 px-2">
          <div className="flex flex-row items-center justify-between px-3 mb-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Mes groupes
            </p>
            <Link
              href="/groups"
              className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              Voir tout
            </Link>
          </div>

          {myGroups.map((group) => (
            <Button
              asChild
              variant="ghost"
              key={group.id}
              className="justify-start cursor-pointer h-9 px-3 hover:bg-accent group"
            >
              <Link href={`/groups/${group.id}`}>
                <Avatar className="size-6 rounded-md shrink-0">
                  {group.imageUrl && (
                    <AvatarImage src={group.imageUrl} alt={group.name} />
                  )}
                  <AvatarFallback
                    className={`rounded-md text-[9px] font-bold ${getAvatarFallbackColor(group.name)}`}
                  >
                    {getInitials(group.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate flex-1">
                  {group.name}
                </span>
                {group.visibility === "private" && (
                  <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="size-3.5" />
                  </span>
                )}
              </Link>
            </Button>
          ))}
        </div>
      )}

      {/* ─── Séparateur ─── */}
      {/* <div className="mx-4 my-3 h-px bg-border" /> */}

      {/* ─── Paramètres ─── */}
      {/* <div className="px-2">
        <Button
          variant="ghost"
          className="w-full justify-start cursor-pointer h-9 px-3 text-muted-foreground hover:text-foreground"
        >
          <Settings className="size-4.5 mr-1" strokeWidth={2} />
          <span className="text-sm font-medium">Paramètres</span>
        </Button>
      </div> */}
    </Card>
  );
};

export default Sidebar;
