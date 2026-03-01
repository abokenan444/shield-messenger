import { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChatList } from '../components/ChatList';
import { ChatView } from '../components/ChatView';
import { EmptyState } from '../components/EmptyState';
import { useChatStore } from '../lib/store/chatStore';
import { initCore } from '../lib/protocolClient';

export function ChatPage() {
  const { activeRoomId, setActiveRoom } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Initialize WASM core on mount
  useEffect(() => {
    initCore().catch((e) => console.error('[SM] WASM init failed:', e));
  }, []);

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
