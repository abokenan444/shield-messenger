import { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChatList } from '../components/ChatList';
import { ChatView } from '../components/ChatView';
import { EmptyState } from '../components/EmptyState';
import { useChatStore, type Room } from '../lib/store/chatStore';

export function ChatPage() {
  const { activeRoomId, setActiveRoom, setRooms } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load rooms on mount
  useEffect(() => {
    // Placeholder: In production, this loads from encrypted local storage
    const mockRooms: Room[] = [
      {
        id: 'conv-001',
        name: 'أحمد محمد',
        avatar: null,
        lastMessage: 'مرحباً، كيف حالك؟',
        lastMessageTime: Date.now() - 300000,
        unreadCount: 2,
        encrypted: true,
        isDirect: true,
        members: ['sl_user1', 'sl_ahmed'],
        typing: [],
      },
      {
        id: 'conv-002',
        name: 'فريق التطوير',
        avatar: null,
        lastMessage: 'تم تحديث الكود',
        lastMessageTime: Date.now() - 3600000,
        unreadCount: 0,
        encrypted: true,
        isDirect: false,
        members: ['sl_user1', 'sl_dev1', 'sl_dev2'],
        typing: [],
      },
      {
        id: 'conv-003',
        name: 'سارة أحمد',
        avatar: null,
        lastMessage: 'شكراً لك 🔒',
        lastMessageTime: Date.now() - 86400000,
        unreadCount: 0,
        encrypted: true,
        isDirect: true,
        members: ['sl_user1', 'sl_sarah'],
        typing: [],
      },
    ];

    setRooms(mockRooms);
  }, [setRooms]);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Chat List */}
      <ChatList
        onSelectRoom={(id) => setActiveRoom(id)}
        activeRoomId={activeRoomId}
      />

      {/* Chat View or Empty State */}
      {activeRoomId ? (
        <ChatView roomId={activeRoomId} />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
