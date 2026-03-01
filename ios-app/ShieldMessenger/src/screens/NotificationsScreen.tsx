import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

const NotificationsScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [messageNotif, setMessageNotif] = useState(true);
  const [callNotif, setCallNotif] = useState(true);
  const [groupNotif, setGroupNotif] = useState(true);
  const [walletNotif, setWalletNotif] = useState(true);
  const [previewContent, setPreviewContent] = useState(false);
  const [showSender, setShowSender] = useState(true);

  const ToggleRow = ({label, desc, value, onToggle}: {label: string; desc?: string; value: boolean; onToggle: () => void}) => (
    <TouchableOpacity style={styles.optionRow} onPress={onToggle}>
      <View style={styles.optionInfo}>
        <Text style={styles.optionLabel}>{label}</Text>
        {desc && <Text style={styles.optionDesc}>{desc}</Text>}
      </View>
      <View style={[styles.toggle, value && styles.toggleOn]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('notifications')}</Text>
        <View style={{width: 60}} />
      </View>

      <Text style={styles.sectionTitle}>{t('notification_types')}</Text>
      <ToggleRow label={t('messages')} desc={t('new_message_notif')} value={messageNotif} onToggle={() => setMessageNotif(!messageNotif)} />
      <ToggleRow label={t('calls')} desc={t('incoming_call_alerts')} value={callNotif} onToggle={() => setCallNotif(!callNotif)} />
      <ToggleRow label={t('groups')} desc={t('group_message_notif')} value={groupNotif} onToggle={() => setGroupNotif(!groupNotif)} />
      <ToggleRow label={t('wallet')} desc={t('transaction_notif')} value={walletNotif} onToggle={() => setWalletNotif(!walletNotif)} />

      <Text style={styles.sectionTitle}>{t('privacy')}</Text>
      <ToggleRow label={t('show_content_preview')} desc={t('show_content_preview_desc')} value={previewContent} onToggle={() => setPreviewContent(!previewContent)} />
      <ToggleRow label={t('show_sender_name')} desc={t('show_sender_desc')} value={showSender} onToggle={() => setShowSender(!showSender)} />

      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          🔐 {t('notifications_local_only')}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  sectionTitle: {color: Colors.textSecondary, fontSize: FontSize.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm},
  optionRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider},
  optionInfo: {flex: 1},
  optionLabel: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '500'},
  optionDesc: {color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2},
  toggle: {width: 50, height: 28, borderRadius: 14, backgroundColor: Colors.border, justifyContent: 'center', paddingHorizontal: 2},
  toggleOn: {backgroundColor: Colors.primary},
  toggleThumb: {width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.textPrimary},
  toggleThumbOn: {alignSelf: 'flex-end'},
  infoCard: {margin: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg},
  infoText: {color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20},
});

export default NotificationsScreen;
