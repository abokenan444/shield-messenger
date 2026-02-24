import { useState } from 'react';
import { useChatStore } from '../lib/store/chatStore';
import { ShieldIcon } from './icons/ShieldIcon';

interface ChatListProps {
  onSelectRoom: (roomId: string) => void;
  activeRoomId: string | null;
}

export function ChatList({ onSelectRoom, activeRoomId }: ChatListProps) {
  const rooms = useChatStore((s) => s.rooms);
  const [search, setSearch] = useState('');

  const filteredRooms = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  );

  const formatTime = (ts: number | null) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('ar', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-80 bg-dark-950 border-l border-dark-800 flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-dark-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">المحادثات</h2>
          <button className="text-dark-400 hover:text-dark-200 transition text-xl" title="محادثة جديدة">
            ✏️
          </button>
        </div>
        <input
          type="text"
          className="input-field text-sm py-2"
          placeholder="🔍 بحث..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto">
        {filteredRooms.length === 0 ? (
          <div className="p-6 text-center text-dark-500 text-sm">
            لا توجد محادثات
          </div>
        ) : (
          filteredRooms.map((room) => (
            <div
              key={room.id}
              className={`chat-list-item ${room.id === activeRoomId ? 'active' : ''}`}
              onClick={() => onSelectRoom(room.id)}
            >
              {/* Avatar */}
              <div className="avatar">
                {room.isDirect ? room.name[0] : '👥'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white truncate">{room.name}</span>
                  <span className="text-xs text-dark-500 flex-shrink-0">
                    {formatTime(room.lastMessageTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <div className="flex items-center gap-1 min-w-0">
                    {room.encrypted && (
                      <ShieldIcon className="w-3 h-3 text-primary-500 flex-shrink-0" />
                    )}
                    <span className="text-sm text-dark-400 truncate">
                      {room.lastMessage || 'لا توجد رسائل'}
                    </span>
                  </div>
                  {room.unreadCount > 0 && (
                    <span className="badge">{room.unreadCount}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
