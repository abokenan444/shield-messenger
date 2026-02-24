import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useChatStore, type Message } from '../lib/store/chatStore';
import { useAuthStore } from '../lib/store/authStore';
import { ShieldIcon } from './icons/ShieldIcon';

interface ChatViewProps {
  roomId: string;
}

export function ChatView({ roomId }: ChatViewProps) {
  const room = useChatStore((s) => s.rooms.find((r) => r.id === roomId));
  const messages = useChatStore((s) => s.messages[roomId] || []);
  const addMessage = useChatStore((s) => s.addMessage);
  const userId = useAuthStore((s) => s.userId);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load mock messages
  useEffect(() => {
    const { setMessages } = useChatStore.getState();
    if (messages.length === 0) {
      const mockMessages: Message[] = [
        {
          id: '1',
          roomId,
          senderId: 'sl_other',
          senderName: room?.name || 'مستخدم',
          content: 'مرحباً! 👋',
          timestamp: Date.now() - 600000,
          type: 'text',
          encrypted: true,
          status: 'read',
        },
        {
          id: '2',
          roomId,
          senderId: userId || 'sl_me',
          senderName: 'أنا',
          content: 'أهلاً! كيف حالك؟',
          timestamp: Date.now() - 300000,
          type: 'text',
          encrypted: true,
          status: 'read',
        },
        {
          id: '3',
          roomId,
          senderId: 'sl_other',
          senderName: room?.name || 'مستخدم',
          content: 'بخير الحمد لله. هل جربت التشفير الجديد؟ 🔐',
          timestamp: Date.now() - 120000,
          type: 'text',
          encrypted: true,
          status: 'delivered',
        },
      ];
      setMessages(roomId, mockMessages);
    }
  }, [roomId, userId, room?.name, messages.length]);

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const message: Message = {
      id: crypto.randomUUID(),
      roomId,
      senderId: userId || 'sl_me',
      senderName: 'أنا',
      content: input.trim(),
      timestamp: Date.now(),
      type: 'text',
      encrypted: true,
      status: 'sending',
    };

    addMessage(roomId, message);
    setInput('');

    // Simulate delivery
    setTimeout(() => {
      const { messages: currentMessages, setMessages } = useChatStore.getState();
      const updated = (currentMessages[roomId] || []).map((m) =>
        m.id === message.id ? { ...m, status: 'sent' as const } : m,
      );
      setMessages(roomId, updated);
    }, 500);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('ar', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!room) return null;

  const isSentByMe = (msg: Message) => msg.senderId === (userId || 'sl_me');

  return (
    <div className="flex-1 flex flex-col bg-dark-950">
      {/* Chat Header */}
      <div className="px-6 py-3 bg-dark-900 border-b border-dark-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="avatar">{room.isDirect ? room.name[0] : '👥'}</div>
          <div>
            <h3 className="font-semibold text-white">{room.name}</h3>
            <div className="flex items-center gap-2">
              {room.encrypted && (
                <span className="encryption-badge">
                  <ShieldIcon className="w-3 h-3" />
                  مشفّر
                </span>
              )}
              {!room.isDirect && (
                <span className="text-xs text-dark-500">
                  {room.members.length} أعضاء
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-dark-800 rounded-lg transition" title="مكالمة صوتية">
            📞
          </button>
          <button className="p-2 hover:bg-dark-800 rounded-lg transition" title="مكالمة مرئية">
            📹
          </button>
          <button className="p-2 hover:bg-dark-800 rounded-lg transition" title="المزيد">
            ⋮
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {/* Encryption Notice */}
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-900/20 rounded-full text-xs text-primary-400">
            <ShieldIcon className="w-4 h-4" />
            <span>الرسائل مشفرة تشفيراً تاماً بين الطرفين (E2EE)</span>
          </div>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${isSentByMe(msg) ? 'justify-start' : 'justify-end'}`}
          >
            <div className={isSentByMe(msg) ? 'message-bubble-sent' : 'message-bubble-received'}>
              {!room.isDirect && !isSentByMe(msg) && (
                <p className="text-xs text-primary-300 mb-1">{msg.senderName}</p>
              )}
              <p className="leading-relaxed">{msg.content}</p>
              <div className={`flex items-center gap-1 mt-1 ${isSentByMe(msg) ? 'justify-start' : 'justify-end'}`}>
                <span className="text-[10px] opacity-60">{formatTime(msg.timestamp)}</span>
                {isSentByMe(msg) && (
                  <span className="text-[10px]">
                    {msg.status === 'sending' ? '⏳' : msg.status === 'sent' ? '✓' : msg.status === 'delivered' ? '✓✓' : '✓✓'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="px-6 py-4 bg-dark-900 border-t border-dark-800">
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <button type="button" className="p-2 hover:bg-dark-800 rounded-lg transition" title="إرفاق ملف">
            📎
          </button>

          <input
            type="text"
            className="input-field flex-1"
            placeholder="اكتب رسالة مشفرة..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <button type="button" className="p-2 hover:bg-dark-800 rounded-lg transition" title="رسالة صوتية">
            🎤
          </button>

          <button
            type="submit"
            className="btn-primary px-4 py-2.5"
            disabled={!input.trim()}
          >
            إرسال
          </button>
        </form>
      </div>
    </div>
  );
}
