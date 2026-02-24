import { create } from 'zustand';

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'text' | 'image' | 'file' | 'audio' | 'system';
  encrypted: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface Room {
  id: string;
  name: string;
  avatar: string | null;
  lastMessage: string | null;
  lastMessageTime: number | null;
  unreadCount: number;
  encrypted: boolean;
  isDirect: boolean;
  members: string[];
  typing: string[];
}

interface ChatState {
  rooms: Room[];
  activeRoomId: string | null;
  messages: Record<string, Message[]>;
  isLoading: boolean;

  setRooms: (rooms: Room[]) => void;
  setActiveRoom: (roomId: string | null) => void;
  addMessage: (roomId: string, message: Message) => void;
  setMessages: (roomId: string, messages: Message[]) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  rooms: [],
  activeRoomId: null,
  messages: {},
  isLoading: false,

  setRooms: (rooms) => set({ rooms }),

  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

  addMessage: (roomId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: [...(state.messages[roomId] || []), message],
      },
    })),

  setMessages: (roomId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [roomId]: messages },
    })),

  updateRoom: (roomId, updates) =>
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId ? { ...r, ...updates } : r,
      ),
    })),

  setLoading: (loading) => set({ isLoading: loading }),
}));
