import { describe, it, expect, beforeEach } from 'vitest';
import { useContactStore, type Contact, type FriendRequest } from '../../src/lib/store/contactStore';

const makeContact = (id: string, overrides?: Partial<Contact>): Contact => ({
  id,
  displayName: `User ${id}`,
  onionAddress: `${id}...onion`,
  publicKey: `ed25519:${id}`,
  avatar: null,
  status: 'online',
  verified: false,
  blocked: false,
  addedAt: Date.now(),
  ...overrides,
});

describe('contactStore', () => {
  beforeEach(() => {
    // Reset to empty state (the store has initial mock data)
    useContactStore.setState({
      contacts: [],
      friendRequests: [],
    });
  });

  describe('contacts', () => {
    it('should set contacts', () => {
      useContactStore.getState().setContacts([makeContact('c1'), makeContact('c2')]);
      expect(useContactStore.getState().contacts).toHaveLength(2);
    });

    it('should add a contact', () => {
      useContactStore.getState().addContact(makeContact('c1'));
      expect(useContactStore.getState().contacts).toHaveLength(1);
      expect(useContactStore.getState().contacts[0].id).toBe('c1');
    });

    it('should remove a contact', () => {
      useContactStore.getState().setContacts([makeContact('c1'), makeContact('c2')]);
      useContactStore.getState().removeContact('c1');
      expect(useContactStore.getState().contacts).toHaveLength(1);
      expect(useContactStore.getState().contacts[0].id).toBe('c2');
    });

    it('should block a contact', () => {
      useContactStore.getState().setContacts([makeContact('c1')]);
      useContactStore.getState().blockContact('c1');
      expect(useContactStore.getState().contacts[0].blocked).toBe(true);
    });

    it('should unblock a contact', () => {
      useContactStore.getState().setContacts([makeContact('c1', { blocked: true })]);
      useContactStore.getState().unblockContact('c1');
      expect(useContactStore.getState().contacts[0].blocked).toBe(false);
    });
  });

  describe('friend requests', () => {
    const makeRequest = (id: string, overrides?: Partial<FriendRequest>): FriendRequest => ({
      id,
      fromId: `user-${id}`,
      fromName: `User ${id}`,
      fromOnion: `${id}...onion`,
      direction: 'incoming',
      timestamp: Date.now(),
      status: 'pending',
      ...overrides,
    });

    it('should add friend request', () => {
      useContactStore.getState().addFriendRequest(makeRequest('fr1'));
      expect(useContactStore.getState().friendRequests).toHaveLength(1);
    });

    it('should accept friend request', () => {
      useContactStore.getState().setFriendRequests([makeRequest('fr1')]);
      useContactStore.getState().acceptFriendRequest('fr1');
      expect(useContactStore.getState().friendRequests[0].status).toBe('accepted');
    });

    it('should reject friend request', () => {
      useContactStore.getState().setFriendRequests([makeRequest('fr1')]);
      useContactStore.getState().rejectFriendRequest('fr1');
      expect(useContactStore.getState().friendRequests[0].status).toBe('rejected');
    });

    it('should cancel outgoing friend request', () => {
      useContactStore.getState().setFriendRequests([makeRequest('fr1', { direction: 'outgoing' })]);
      useContactStore.getState().cancelFriendRequest('fr1');
      // cancelFriendRequest removes the request
      const remaining = useContactStore.getState().friendRequests;
      expect(remaining.every(r => r.id !== 'fr1' || r.status !== 'pending')).toBe(true);
    });
  });
});
