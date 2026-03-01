import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

interface AddFriendScreenProps {
  navigation: any;
}

const AddFriendScreen: React.FC<AddFriendScreenProps> = ({navigation}) => {
  const [onionAddress, setOnionAddress] = useState('');
  const [nickname, setNickname] = useState('');
  const [isSending, setIsSending] = useState(false);

  const isValidOnion = (addr: string): boolean => {
    return addr.endsWith('.onion') && addr.length >= 62;
  };

  const sendFriendRequest = async () => {
    if (!isValidOnion(onionAddress)) {
      Alert.alert(t('invalid_address'), t('invalid_onion_address'));
      return;
    }

    setIsSending(true);
    try {
      // TODO: Send via Rust core → Tor → Friend Request Server
      await new Promise<void>(resolve => setTimeout(resolve, 2000));
      Alert.alert(t('request_sent'), t('request_sent_to').replace('%s', nickname || 'contact'), [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error) {
      Alert.alert('Failed', 'Could not send friend request. Check Tor connection.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('add_friend')}</Text>
        <View style={{width: 50}} />
      </View>

      {/* QR Scanner Option */}
      <TouchableOpacity
        style={styles.qrOption}
        onPress={() => navigation.navigate('QRScanner')}
        accessibilityLabel="Scan QR code to add friend">
        <Text style={styles.qrIcon}>📷</Text>
        <View style={styles.qrContent}>
          <Text style={styles.qrTitle}>{t('scan_qr')}</Text>
          <Text style={styles.qrSubtitle}>
            {t('scan_friend_qr')}
          </Text>
        </View>
        <Text style={styles.chevron}>{'›'}</Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{t('or_enter_manually')}</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Manual Entry */}
      <View style={styles.formSection}>
        <Text style={styles.label}>{t('onion_address')}</Text>
        <TextInput
          style={styles.input}
          placeholder="abc123...xyz.onion"
          placeholderTextColor={Colors.textTertiary}
          value={onionAddress}
          onChangeText={setOnionAddress}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Enter onion address"
        />

        <Text style={styles.label}>{t('nickname_optional')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('remember_them')}
          placeholderTextColor={Colors.textTertiary}
          value={nickname}
          onChangeText={setNickname}
          accessibilityLabel="Enter nickname"
        />

        <TouchableOpacity
          style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
          onPress={sendFriendRequest}
          disabled={isSending}
          accessibilityLabel="Send friend request">
          <Text style={styles.sendButtonText}>
            {isSending ? t('sending_via_tor') : t('send_friend_request')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Your Address */}
      <View style={styles.yourAddressSection}>
        <Text style={styles.yourAddressTitle}>{t('your_address')}</Text>
        <Text style={styles.yourAddress}>mock1234567890abcdef.onion</Text>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => navigation.navigate('QRCode')}
          accessibilityLabel="Share your QR code">
          <Text style={styles.shareButtonText}>{t('show_my_qr')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  content: {paddingBottom: Spacing.xxl * 2},
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl + Spacing.lg, paddingBottom: Spacing.md,
  },
  backText: {fontSize: FontSize.lg, color: Colors.primary},
  headerTitle: {fontSize: FontSize.xl, fontWeight: '600', color: Colors.textPrimary},
  qrOption: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.lg, marginTop: Spacing.lg,
    padding: Spacing.lg, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
  },
  qrIcon: {fontSize: 32, marginRight: Spacing.md},
  qrContent: {flex: 1},
  qrTitle: {fontSize: FontSize.lg, fontWeight: '600', color: Colors.textPrimary},
  qrSubtitle: {fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 2},
  chevron: {fontSize: 20, color: Colors.textTertiary},
  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.lg, marginVertical: Spacing.xl,
  },
  dividerLine: {flex: 1, height: 1, backgroundColor: Colors.divider},
  dividerText: {
    marginHorizontal: Spacing.md, fontSize: FontSize.sm, color: Colors.textTertiary,
  },
  formSection: {marginHorizontal: Spacing.lg},
  label: {
    fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary,
    marginBottom: Spacing.sm, marginTop: Spacing.md,
  },
  input: {
    height: 48, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg, color: Colors.textPrimary, fontSize: FontSize.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  sendButton: {
    height: 52, backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xl,
  },
  sendButtonDisabled: {backgroundColor: Colors.surfaceVariant},
  sendButtonText: {fontSize: FontSize.lg, fontWeight: '600', color: Colors.textOnPrimary},
  yourAddressSection: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.xxl,
    padding: Spacing.lg, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, alignItems: 'center',
  },
  yourAddressTitle: {fontSize: FontSize.sm, color: Colors.textTertiary, marginBottom: Spacing.sm},
  yourAddress: {
    fontSize: FontSize.md, color: Colors.textPrimary,
    fontFamily: 'monospace', marginBottom: Spacing.md,
  },
  shareButton: {
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceVariant, borderRadius: BorderRadius.full,
  },
  shareButtonText: {fontSize: FontSize.md, color: Colors.primary, fontWeight: '500'},
});

export default AddFriendScreen;
