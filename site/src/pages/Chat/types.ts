// WebSocket RPC types
export interface WSMessage {
  id?: number;
  action?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
  event?: string;
  payload?: any;
}

// Chat types
export interface Chat {
  id: string;
  userAId: string;
  userBId: string;
  lastMessage: string;
  updatedAt: string;
  isArchived: boolean;
  unreadCount?: number;
  otherUser?: {
    userId: string;
    profileId?: string | null;
    preferredName: string;
    avatar?: string;
  };
}

export interface Message {
  id: string;
  chatId?: string;
  senderId: string;
  text?: string | null;
  media?: string | null;
  type: string;
  createdAt: string;
  editedAt?: string | null;
  readAt?: string | null;
  isOwn?: boolean;
}

export interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>; // chatId -> messages
  selectedChatId: string | null;
  loading: boolean;
  error: string | null;
  nextCursor: string | null;
  nextMessageCursors: Record<string, string>; // chatId -> cursor
}

// RPC request types
export interface GetChatsParams {
  limit: number;
  cursor?: string | null;
}

export interface GetMessagesParams {
  chatId: string;
  limit: number;
  cursor?: string | null;
}

export interface SendMessageParams {
  chatId: string;
  text: string;
  type: 'text';
}

export interface EditMessageParams {
  messageId: string;
  text: string;
}

export interface DeleteMessageParams {
  messageId: string;
  scope: 'self' | 'both';
}

// Event types
export interface NewMessageEvent {
  event: 'new_message';
  payload: {
    chatId: string;
    message: Message;
  };
}

export interface MessageUpdatedEvent {
  event: 'message_updated';
  payload: {
    message: Message;
  };
}

export interface MessageDeletedEvent {
  event: 'message_deleted';
  payload: {
    messageId: string;
    scope: 'self' | 'both';
  };
}

export interface ChatArchivedEvent {
  event: 'chat_archived';
  payload: {
    chatId: string;
    by: 'you' | 'other';
    archive: boolean;
  };
}

export interface ChatBlockedEvent {
  event: 'chat_blocked';
  payload: {
    chatId: string;
    by: 'you' | 'other';
  };
}

export interface ChatDeletedEvent {
  event: 'chat_deleted';
  payload: {
    chatId: string;
    scope: 'self' | 'both';
  };
}

export type ChatEvent = 
  | NewMessageEvent 
  | MessageUpdatedEvent 
  | MessageDeletedEvent
  | ChatArchivedEvent
  | ChatBlockedEvent
  | ChatDeletedEvent; 

export interface ChatDetailProps {
  onBack: () => void;
  currentUserId: string | null;
  markRead: (chatId:string,messageIds:string[])=>Promise<void>;
} 