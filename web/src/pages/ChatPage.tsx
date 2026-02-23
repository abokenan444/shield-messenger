import { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChatList } from '../components/ChatList';
import { ChatView } from '../components/ChatView';
import { EmptyState } from '../components/EmptyState';
import { useChatStore } from '../lib/store/chatStore';

export function ChatPage() {
  const { activeRoomId, setActiveRoom, setRooms } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load rooms on mount
  useEffect(() => {
    // Rooms will be populated from the server API or P2P connections
    // For now, start with empty state — users must add contacts first
    if (useChatStore.getState().rooms.length === 0) {
      setRooms([]);
    }
  }, [setRooms]);

  const handleBack = () => setActiveRoom(null);

  return (
    <div className="h-screen flex overflow-hidden pb-14 md:pb-0">
      {/* Sidebar Navigation — desktop only */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Mobile: show ChatList when no room is active, ChatView when a room is active */}
      {/* Desktop: show both side by side */}
      <div className={`${activeRoomId ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-shrink-0`}>
        <ChatList
          onSelectRoom={(id) => setActiveRoom(id)}
          activeRoomId={activeRoomId}
        />
      </div>

      <div className={`${activeRoomId ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        {activeRoomId ? (
          <ChatView roomId={activeRoomId} onBack={handleBack} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
