import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';

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
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{width: 60}} />
      </View>

      <Text style={styles.sectionTitle}>Notification Types</Text>
      <ToggleRow label="Messages" desc="New message notifications" value={messageNotif} onToggle={() => setMessageNotif(!messageNotif)} />
      <ToggleRow label="Calls" desc="Incoming call alerts" value={callNotif} onToggle={() => setCallNotif(!callNotif)} />
      <ToggleRow label="Groups" desc="Group message notifications" value={groupNotif} onToggle={() => setGroupNotif(!groupNotif)} />
      <ToggleRow label="Wallet" desc="Transaction notifications" value={walletNotif} onToggle={() => setWalletNotif(!walletNotif)} />

      <Text style={styles.sectionTitle}>Privacy</Text>
      <ToggleRow label="Show Content Preview" desc="Display message text in notifications (less private)" value={previewContent} onToggle={() => setPreviewContent(!previewContent)} />
      <ToggleRow label="Show Sender Name" desc="Display who sent the message" value={showSender} onToggle={() => setShowSender(!showSender)} />

      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          🔐 Notifications are processed locally. No notification metadata is sent to Apple or Google servers.
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
