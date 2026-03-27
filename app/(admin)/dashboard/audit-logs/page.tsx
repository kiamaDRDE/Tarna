"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "@/src/components/providers/socketProvider";
import { useUserStore } from "@/src/store/userStore";
import { useAuditLogStore } from "@/src/store/auditLogStore";
import { AuditLog } from "@/src/types/audit";
import { apiFetch } from "@/src/lib/api";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/src/components/ui/avatar";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Separator } from "@/src/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import {
  Shield,
  Eye,
  MoreHorizontal,
  Activity,
  Clock,
  Users,
  Building2,
  Globe,
  Copy,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

// ── Helpers ──────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function humanizeEvent(event: string) {
  return event
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

const EVENT_VARIANTS: Record<string, { color: string; icon: typeof Activity }> = {
  ORGANIZATION_CREATED: { color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", icon: Building2 },
  ORGANIZATION_UPDATED: { color: "bg-blue-500/15 text-blue-700 dark:text-blue-400", icon: Building2 },
  ORGANIZATION_ARCHIVED: { color: "bg-amber-500/15 text-amber-700 dark:text-amber-400", icon: Building2 },
  ORGANIZATION_DELETED: { color: "bg-red-500/15 text-red-700 dark:text-red-400", icon: Building2 },
  GROUP_CREATED: { color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", icon: Users },
  GROUP_ARCHIVED: { color: "bg-amber-500/15 text-amber-700 dark:text-amber-400", icon: Users },
  MEMBER_ADDED: { color: "bg-blue-500/15 text-blue-700 dark:text-blue-400", icon: Users },
  MEMBER_REMOVED: { color: "bg-orange-500/15 text-orange-700 dark:text-orange-400", icon: Users },
  MEMBER_LEFT: { color: "bg-slate-500/15 text-slate-700 dark:text-slate-400", icon: Users },
  MEMBER_ROLE_CHANGED: { color: "bg-violet-500/15 text-violet-700 dark:text-violet-400", icon: Shield },
  JOIN_REQUEST_SENT: { color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400", icon: Users },
  JOIN_REQUEST_ACCEPTED: { color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", icon: Users },
  JOIN_REQUEST_REJECTED: { color: "bg-red-500/15 text-red-700 dark:text-red-400", icon: Users },
};

const DEFAULT_VARIANT = { color: "bg-slate-500/15 text-slate-700 dark:text-slate-400", icon: Activity };

// ── Skeleton Rows ────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-5 w-32 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-3.5 w-28" /></TableCell>
          <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const accessToken = useUserStore((s) => s.accessToken);
  const socket = useSocket();
  const {
    logs,
    loading,
    nextCursor,
    hasMore,
    selectedLog,
    eventFilter,
    setLogs,
    appendLogs,
    addLog,
    setSelectedLog,
    setEventFilter,
    setLoading,
  } = useAuditLogStore();

  const initialFetchDone = useRef(false);
  const [liveCount, setLiveCount] = useState(0);

  const fetchLogs = useCallback(
    async (cursor?: string | null) => {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("limit", "30");
      if (cursor) params.set("cursor", cursor);
      if (eventFilter) params.set("event", eventFilter);

      const res = await apiFetch(
        `/admin/audit-logs?${params.toString()}`,
        accessToken,
      );
      if (res.ok) {
        const json = await res.json();
        if (cursor) {
          appendLogs(json.data, json.meta?.nextCursor, json.meta?.hasMore);
        } else {
          setLogs(json.data, json.meta?.nextCursor, json.meta?.hasMore);
        }
      }
      setLoading(false);
    },
    [accessToken, eventFilter, setLogs, appendLogs, setLoading],
  );

  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    void fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!initialFetchDone.current) return;
    void fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventFilter]);

  useEffect(() => {
    if (!socket) return;
    const handleNew = (log: AuditLog) => {
      if (!eventFilter || log.event === eventFilter) {
        addLog(log);
        setLiveCount((c) => c + 1);
      }
    };
    socket.on("audit:new", handleNew);
    return () => {
      socket.off("audit:new", handleNew);
    };
  }, [socket, addLog, eventFilter]);

  const eventTypes = useMemo(() => {
    const types = new Set(logs.map((l) => l.event));
    return Array.from(types).sort();
  }, [logs]);

  // Stats
  const stats = useMemo(() => {
    const orgEvents = logs.filter((l) => l.event.startsWith("ORGANIZATION_")).length;
    const memberEvents = logs.filter(
      (l) => l.event.startsWith("MEMBER_") || l.event.startsWith("JOIN_"),
    ).length;
    const uniqueActors = new Set(logs.map((l) => l.actor.id)).size;
    return { total: logs.length, orgEvents, memberEvents, uniqueActors, live: liveCount };
  }, [logs, liveCount]);

  return (
    <TooltipProvider>
      <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-sm text-muted-foreground">
              Suivi en temps réel de toutes les actions sur la plateforme
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            {stats.live > 0 && (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 gap-1 animate-in fade-in">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {stats.live} nouveau{stats.live > 1 ? "x" : ""}
              </Badge>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 cursor-pointer"
                  onClick={() => {
                    setLiveCount(0);
                    void fetchLogs();
                  }}
                >
                  <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rafraîchir</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total", value: stats.total, icon: Activity, color: "text-blue-600 dark:text-blue-400" },
            { label: "Organisations", value: stats.orgEvents, icon: Building2, color: "text-violet-600 dark:text-violet-400" },
            { label: "Membres", value: stats.memberEvents, icon: Users, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Acteurs uniques", value: stats.uniqueActors, icon: Globe, color: "text-amber-600 dark:text-amber-400" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className={`rounded-lg bg-muted p-2.5 ${s.color}`}>
                <s.icon className="size-4" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3">
          <Select
            value={eventFilter ?? "all"}
            onValueChange={(v) => setEventFilter(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Tous les événements" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les événements</SelectItem>
              {eventTypes.map((e) => (
                <SelectItem key={e} value={e}>
                  {humanizeEvent(e)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="min-w-[200px]">Acteur</TableHead>
                <TableHead className="min-w-[180px]">Événement</TableHead>
                <TableHead className="min-w-[140px]">Organisation</TableHead>
                <TableHead className="min-w-[120px]">Date</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && logs.length === 0 ? (
                <TableSkeleton />
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Shield className="size-10 opacity-20" />
                      <p className="text-sm">Aucun log d&apos;audit</p>
                      <p className="text-xs">Les actions apparaîtront ici en temps réel</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const variant = EVENT_VARIANTS[log.event] ?? DEFAULT_VARIANT;
                  const Icon = variant.icon;
                  return (
                    <TableRow
                      key={log.id}
                      className="group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8 border">
                            <AvatarImage src={log.actor.avatarUrl ?? ""} />
                            <AvatarFallback className="text-[10px] font-medium">
                              {getInitials(log.actor.displayName ?? log.actor.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate leading-tight">
                              {log.actor.displayName ?? log.actor.username}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              @{log.actor.username}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`gap-1 font-normal ${variant.color} border-0`}
                        >
                          <Icon className="size-3" />
                          {humanizeEvent(log.event)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.organization ? (
                          <span className="text-sm">{log.organization.name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm text-muted-foreground flex items-center gap-1.5 cursor-default">
                              <Clock className="size-3 opacity-50" />
                              {timeAgo(log.createdAt)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            {formatDate(log.createdAt)}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLog(log);
                              }}
                            >
                              <Eye className="size-4" />
                              Voir le détail
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(log.id);
                                toast.success("ID copié");
                              }}
                            >
                              <Copy className="size-4" />
                              Copier l&apos;ID
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {hasMore && (
            <div className="border-t p-3">
              <Button
                variant="ghost"
                className="w-full text-sm cursor-pointer"
                disabled={loading}
                onClick={() => void fetchLogs(nextCursor)}
              >
                {loading ? (
                  <RefreshCw className="size-4 animate-spin mr-2" />
                ) : null}
                Charger plus de logs
              </Button>
            </div>
          )}
        </div>

        {/* ── Detail Dialog ──────────────────────────────── */}
        <Dialog
          open={!!selectedLog}
          onOpenChange={(open) => {
            if (!open) setSelectedLog(null);
          }}
        >
          <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-0">
              <DialogTitle className="flex items-center gap-2 text-base">
                <div className="rounded-lg bg-muted p-2">
                  <Shield className="size-4" />
                </div>
                Détail de l&apos;événement
              </DialogTitle>
            </DialogHeader>
            {selectedLog && (() => {
              const variant = EVENT_VARIANTS[selectedLog.event] ?? DEFAULT_VARIANT;
              const Icon = variant.icon;
              return (
                <div className="px-6 pb-6 pt-4 space-y-5">
                  {/* Event badge */}
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={`gap-1.5 text-sm py-1 px-3 ${variant.color} border-0`}
                    >
                      <Icon className="size-3.5" />
                      {humanizeEvent(selectedLog.event)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(selectedLog.createdAt)}
                    </span>
                  </div>

                  <Separator />

                  {/* Actor */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Acteur
                    </p>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9 border">
                        <AvatarImage src={selectedLog.actor.avatarUrl ?? ""} />
                        <AvatarFallback className="text-xs font-medium">
                          {getInitials(selectedLog.actor.displayName ?? selectedLog.actor.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-tight">
                          {selectedLog.actor.displayName ?? selectedLog.actor.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{selectedLog.actor.username}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLog.organization && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Organisation
                        </p>
                        <p className="text-sm">{selectedLog.organization.name}</p>
                      </div>
                    )}
                    {selectedLog.targetUser && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Cible
                        </p>
                        <p className="text-sm">
                          {selectedLog.targetUser.displayName ?? selectedLog.targetUser.username}
                        </p>
                      </div>
                    )}
                    {selectedLog.ipAddress && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Adresse IP
                        </p>
                        <p className="text-sm font-mono">{selectedLog.ipAddress}</p>
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  {selectedLog.metadata &&
                    Object.keys(selectedLog.metadata).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Métadonnées
                        </p>
                        <pre className="p-4 bg-muted/50 rounded-lg text-xs overflow-auto max-h-52 border font-mono leading-relaxed">
                          {JSON.stringify(selectedLog.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
