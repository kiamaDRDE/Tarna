import { Users, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { groupsData } from "@/src/data/groups";
import Link from "next/link";
import AnnouncementRightBarWidget from "./ui/announcementRightBarWidget";

/* ─── Suggestions de personnes ─── */
const suggestedPeople = [
  {
    id: 1,
    name: "Sophie Ndong",
    role: "Product Designer",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
    initials: "SN",
  },
  {
    id: 2,
    name: "Alain Kamga",
    role: "Backend Developer",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80",
    initials: "AK",
  },
  {
    id: 3,
    name: "Fatou Diallo",
    role: "Data Analyst",
    avatar:
      "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&q=80",
    initials: "FD",
  },
];

/* ─── Groupes suggérés (non membre, non pending) ─── */
const suggestedGroups = groupsData
  .filter((g) => !g.isMember && !g.isPending)
  .slice(0, 3);

const RightBar = () => {
  return (
    <div className="w-75 pl-2 h-full hidden xl:flex flex-col gap-3 overflow-y-auto hide-scrollbar py-1 pr-1">
      {/* ─── Annonces officielles ─── */}
      <AnnouncementRightBarWidget />

      {/* ─── Tendances ─── */}
      {/* <Card className="gap-0 py-3 px-0 border shadow-none">
        <CardHeader className="px-4 pb-2 pt-0">
          <div className="flex flex-row items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Tendances</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-1 pb-0 pt-0">
          {trends.map((trend) => (
            <a
              key={trend.id}
              href="#"
              className="flex flex-row items-center justify-between px-3 py-2 rounded-md hover:bg-accent transition-colors group"
            >
              <div className="flex flex-row items-center gap-2">
                <Hash className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm font-medium group-hover:text-primary transition-colors">
                  {trend.tag}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {formatCount(trend.posts)} posts
              </span>
            </a>
          ))}
        </CardContent>
      </Card> */}

      {/* ─── Suggestions de personnes ─── */}
      {/* <Card className="gap-0 py-3 px-0 border shadow-none">
        <CardHeader className="px-4 pb-2 pt-0">
          <div className="flex flex-row items-center gap-2">
            <UserPlus className="size-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Personnes à suivre
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-0 pt-0 flex flex-col gap-0.5">
          {suggestedPeople.map((person) => (
            <div
              key={person.id}
              className="flex flex-row items-center gap-2.5 px-2 py-2 rounded-md hover:bg-accent transition-colors cursor-pointer"
            >
              <Avatar className="size-9 shrink-0">
                <AvatarImage src={person.avatar} alt={person.name} />
                <AvatarFallback className="text-xs font-semibold">
                  {person.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">
                  {person.name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {person.role}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer h-7 text-xs px-2.5 shrink-0"
              >
                Suivre
              </Button>
            </div>
          ))}
        </CardContent>
      </Card> */}

      {/* ─── Groupes suggérés ─── */}
      {/* <Card className="gap-0 py-3 px-0 border shadow-none">
        <CardHeader className="px-4 pb-2 pt-0">
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-row items-center gap-2">
              <Users className="size-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Groupes suggérés
              </CardTitle>
            </div>
            <Link
              href="/groups"
              className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              Voir tout
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-0 pt-0 flex flex-col gap-0.5">
          {suggestedGroups.map((group) => (
            <div
              key={group.id}
              className="flex flex-row items-center gap-2.5 px-2 py-2 rounded-md hover:bg-accent transition-colors cursor-pointer"
            >
              <Avatar className="size-9 rounded-lg shrink-0">
                <AvatarImage
                  src={group.avatar}
                  alt={group.name}
                  className="rounded-lg"
                />
                <AvatarFallback className="rounded-lg text-xs font-bold">
                  {group.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">
                  {group.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {group.membersCount.toLocaleString()} membres
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer h-7 text-xs px-2.5 shrink-0"
              >
                Rejoindre
              </Button>
            </div>
          ))}
        </CardContent>
      </Card> */}

      {/* ─── Footer ─── */}
      <div className="px-3 pb-4 pt-1">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          © 2026 Tarna par KIAMA · À propos · Confidentialité · Conditions
        </p>
      </div>
    </div>
  );
};

export default RightBar;
