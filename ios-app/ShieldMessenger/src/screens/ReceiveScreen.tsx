import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Share} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';

const ReceiveScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const address = '47sghzufGhJJDv9WkreiS4ENoGD3tNN36d2dKJzVhEWFPT...'; // Demo Monero address

  const handleShare = async () => {
    await Share.share({message: `My Monero address:\n${address}`});
  };

  const handleCopy = () => {
    // TODO: Clipboard.setString(address)
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Receive XMR</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.content}>
        <View style={styles.qrContainer}>
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrText}>QR</Text>
          </View>
        </View>

        <Text style={styles.addressLabel}>Your Monero Address</Text>
        <View style={styles.addressCard}>
          <Text style={styles.addressText}>{address}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
            <Text style={styles.copyBtnText}>📋 Copy Address</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>📤 Share</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            🔐 Monero uses stealth addresses — each transaction creates a unique one-time address, preserving your privacy.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  content: {flex: 1, alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl},
  qrContainer: {backgroundColor: '#FFFFFF', borderRadius: BorderRadius.lg, padding: Spacing.xl},
  qrPlaceholder: {width: 180, height: 180, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md},
  qrText: {fontSize: 40, color: '#333'},
  addressLabel: {color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: Spacing.xl, marginBottom: Spacing.sm},
  addressCard: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, width: '100%'},
  addressText: {color: Colors.textPrimary, fontSize: FontSize.sm, fontFamily: 'monospace', textAlign: 'center'},
  actions: {flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl},
  copyBtn: {flex: 1, backgroundColor: Colors.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center'},
  copyBtnText: {color: Colors.textOnPrimary, fontSize: FontSize.md, fontWeight: '600'},
  shareBtn: {flex: 1, backgroundColor: Colors.surface, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center'},
  shareBtnText: {color: Colors.primary, fontSize: FontSize.md, fontWeight: '600'},
  infoCard: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, width: '100%', marginTop: Spacing.xl},
  infoText: {color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20},
});

export default ReceiveScreen;
