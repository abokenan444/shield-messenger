import { create } from 'zustand';

export interface Contact {
  id: string;
  displayName: string;
  onionAddress: string;
  publicKey: string;
  avatar: string | null;
  status: 'online' | 'offline';
  verified: boolean;
  blocked: boolean;
  addedAt: number;
}

export interface FriendRequest {
  id: string;
  fromId: string;
  fromName: string;
  fromOnion: string;
  direction: 'incoming' | 'outgoing';
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected';
}

interface ContactState {
  contacts: Contact[];
  friendRequests: FriendRequest[];

  addContact: (contact: Contact) => void;
  removeContact: (id: string) => void;
  blockContact: (id: string) => void;
  unblockContact: (id: string) => void;
  setContacts: (contacts: Contact[]) => void;

  addFriendRequest: (request: FriendRequest) => void;
  acceptFriendRequest: (id: string) => void;
  rejectFriendRequest: (id: string) => void;
  cancelFriendRequest: (id: string) => void;
  setFriendRequests: (requests: FriendRequest[]) => void;
}

export const useContactStore = create<ContactState>()((set) => ({
  contacts: [
    {
      id: 'sl_ahmed',
      displayName: 'أحمد محمد',
      onionAddress: 'ahmed7k3x...onion',
      publicKey: 'ed25519:abc123...',
      avatar: null,
      status: 'online',
      verified: true,
      blocked: false,
      addedAt: Date.now() - 86400000 * 7,
    },
    {
      id: 'sl_sarah',
      displayName: 'سارة أحمد',
      onionAddress: 'sarah9m2p...onion',
      publicKey: 'ed25519:def456...',
      avatar: null,
      status: 'offline',
      verified: true,
      blocked: false,
      addedAt: Date.now() - 86400000 * 3,
    },
    {
      id: 'sl_dev1',
      displayName: 'خالد حسن',
      onionAddress: 'khaled4r...onion',
      publicKey: 'ed25519:ghi789...',
      avatar: null,
      status: 'online',
      verified: false,
      blocked: false,
      addedAt: Date.now() - 86400000,
    },
  ],
  friendRequests: [
    {
      id: 'fr-001',
      fromId: 'sl_unknown1',
      fromName: 'محمد علي',
      fromOnion: 'moha5t2x...onion',
      direction: 'incoming',
      timestamp: Date.now() - 3600000,
      status: 'pending',
    },
  ],

  addContact: (contact) =>
    set((state) => ({ contacts: [...state.contacts, contact] })),

  removeContact: (id) =>
    set((state) => ({ contacts: state.contacts.filter((c) => c.id !== id) })),

  blockContact: (id) =>
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.id === id ? { ...c, blocked: true } : c,
      ),
    })),

  unblockContact: (id) =>
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.id === id ? { ...c, blocked: false } : c,
      ),
    })),

  setContacts: (contacts) => set({ contacts }),

  addFriendRequest: (request) =>
    set((state) => ({ friendRequests: [...state.friendRequests, request] })),

  acceptFriendRequest: (id) =>
    set((state) => ({
      friendRequests: state.friendRequests.map((r) =>
        r.id === id ? { ...r, status: 'accepted' as const } : r,
      ),
    })),

  rejectFriendRequest: (id) =>
    set((state) => ({
      friendRequests: state.friendRequests.map((r) =>
        r.id === id ? { ...r, status: 'rejected' as const } : r,
      ),
    })),

  cancelFriendRequest: (id) =>
    set((state) => ({
      friendRequests: state.friendRequests.filter((r) => r.id !== id),
    })),

  setFriendRequests: (requests) => set({ friendRequests: requests }),
}));
