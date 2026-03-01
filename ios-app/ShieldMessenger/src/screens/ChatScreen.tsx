import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

interface Message {
  id: string;
  text: string;
  isOutgoing: boolean;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  type: 'text' | 'voice' | 'image' | 'file';
}

interface ChatScreenProps {
  route: any;
  navigation: any;
}

// Demo messages
const DEMO_MESSAGES: Message[] = [
  {id: '1', text: 'Hey, are you there?', isOutgoing: false, timestamp: Date.now() - 300000, status: 'read', type: 'text'},
  {id: '2', text: 'Yes, connected via Tor. All secure.', isOutgoing: true, timestamp: Date.now() - 240000, status: 'read', type: 'text'},
  {id: '3', text: 'The documents are encrypted and ready.', isOutgoing: false, timestamp: Date.now() - 120000, status: 'read', type: 'text'},
  {id: '4', text: 'Great, sending the key now via safety number verification.', isOutgoing: true, timestamp: Date.now() - 60000, status: 'delivered', type: 'text'},
];

const ChatScreen: React.FC<ChatScreenProps> = ({route, navigation}) => {
  const {contactName, contactId} = route.params;
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const formatTime = (ts: number): string => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  };

  const getStatusIcon = (status: Message['status']): string => {
    switch (status) {
      case 'sending': return '◌';
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'read': return '✓✓';
      case 'failed': return '✗';
      default: return '';
    }
  };

  const sendMessage = useCallback(() => {
    if (inputText.trim().length === 0) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isOutgoing: true,
      timestamp: Date.now(),
      status: 'sending',
      type: 'text',
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // TODO: Send via Rust core → Tor → Hidden Service
    // Simulate delivery
    setTimeout(() => {
      setMessages(prev =>
        prev.map(m => (m.id === newMessage.id ? {...m, status: 'sent'} : m)),
      );
    }, 500);

    setTimeout(() => {
      setMessages(prev =>
        prev.map(m => (m.id === newMessage.id ? {...m, status: 'delivered'} : m)),
      );
    }, 2000);
  }, [inputText]);

  const renderMessage = ({item}: {item: Message}) => (
    <View
      style={[
        styles.messageBubble,
        item.isOutgoing ? styles.outgoingBubble : styles.incomingBubble,
      ]}
      accessibilityLabel={`${item.isOutgoing ? 'You' : contactName}: ${item.text}. ${formatTime(item.timestamp)}`}>
      <Text style={styles.messageText}>{item.text}</Text>
      <View style={styles.messageFooter}>
        <Text style={styles.messageTime}>{formatTime(item.timestamp)}</Text>
        {item.isOutgoing && (
          <Text
            style={[
              styles.messageStatus,
              item.status === 'read' && styles.messageStatusRead,
              item.status === 'failed' && styles.messageStatusFailed,
            ]}>
            {getStatusIcon(item.status)}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel={t('go_back')}>
          <Text style={styles.backButtonText}>{'‹'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => navigation.navigate('ContactInfo', {contactId})}
          accessibilityLabel={`View ${contactName}'s info`}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {contactName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.headerName}>{contactName}</Text>
            <Text style={styles.headerStatus}>{t('online_via_tor')}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerAction}
            onPress={() => navigation.navigate('VoiceCall', {contactId, contactName})}
            accessibilityLabel={t('start_voice_call')}>
            <Text style={styles.headerActionText}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerAction}
            accessibilityLabel={t('more_options')}>
            <Text style={styles.headerActionText}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Encryption Banner */}
      <View style={styles.encryptionBanner}>
        <Text style={styles.encryptionText}>
          🔒 {t('encrypted_pq_ratchet')}
        </Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({animated: true})
        }
        inverted={false}
      />

      {/* Typing Indicator */}
      {isTyping && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>{contactName} is typing...</Text>
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity
          style={styles.attachButton}
          accessibilityLabel={t('attach_file')}>
          <Text style={styles.attachButtonText}>+</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder={t('message')}
          placeholderTextColor={Colors.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={4096}
          accessibilityLabel={t('message_placeholder')}
        />

        {inputText.trim().length > 0 ? (
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
            accessibilityLabel={t('send_message')}>
            <Text style={styles.sendButtonText}>➤</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.voiceButton}
            accessibilityLabel={t('record_voice')}>
            <Text style={styles.voiceButtonText}>🎤</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: Colors.primary,
    fontWeight: '300',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  headerAvatarText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.primary,
  },
  headerName: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  headerStatus: {
    fontSize: FontSize.xs,
    color: Colors.success,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerAction: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionText: {
    fontSize: 18,
  },
  encryptionBanner: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  encryptionText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  messageList: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  outgoingBubble: {
    backgroundColor: Colors.bubbleOutgoing,
    alignSelf: 'flex-end',
    borderBottomRightRadius: BorderRadius.sm,
  },
  incomingBubble: {
    backgroundColor: Colors.bubbleIncoming,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: BorderRadius.sm,
  },
  messageText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  messageTime: {
    fontSize: FontSize.xs,
    color: Colors.bubbleTimestamp,
  },
  messageStatus: {
    fontSize: FontSize.xs,
    color: Colors.bubbleTimestamp,
    marginLeft: Spacing.xs,
  },
  messageStatusRead: {
    color: Colors.primary,
  },
  messageStatusFailed: {
    color: Colors.error,
  },
  typingIndicator: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  typingText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  attachButtonText: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: '600',
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  sendButtonText: {
    fontSize: 16,
    color: Colors.textOnPrimary,
  },
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  voiceButtonText: {
    fontSize: 16,
  },
});

export default ChatScreen;
