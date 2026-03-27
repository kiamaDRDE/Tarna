export type ConversationMember = {
  id: string;
  userId: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
  lastReadAt: string | null;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export type Message = {
  id: string;
  conversationId: string;
  expediteurId: string;
  contenu: string;
  type: "text" | "image" | "file";
  fichierUrl: string | null;
  fichierNom: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  expediteur: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  _count?: { readReceipts: number };
  /** Client-only: delivery status for optimistic UI */
  status?: "pending" | "sent" | "read";
};

export type Conversation = {
  id: string;
  titre: string | null;
  estGroupe: boolean;
  imageUrl: string | null;
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
  members: ConversationMember[];
  dernierMessage?: Message | null;
  nonLus?: number;
};
