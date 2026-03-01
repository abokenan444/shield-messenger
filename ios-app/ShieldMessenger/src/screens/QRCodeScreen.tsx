import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Share} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

const QRCodeScreen: React.FC<{navigation: any}> = ({navigation}) => {
  // Demo fingerprint - in production this comes from Rust core
  const fingerprint = 'SM-VERIFY:1:ed25519:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
  const displayFingerprint = '05 42 68 13 97 24\n56 81 03 69 45 72\n38 14 92 57 60 23\n84 16 73 49 05 38';

  const handleShare = async () => {
    await Share.share({message: `Verify my Shield Messenger identity:\n${fingerprint}`});
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('your_qr_code')}</Text>
        <TouchableOpacity onPress={handleShare}>
          <Text style={styles.shareBtn}>{t('share')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.instruction}>{t('let_contact_scan')}</Text>

        <View style={styles.qrContainer}>
          {/* QR code rendered by react-native-qrcode-svg in production */}
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrPlaceholderText}>QR</Text>
          </View>
          <Text style={styles.protocolLabel}>SM-VERIFY:1</Text>
        </View>

        <View style={styles.fingerprintSection}>
          <Text style={styles.fingerprintTitle}>{t('your_safety_number')}</Text>
          <Text style={styles.fingerprintText}>{displayFingerprint}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('how_verification_works')}</Text>
          <Text style={styles.infoText}>
            1. Meet your contact in person{'\n'}
            2. They scan your QR code (or you scan theirs){'\n'}
            3. Both contacts are upgraded to Trust Level 2{'\n'}
            4. You'll see a verified badge on their profile
          </Text>
        </View>

        <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('QRScanner')}>
          <Text style={styles.scanBtnText}>{t('scan_their_qr')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  closeBtn: {color: Colors.textPrimary, fontSize: FontSize.xl},
  title: {color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '600'},
  shareBtn: {color: Colors.primary, fontSize: FontSize.md, fontWeight: '500'},
  content: {flex: 1, alignItems: 'center', padding: Spacing.lg},
  instruction: {color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', marginBottom: Spacing.xl},
  qrContainer: {alignItems: 'center', padding: Spacing.xl, backgroundColor: '#FFFFFF', borderRadius: BorderRadius.lg, marginBottom: Spacing.xl},
  qrPlaceholder: {width: 200, height: 200, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md},
  qrPlaceholderText: {fontSize: 48, color: '#333'},
  protocolLabel: {color: '#333', fontSize: FontSize.xs, marginTop: Spacing.sm, fontFamily: 'monospace'},
  fingerprintSection: {alignItems: 'center', marginBottom: Spacing.xl},
  fingerprintTitle: {color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.sm},
  fingerprintText: {color: Colors.textPrimary, fontSize: FontSize.md, fontFamily: 'monospace', textAlign: 'center', lineHeight: 24},
  infoCard: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, width: '100%', marginBottom: Spacing.lg},
  infoTitle: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600', marginBottom: Spacing.sm},
  infoText: {color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 22},
  scanBtn: {paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg},
  scanBtnText: {color: Colors.primary, fontSize: FontSize.md, fontWeight: '600'},
});

export default QRCodeScreen;
