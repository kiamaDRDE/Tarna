export type GroupVisibility = "public" | "private" | "secret";
export type GroupStatus = "active" | "archived";
export type GroupRole = "owner" | "admin" | "moderator" | "member";
export type GroupMembershipStatus = "pending" | "accepted" | "banned";

/**
 * Shape renvoyée par GET /groups, /groups/mine, /groups/discover.
 * Correspond au select `groupPreview` du backend.
 */
export type GroupResponse = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  visibility: GroupVisibility;
  status: GroupStatus;
  orgId: string | null;
  createdAt: string;
  _count: {
    memberships: number;
  };
  /** Présent uniquement dans /groups/mine */
  currentUserRole?: GroupRole | null;
};

export type DetailedGroupResponse = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  visibility: GroupVisibility;
  status: GroupStatus;
  orgId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  organization: {
    id: string;
    name: string;
    logoUrl: string | null;
  } | null;
  _count: {
    memberships: number;
  };
  currentUserRole?: GroupRole | null;
};

/** Réponse paginée commune */
export type PaginatedGroupResponse = {
  data: GroupResponse[];
  meta: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

/** Shape d'un membre retourné par GET /groups/:groupId/members */
export type GroupMember = {
  id: string;
  role: GroupRole;
  status: GroupMembershipStatus;
  joinedAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
  };
};

export type PaginatedGroupMembersResponse = {
  data: GroupMember[];
  meta: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

/** Shape d'une demande d'adhésion à un groupe */
export type GroupJoinRequest = {
  id: string;
  status: string;
  joinedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
  };
};

export type PaginatedGroupJoinRequestsResponse = {
  data: GroupJoinRequest[];
  meta: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

/** @deprecated — ancienne shape mock, utiliser GroupResponse */
export type Group = {
  id: number;
  name: string;
  description: string;
  banner: string;
  avatar: string;
  initials: string;
  visibility: GroupVisibility;
  membersCount: number;
  postsCount: number;
  isMember: boolean;
  isPending: boolean;
  category: string;
  lastActivity: string;
};
