export type AnnouncementScope = 'network' | 'groups';
export type AnnouncementStatus = 'active' | 'archived';

export type AnnouncementAuthor = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type AnnouncementTarget = {
  id: string;
  groupId: string;
  group: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
};

export type Announcement = {
  id: string;
  orgId: string;
  authorId: string;
  delegateId: string | null;
  title: string;
  contentText: string;
  scope: AnnouncementScope;
  status: AnnouncementStatus;
  isPinned: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: AnnouncementAuthor;
  delegate: AnnouncementAuthor | null;
  organization: {
    id: string;
    name: string;
    logoUrl: string | null;
    sector: string | null;
  };
  targets: AnnouncementTarget[];
  _count: {
    reads: number;
  };
  isRead: boolean;
  timeAgo?: string;
};

export type PaginatedAnnouncementsResponse = {
  data: Announcement[];
  meta: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export type AnnouncementReadStats = {
  totalRecipients: number;
  readCount: number;
  unreadCount: number;
  readPercentage: number;
};

export type AnnouncementReader = {
  id: string;
  readAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export type PaginatedReadersResponse = {
  data: AnnouncementReader[];
  meta: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};
