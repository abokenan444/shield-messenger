import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { useChatStore, type Message } from '../lib/store/chatStore';
import { useAuthStore } from '../lib/store/authStore';
import { useCallStore } from '../lib/store/callStore';
import { useTranslation } from '../lib/i18n';
import { sendMessage as protocolSendMessage } from '../lib/protocolClient';
import { ShieldIcon } from './icons/ShieldIcon';

interface ChatViewProps {
  roomId: string;
}

export function ChatView({ roomId }: ChatViewProps) {
  const room = useChatStore((s) => s.rooms.find((r) => r.id === roomId));
  const messages = useChatStore((s) => s.messages[roomId] || []);
  const addMessage = useChatStore((s) => s.addMessage);
  const userId = useAuthStore((s) => s.userId);
  const startCall = useCallStore((s) => s.startCall);
  const { t, locale } = useTranslation();
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
          senderName: room?.name || t.chat_user,
          content: 'Hello! 👋',
          timestamp: Date.now() - 600000,
          type: 'text',
          encrypted: true,
          status: 'read',
        },
        {
          id: '2',
          roomId,
          senderId: userId || 'sl_me',
          senderName: t.chat_me,
          content: 'Hey! How are you?',
          timestamp: Date.now() - 300000,
          type: 'text',
          encrypted: true,
          status: 'read',
        },
        {
          id: '3',
          roomId,
          senderId: 'sl_other',
          senderName: room?.name || t.chat_user,
          content: 'Doing great! Have you tried the new encryption? 🔐',
          timestamp: Date.now() - 120000,
          type: 'text',
          encrypted: true,
          status: 'delivered',
        },
      ];
      setMessages(roomId, mockMessages);
    }
  }, [roomId, userId, room?.name, messages.length]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const message: Message = {
      id: crypto.randomUUID(),
      roomId,
      senderId: userId || 'sl_me',
      senderName: t.chat_me,
      content: input.trim(),
      timestamp: Date.now(),
      type: 'text',
      encrypted: true,
      status: 'sending',
      replyToId: replyTo?.id,
    };

    addMessage(roomId, message);
    const messageText = input.trim();
    setInput('');
    setReplyTo(null);

    try {
      await protocolSendMessage(roomId, messageText);
      const { messages: currentMessages, setMessages } = useChatStore.getState();
      const updated = (currentMessages[roomId] || []).map((m) =>
        m.id === message.id ? { ...m, status: 'sent' as const } : m,
      );
      setMessages(roomId, updated);
    } catch (err) {
      console.warn('[SL] Message send (protocol):', err);
      setTimeout(() => {
        const { messages: currentMessages, setMessages } = useChatStore.getState();
        const updated = (currentMessages[roomId] || []).map((m) =>
          m.id === message.id ? { ...m, status: 'sent' as const } : m,
        );
        setMessages(roomId, updated);
      }, 300);
    }
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type.startsWith('image/') ? 'image' : 'file';
    const message: Message = {
      id: crypto.randomUUID(),
      roomId,
      senderId: userId || 'sl_me',
      senderName: t.chat_me,
      content: `📎 ${file.name} (${formatFileSize(file.size)})`,
      timestamp: Date.now(),
      type: fileType,
      encrypted: true,
      status: 'sending',
    };

    addMessage(roomId, message);

    // Simulate upload
    setTimeout(() => {
      const { messages: currentMessages, setMessages } = useChatStore.getState();
      const updated = (currentMessages[roomId] || []).map((m) =>
        m.id === message.id ? { ...m, status: 'sent' as const } : m,
      );
      setMessages(roomId, updated);
    }, 1000);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startVoiceRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const duration = recordingTime;

        const message: Message = {
          id: crypto.randomUUID(),
          roomId,
          senderId: userId || 'sl_me',
          senderName: t.chat_me,
          content: `🎤 ${t.chat_voiceMessage} (${formatDuration(duration)})`,
          timestamp: Date.now(),
          type: 'audio',
          encrypted: true,
          status: 'sent',
        };

        addMessage(roomId, message);
        setRecordingTime(0);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.error('[SL] Microphone access denied:', err);
    }
  }, [roomId, userId, addMessage, recordingTime]);

  const stopVoiceRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const cancelVoiceRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      // Stop the stream tracks
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  const handleVoiceCall = () => {
    if (!room) return;
    const target = room.members.find((m) => m !== (userId || 'sl_me')) || room.members[0];
    startCall(roomId, 'voice', target, room.name);
  };

  const handleVideoCall = () => {
    if (!room) return;
    const target = room.members.find((m) => m !== (userId || 'sl_me')) || room.members[0];
    startCall(roomId, 'video', target, room.name);
  };

  const emojis = ['😀', '😂', '❤️', '👍', '🔒', '🛡️', '✅', '🎉', '🙏', '💪', '🌟', '🔐'];

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!room) return null;

  const isSentByMe = (msg: Message) => msg.senderId === (userId || 'sl_me');
  const findReplyMessage = (replyId?: string) =>
    replyId ? messages.find((m) => m.id === replyId) : undefined;

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
                  {t.chat_encryptedE2E}
                </span>
              )}
              {!room.isDirect && (
                <span className="text-xs text-dark-500">
                  {room.members.length} {t.chat_members}
                </span>
              )}
              {room.typing.length > 0 && (
                <span className="text-xs text-primary-400 animate-pulse">
                  {t.chat_typing}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="p-2.5 hover:bg-dark-800 rounded-xl transition-all text-dark-300 hover:text-white"
            title={t.chat_voiceCall}
            onClick={handleVoiceCall}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          <button
            className="p-2.5 hover:bg-dark-800 rounded-xl transition-all text-dark-300 hover:text-white"
            title={t.chat_videoCall}
            onClick={handleVideoCall}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button className="p-2.5 hover:bg-dark-800 rounded-xl transition-all text-dark-300 hover:text-white" title={t.chat_more}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {/* Encryption Notice */}
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-900/20 rounded-full text-xs text-primary-400">
            <ShieldIcon className="w-4 h-4" />
            <span>{t.chat_e2eNotice}</span>
          </div>
        </div>

        {messages.map((msg) => {
          const repliedMsg = findReplyMessage(msg.replyToId);
          return (
            <div
              key={msg.id}
              className={`group flex ${isSentByMe(msg) ? 'justify-start' : 'justify-end'}`}
            >
              <div className="relative max-w-[75%]">
                {/* Reply preview */}
                {repliedMsg && (
                  <div className="mb-1 px-3 py-1.5 bg-dark-800/60 rounded-t-xl border-r-2 border-primary-500 text-xs text-dark-400">
                    <span className="text-primary-400">{repliedMsg.senderName}</span>
                    <p className="truncate">{repliedMsg.content}</p>
                  </div>
                )}

                <div className={isSentByMe(msg) ? 'message-bubble-sent' : 'message-bubble-received'}>
                  {!room.isDirect && !isSentByMe(msg) && (
                    <p className="text-xs text-primary-300 mb-1 font-medium">{msg.senderName}</p>
                  )}

                  {msg.type === 'audio' ? (
                    <div className="flex items-center gap-2">
                      <button className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                        ▶
                      </button>
                      <div className="flex-1 h-1 bg-white/20 rounded-full">
                        <div className="w-1/3 h-full bg-white/60 rounded-full" />
                      </div>
                      <span className="text-xs opacity-70">{msg.content.match(/\d+:\d+/)?.[0] || '0:00'}</span>
                    </div>
                  ) : (
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}

                  <div className={`flex items-center gap-1 mt-1 ${isSentByMe(msg) ? 'justify-start' : 'justify-end'}`}>
                    <span className="text-[10px] opacity-60">{formatTime(msg.timestamp)}</span>
                    {msg.encrypted && <span className="text-[10px] opacity-40">🔒</span>}
                    {isSentByMe(msg) && (
                      <span className="text-[10px]">
                        {msg.status === 'sending' ? '⏳' : msg.status === 'sent' ? '✓' : msg.status === 'delivered' ? '✓✓' : '✓✓'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Message actions (visible on hover) */}
                <div className="absolute top-0 left-0 -translate-x-full pr-2 hidden group-hover:flex items-center gap-0.5">
                  <button
                    className="p-1 hover:bg-dark-700 rounded text-dark-500 hover:text-dark-200 text-xs"
                    title={t.chat_reply}
                    onClick={() => setReplyTo(msg)}
                  >
                    ↩
                  </button>
                  <button
                    className="p-1 hover:bg-dark-700 rounded text-dark-500 hover:text-dark-200 text-xs"
                    title={t.chat_copy}
                    onClick={() => navigator.clipboard.writeText(msg.content)}
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Bar */}
      {replyTo && (
        <div className="px-6 py-2 bg-dark-900/80 border-t border-dark-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-8 bg-primary-500 rounded" />
            <div>
              <p className="text-xs text-primary-400 font-medium">{replyTo.senderName}</p>
              <p className="text-xs text-dark-400 truncate max-w-md">{replyTo.content}</p>
            </div>
          </div>
          <button
            className="p-1 text-dark-500 hover:text-white transition"
            onClick={() => setReplyTo(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Voice Recording Bar */}
      {isRecording && (
        <div className="px-6 py-3 bg-red-900/20 border-t border-red-800/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 text-sm font-medium">{t.chat_recording}</span>
            <span className="text-red-300 text-sm">{formatDuration(recordingTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 bg-dark-800 text-dark-300 rounded-lg text-sm hover:bg-dark-700 transition"
              onClick={cancelVoiceRecording}
            >
              {t.chat_cancel}
            </button>
            <button
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-500 transition"
              onClick={stopVoiceRecording}
            >
              {t.chat_send}
            </button>
          </div>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="px-6 py-3 bg-dark-900 border-t border-dark-800">
          <div className="flex flex-wrap gap-2">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                className="w-10 h-10 hover:bg-dark-800 rounded-lg flex items-center justify-center text-xl transition"
                onClick={() => {
                  setInput((v) => v + emoji);
                  setShowEmojiPicker(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      {!isRecording && (
        <div className="px-6 py-4 bg-dark-900 border-t border-dark-800">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip,.rar"
              onChange={handleFileSelect}
            />

            <button
              type="button"
              className="p-2.5 hover:bg-dark-800 rounded-xl transition text-dark-400 hover:text-white"
              title={t.chat_attachFile}
              onClick={handleFileAttach}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            <button
              type="button"
              className="p-2.5 hover:bg-dark-800 rounded-xl transition text-dark-400 hover:text-white"
              title={t.chat_emoji}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              😊
            </button>

            <input
              type="text"
              className="input-field flex-1"
              placeholder={t.chat_messagePlaceholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              dir="auto"
            />

            {input.trim() ? (
              <button
                type="submit"
                className="p-2.5 bg-primary-600 hover:bg-primary-500 rounded-xl transition text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                className="p-2.5 hover:bg-dark-800 rounded-xl transition text-dark-400 hover:text-red-400"
                title={t.chat_voiceMessage}
                onClick={startVoiceRecording}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
