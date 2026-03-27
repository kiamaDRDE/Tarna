"use client";

import { Bell, House, LucideIcon, MessageCircle, Users, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  id: number;
  name: string;
  icon: LucideIcon;
  route: string;
};

const navItems: NavItem[] = [
  { id: 0, name: "Home", icon: House, route: "/home" },
  { id: 1, name: "Organisations", icon: Users, route: "/organizations" },
  { id: 2, name: "Groupes", icon: UsersRound, route: "/groups" },
  { id: 3, name: "Messages", icon: MessageCircle, route: "/messages" },
  { id: 4, name: "Notifications", icon: Bell, route: "/notifications" },
];

const BottomBar = () => {
  const pathname = usePathname();

  const isActive = (route: string) =>
    pathname === route || pathname.startsWith(route + "/");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-background/95 backdrop-blur-sm">
      <div className="flex flex-row items-center justify-around h-16 px-2 max-w-2xl mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.route);
          return (
            <Link
              key={item.id}
              href={item.route}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  active ? "bg-primary/10" : ""
                }`}
              >
                <item.icon
                  className="size-5"
                  strokeWidth={active ? 2.5 : 2}
                />
              </div>
              <span
                className={`text-[10px] leading-none ${
                  active ? "font-semibold" : "font-medium"
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomBar;
