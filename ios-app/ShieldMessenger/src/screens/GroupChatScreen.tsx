import React, {useState, useRef} from 'react';
import {View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

interface GroupMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isOwn: boolean;
}

const DEMO_MESSAGES: GroupMessage[] = [
  {id: '1', senderId: 'u1', senderName: 'Khalid', text: 'The new encryption protocol is ready for review', timestamp: Date.now() - 300000, isOwn: false},
  {id: '2', senderId: 'me', senderName: 'You', text: 'I\'ll run the fuzz tests after lunch', timestamp: Date.now() - 240000, isOwn: true},
  {id: '3', senderId: 'u2', senderName: 'Sara', text: 'Sender Keys are initialized for this group 🔐', timestamp: Date.now() - 180000, isOwn: false},
  {id: '4', senderId: 'u1', senderName: 'Khalid', text: 'Perfect. CRDT sync is working well too', timestamp: Date.now() - 60000, isOwn: false},
];

const GroupChatScreen: React.FC<{route: any; navigation: any}> = ({route, navigation}) => {
  const {groupId, groupName, memberCount} = route.params || {groupId: '1', groupName: 'Dev Team', memberCount: 5};
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    const newMsg: GroupMessage = {
      id: Date.now().toString(),
      senderId: 'me',
      senderName: 'You',
      text: inputText.trim(),
      timestamp: Date.now(),
      isOwn: true,
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerInfo} onPress={() => navigation.navigate('GroupProfile', {groupId, groupName})}>
          <Text style={styles.headerTitle}>{groupName}</Text>
          <Text style={styles.headerSubtitle}>{t('members_e2ee').replace('%s', String(memberCount))}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('VoiceCall', {contactId: groupId, contactName: groupName})}>
          <Text style={styles.callIcon}>📞</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        renderItem={({item}) => (
          <View style={[styles.messageBubble, item.isOwn ? styles.ownBubble : styles.otherBubble]}>
            {!item.isOwn && <Text style={styles.senderName}>{item.senderName}</Text>}
            <Text style={styles.messageText}>{item.text}</Text>
            <Text style={styles.messageTime}>{formatTime(item.timestamp)}</Text>
          </View>
        )}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={t('message_group')}
          placeholderTextColor={Colors.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={styles.sendIcon}>▲</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 60, paddingBottom: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.divider},
  backBtn: {padding: Spacing.sm},
  backText: {color: Colors.primary, fontSize: 32, fontWeight: '300'},
  headerInfo: {flex: 1, marginLeft: Spacing.sm},
  headerTitle: {color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '600'},
  headerSubtitle: {color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2},
  callIcon: {fontSize: 22, padding: Spacing.sm},
  messageList: {padding: Spacing.md, paddingBottom: Spacing.xl},
  messageBubble: {maxWidth: '80%', padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm},
  ownBubble: {alignSelf: 'flex-end', backgroundColor: Colors.bubbleOutgoing},
  otherBubble: {alignSelf: 'flex-start', backgroundColor: Colors.bubbleIncoming},
  senderName: {color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600', marginBottom: 4},
  messageText: {color: Colors.textPrimary, fontSize: FontSize.md, lineHeight: 22},
  messageTime: {color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 4, alignSelf: 'flex-end'},
  inputBar: {flexDirection: 'row', alignItems: 'flex-end', padding: Spacing.sm, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.divider},
  input: {flex: 1, backgroundColor: Colors.surfaceVariant, borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.textPrimary, fontSize: FontSize.md, maxHeight: 100},
  sendBtn: {width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.sm},
  sendIcon: {color: Colors.textOnPrimary, fontSize: 16, fontWeight: '700'},
});

export default GroupChatScreen;
