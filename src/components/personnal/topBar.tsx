"use client";

import { Card } from "../ui/card";
import {
  Bell,
  Building2,
  Home,
  House,
  LogOut,
  LucideIcon,
  Menu,
  MessageCircle,
  Moon,
  Search,
  Settings,
  Sun,
  User,
  Users,
} from "lucide-react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Link from "next/link";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import Image from "next/image";
import { useUserStore } from "@/src/store/userStore";
import { useTheme } from "next-themes";
import { getAvatarFallbackColor } from "@/src/lib/avatarColor";
import {
  IconCirclePlusFilled,
  IconHome,
  IconHomeFilled,
  type Icon,
} from "@tabler/icons-react";

type NavItem = {
  id: number;
  name: string;
  icon: LucideIcon | Icon;
  route: string;
  badge?: number;
};

const TopBar = () => {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const isActive = (prefix: string) =>
    pathname === prefix || pathname.startsWith(prefix + "/");
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const currentUser = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);
  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const iconActive = isActive("/home") ? IconHomeFilled : IconHome;
  const navItems: NavItem[] = [
    { id: 0, name: "Accueil", icon: Home, route: "/home" },
    { id: 1, name: "Organisations", icon: Building2, route: "/organizations" },
    { id: 2, name: "Groupes", icon: Users, route: "/groups" },
    {
      id: 3,
      name: "Discussions",
      icon: MessageCircle,
      route: "/messages",
      badge: 4,
    },
    {
      id: 4,
      name: "Notifications",
      icon: Bell,
      route: "/notifications",
      badge: 3,
    },{
      id: 5,
      name: "Profile",
      icon: User,
      route: `/profil/${currentUser?.username}`,
    },
  ];
  // useEffect(()=> {
  //   if (!isAuthenticated) {
  //     redirect("/login");
  //   }
  // }, [isAuthenticated])

  return (
    <Card className="flex flex-row items-center justify-between px-4 rounded py-0 w-full xl:w-7xl h-14 z-40 gap-4">
      {/* ─── Logo ─── */}
      <Link
        href="/home"
        className="flex flex-row gap-2 items-center shrink-0 hover:opacity-80 transition-opacity"
      >
        <Image src="/logo.svg" alt="Tarna logo" width={24} height={24} />
        <span className="hidden lg:block text-base font-bold tracking-tight">
          Tarna
        </span>
      </Link>

      {/* ─── Barre de recherche (desktop) ─── */}
      <div className="hidden lg:flex flex-1 max-w-md">
        {/* <InputGroup className="w-full">
          <InputGroupInput placeholder="Rechercher..." />
          <InputGroupAddon>
            <Search className="size-4" />
          </InputGroupAddon>
        </InputGroup> */}
      </div>

      {/* ─── Navigation desktop ─── */}
      {isAuthenticated && (
        <nav className="hidden lg:flex flex-row items-center gap-1">
          {navItems.map((item) => {
            const active = isActive(item.route);
            return (
              <Link
                key={item.id}
                href={item.route}
                className={`relative flex flex-col items-center justify-center px-3.5 py-1.5 rounded-lg transition-colors ${
                  active
                    ? "dark:text-white bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <div className="relative">
                  <item.icon
                    className={`size-5 ${active ? "text-primary" : ""}`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {/* {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex items-center justify-center text-[9px] font-bold text-primary-foreground bg-primary rounded-full size-4">
                      {item.badge}
                    </span>
                  )} */}
                </div>
                <span
                  className={`text-[10px] mt-0.5 leading-none ${
                    active ? "font-bold text-primary" : "font-medium"
                  }`}
                >
                  {item.name}
                </span>
                {/* Indicateur actif */}
                {active && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      )}

      {/* ─── Actions droite ─── */}
      <div className="flex flex-row items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          className="rounded-lg"
          aria-label={
            isDark ? "Passer au theme clair" : "Passer au theme sombre"
          }
          title={isDark ? "Theme clair" : "Theme sombre"}
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        {/* Bouton recherche mobile */}
        {/* <button className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors cursor-pointer">
          <Search className="size-5 text-muted-foreground" />
        </button> */}

        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer focus:outline-none">
                {/* Avatar desktop */}
                <Avatar className="hidden lg:flex size-9 ring-2 ring-transparent hover:ring-primary/20 transition-all cursor-pointer">
                  <AvatarImage
                    src={currentUser?.avatarUrl || ""}
                    alt="profil"
                  />
                  <AvatarFallback
                    className={`text-xs font-semibold ${getAvatarFallbackColor(currentUser?.initials)}`}
                  >
                    {currentUser?.initials}
                  </AvatarFallback>
                </Avatar>
                {/* Menu burger mobile */}
                <div className="flex lg:hidden items-center justify-center p-2 rounded-lg hover:bg-accent transition-colors">
                  <Menu className="size-5" />
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-52" align="end" sideOffset={8}>
              {/* En-tête profil */}
              <div className="flex flex-row items-center gap-2.5 px-2 py-2">
                <Avatar className="size-9 shrink-0">
                  <AvatarImage
                    src={currentUser?.avatarUrl || ""}
                    alt="profil"
                  />
                  <AvatarFallback
                    className={`text-xs font-semibold ${getAvatarFallbackColor(currentUser?.initials)}`}
                  >
                    {currentUser?.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {currentUser?.displayName || currentUser?.username}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    @{currentUser?.username}
                  </p>
                </div>
              </div>

              <DropdownMenuSeparator />

              {/* Nav mobile */}
              <DropdownMenuGroup className="lg:hidden">
                {navItems.map((item) => (
                  <DropdownMenuItem
                    asChild
                    key={item.id}
                    className="cursor-pointer"
                  >
                    <Link
                      href={item.route}
                      className="flex flex-row items-center gap-2"
                    >
                      <item.icon className="size-4" />
                      <span className="flex-1">{item.name}</span>
                      {item.badge && item.badge > 0 && (
                        <span className="text-[10px] font-bold bg-primary/10 text-primary rounded-full px-1.5 py-0.5">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </DropdownMenuGroup>

              {/* Actions communes */}
              <DropdownMenuGroup>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link
                    href={`/profil/${currentUser?.username}`}
                    className="flex flex-row items-center gap-2"
                  >
                    <User className="size-4" />
                    Mon profil
                  </Link>
                </DropdownMenuItem>
                {/* <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="#" className="flex flex-row items-center gap-2">
                    <Settings className="size-4" />
                    Paramètres
                  </Link>
                </DropdownMenuItem> */}
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={logout}
              >
                <LogOut className="size-4 mr-2" />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex flex-row items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="cursor-pointer"
            >
              <Link href="/login">Connexion</Link>
            </Button>
            <Button size="sm" asChild className="cursor-pointer">
              <Link href="/signup">S&apos;inscrire</Link>
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TopBar;
