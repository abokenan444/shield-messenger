import { create } from 'zustand';
import {
  saveContactTrust,
  loadAllContactTrust,
  deleteContactTrust,
  type TrustLevelValue,
  type ContactTrustRecord,
} from '../cryptoStore';

export interface Contact {
  id: string;
  displayName: string;
  onionAddress: string;
  publicKey: string;
  avatar: string | null;
  status: 'online' | 'offline';
  /** @deprecated Use trustLevel instead. Kept for backward compatibility. */
  verified: boolean;
  blocked: boolean;
  addedAt: number;
  /** Trust level: 0 = Untrusted, 1 = Encrypted, 2 = Verified */
  trustLevel: TrustLevelValue;
  /** Previous public key — set when an identity key change is detected */
  previousPublicKey?: string;
  /** Timestamp when the identity key change was detected */
  keyChangeDetectedAt?: number;
  /** Whether the user has dismissed the key-change warning */
  keyChangeDismissed?: boolean;
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
  verifyContact: (id: string) => void;
  setContactTrustLevel: (id: string, level: TrustLevelValue) => void;
  setContacts: (contacts: Contact[]) => void;
  hydrateTrustLevels: () => Promise<void>;

  addFriendRequest: (request: FriendRequest) => void;
  acceptFriendRequest: (id: string) => void;
  rejectFriendRequest: (id: string) => void;
  cancelFriendRequest: (id: string) => void;
  setFriendRequests: (requests: FriendRequest[]) => void;
  /** Record an identity key change for a contact — drops trust to 1 */
  recordKeyChange: (id: string, newPublicKey: string) => void;
  /** Dismiss the key-change warning banner for a contact */
  dismissKeyChange: (id: string) => void;
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
      trustLevel: 2,
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
      trustLevel: 2,
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
      trustLevel: 1,
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

  removeContact: (id) => {
    deleteContactTrust(id).catch(() => {});
    set((state) => ({ contacts: state.contacts.filter((c) => c.id !== id) }));
  },

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

  verifyContact: (id) => {
    const record: ContactTrustRecord = {
      contactId: id,
      trustLevel: 2,
      verifiedAt: Date.now(),
      safetyNumber: '',
    };
    saveContactTrust(record).catch(() => {});
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.id === id ? { ...c, verified: true, trustLevel: 2 as TrustLevelValue } : c,
      ),
    }));
  },

  setContactTrustLevel: (id, level) => {
    const record: ContactTrustRecord = {
      contactId: id,
      trustLevel: level,
      verifiedAt: level === 2 ? Date.now() : 0,
      safetyNumber: '',
    };
    saveContactTrust(record).catch(() => {});
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.id === id ? { ...c, trustLevel: level, verified: level === 2 } : c,
      ),
    }));
  },

  setContacts: (contacts) => set({ contacts }),

  hydrateTrustLevels: async () => {
    const records = await loadAllContactTrust();
    const trustMap = new Map(records.map((r) => [r.contactId, r]));
    set((state) => ({
      contacts: state.contacts.map((c) => {
        const rec = trustMap.get(c.id);
        if (rec) {
          return { ...c, trustLevel: rec.trustLevel, verified: rec.trustLevel === 2 };
        }
        return c;
      }),
    }));
  },

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

  recordKeyChange: (id, newPublicKey) =>
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.id === id
          ? {
              ...c,
              previousPublicKey: c.publicKey,
              publicKey: newPublicKey,
              keyChangeDetectedAt: Date.now(),
              keyChangeDismissed: false,
              trustLevel: 1 as TrustLevelValue,
              verified: false,
            }
          : c,
      ),
    })),

  dismissKeyChange: (id) =>
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.id === id ? { ...c, keyChangeDismissed: true } : c,
      ),
    })),
}));
