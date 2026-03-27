export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  parentCommentId: string | null;
  author: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    initials: string;
  };
  content: string;
  mediaUrl: string | null;
  isEdited: boolean;
  stats: {
    replies_count: number;
    reactions_count: number;
  };
  createdAt: string;
  updatedAt: string;
  timeAgo: string;
  /** Réponses (calculées côté client pour l'arbre 3 niveaux) */
  replies?: Comment[];
};

export type MediaType = "image" | "video" | "document";

export type Media = {
  id: number;
  type: MediaType;
  url: string;
  alt?: string;
  /** Nom du fichier (utile pour les documents) */
  fileName?: string;
  /** Taille du fichier en octets (utile pour les documents) */
  fileSize?: number;
  /** Extension du fichier (ex: pdf, docx, xlsx) */
  fileExtension?: string;
};

export type FileDocument = {
  url: string;
  fileName: string;
  extension: string;
};

export type Post = {
  id: string;
  authorId?: string;
  orgId?: string | null;
  groupId?: string | null;
  parentPostId?: string | null;
  author: {
    id?: string;
    name: string;
    username: string;
    avatar: string;
    initials: string;
    isVerified?: boolean;
  };
  organization?: {
    id: string;
    name: string;
    logoUrl: string | null;
    sector: string;
  } | null;
  content: string;
  visibility?: string;
  isPinned: boolean;
  isEdited?: boolean;
  commentsEnabled?: boolean;
  sharesEnabled?: boolean;
  media: Media[];
  reactions: {
    heart: number;
    lightbulb: number;
    handshake: number;
  };
  images: string[];
  files: FileDocument[];
  stats: {
    likes_count: number;
    views_count: number;
    shares_count: number;
    comments_count: number;
    supports_count: number;
    reactions_count: number;
    illuminates_count: number;
  };
  comments: number;
  shares: number;
  createdAt: string;
  updatedAt?: string;
  timeAgo: string;
  myReaction?: "like" | "illuminate" | "support" | null;
};

export type Visibility = "public" | "private" | "group";

export type ReceivePost = {
  id: string;
  authorId: string;
  orgId: string | null;
  groupId: string | null;
  parentPostId: string | null;
  contentText: string;
  visibility: Visibility;
  isPinned: boolean;
  isEdited: boolean;
  commentsEnabled: boolean;
  sharesEnabled: boolean;
  images: string[];
  files: string[];
  stats: {
    likes_count: number;
    views_count: number;
    shares_count: number;
    comments_count: number;
    supports_count: number;
    reactions_count: number;
    illuminates_count: number;
  };
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  organization?: {
    id: string;
    name: string;
    logoUrl: string | null;
    sector: string;
  } | null;
  content?: string;
  media: string[];
  reactions: {
    heart: number;
    lightbulb: number;
    handshake: number;
  };
  shares: number;
  parentPost: string | null;
  _count: {
    comments: number;
  };
  myReaction: "like" | "illuminate" | "support" | null;
};
