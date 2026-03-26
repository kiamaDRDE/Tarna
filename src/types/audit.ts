export interface AuditLogActor {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface AuditLog {
  id: string;
  event: string;
  metadata: Record<string, unknown>;
  ipAddress?: string | null;
  createdAt: string;
  actor: AuditLogActor;
  targetUser?: {
    id: string;
    username: string;
    displayName: string | null;
  } | null;
  organization?: {
    id: string;
    name: string;
  } | null;
}
