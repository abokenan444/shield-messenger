import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore, type Room, type Message } from '../../src/lib/store/chatStore';

const makeRoom = (id: string, overrides?: Partial<Room>): Room => ({
  id,
  name: `Room ${id}`,
  avatar: null,
  lastMessage: null,
  lastMessageTime: null,
  unreadCount: 0,
  encrypted: true,
  isDirect: true,
  members: ['user1', 'user2'],
  typing: [],
  ...overrides,
});

const makeMessage = (id: string, roomId: string, overrides?: Partial<Message>): Message => ({
  id,
  roomId,
  senderId: 'user1',
  senderName: 'Alice',
  content: `Message ${id}`,
  timestamp: Date.now(),
  type: 'text',
  encrypted: true,
  status: 'sent',
  ...overrides,
});

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      rooms: [],
      activeRoomId: null,
      messages: {},
      isLoading: false,
    });
  });

  describe('rooms', () => {
    it('should start with empty rooms', () => {
      expect(useChatStore.getState().rooms).toEqual([]);
    });

    it('should set rooms', () => {
      const rooms = [makeRoom('r1'), makeRoom('r2')];
      useChatStore.getState().setRooms(rooms);
      expect(useChatStore.getState().rooms).toHaveLength(2);
    });

    it('should replace rooms on second setRooms call', () => {
      useChatStore.getState().setRooms([makeRoom('r1')]);
      useChatStore.getState().setRooms([makeRoom('r2'), makeRoom('r3')]);
      expect(useChatStore.getState().rooms).toHaveLength(2);
      expect(useChatStore.getState().rooms[0].id).toBe('r2');
    });

    it('should update a room', () => {
      useChatStore.getState().setRooms([makeRoom('r1')]);
      useChatStore.getState().updateRoom('r1', { unreadCount: 5, lastMessage: 'Hello' });
      const room = useChatStore.getState().rooms.find(r => r.id === 'r1');
      expect(room?.unreadCount).toBe(5);
      expect(room?.lastMessage).toBe('Hello');
    });

    it('should not affect other rooms on update', () => {
      useChatStore.getState().setRooms([makeRoom('r1'), makeRoom('r2')]);
      useChatStore.getState().updateRoom('r1', { unreadCount: 3 });
      expect(useChatStore.getState().rooms.find(r => r.id === 'r2')?.unreadCount).toBe(0);
    });
  });

  describe('activeRoom', () => {
    it('should start with null', () => {
      expect(useChatStore.getState().activeRoomId).toBeNull();
    });

    it('should set active room', () => {
      useChatStore.getState().setActiveRoom('r1');
      expect(useChatStore.getState().activeRoomId).toBe('r1');
    });

    it('should clear active room', () => {
      useChatStore.getState().setActiveRoom('r1');
      useChatStore.getState().setActiveRoom(null);
      expect(useChatStore.getState().activeRoomId).toBeNull();
    });
  });

  describe('messages', () => {
    it('should start with empty messages', () => {
      expect(useChatStore.getState().messages).toEqual({});
    });

    it('should set messages for a room', () => {
      const msgs = [makeMessage('m1', 'r1'), makeMessage('m2', 'r1')];
      useChatStore.getState().setMessages('r1', msgs);
      expect(useChatStore.getState().messages['r1']).toHaveLength(2);
    });

    it('should add a message to a room', () => {
      useChatStore.getState().addMessage('r1', makeMessage('m1', 'r1'));
      useChatStore.getState().addMessage('r1', makeMessage('m2', 'r1'));
      expect(useChatStore.getState().messages['r1']).toHaveLength(2);
    });

    it('should add messages to separate rooms independently', () => {
      useChatStore.getState().addMessage('r1', makeMessage('m1', 'r1'));
      useChatStore.getState().addMessage('r2', makeMessage('m2', 'r2'));
      expect(useChatStore.getState().messages['r1']).toHaveLength(1);
      expect(useChatStore.getState().messages['r2']).toHaveLength(1);
    });

    it('should preserve existing messages when adding new one', () => {
      useChatStore.getState().setMessages('r1', [makeMessage('m1', 'r1')]);
      useChatStore.getState().addMessage('r1', makeMessage('m2', 'r1'));
      expect(useChatStore.getState().messages['r1']).toHaveLength(2);
      expect(useChatStore.getState().messages['r1'][0].id).toBe('m1');
      expect(useChatStore.getState().messages['r1'][1].id).toBe('m2');
    });
  });

  describe('loading', () => {
    it('should start not loading', () => {
      expect(useChatStore.getState().isLoading).toBe(false);
    });

    it('should toggle loading state', () => {
      useChatStore.getState().setLoading(true);
      expect(useChatStore.getState().isLoading).toBe(true);
      useChatStore.getState().setLoading(false);
      expect(useChatStore.getState().isLoading).toBe(false);
    });
  });
});
