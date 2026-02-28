import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';

const QRScannerScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [scanning, setScanning] = useState(true);

  // Note: Actual camera/QR scanning requires react-native-camera or expo-camera
  // This is a UI placeholder that will be connected to the native camera module

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scan QR Code</Text>
        <View style={{width: 40}} />
      </View>

      <View style={styles.cameraPlaceholder}>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <Text style={styles.scanText}>{scanning ? 'Point camera at QR code' : 'Processing...'}</Text>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>Verify Contact Identity</Text>
        <Text style={styles.instructionText}>
          Scan your contact's QR code to verify their fingerprint. This ensures you're communicating with the right person using the SM-VERIFY:1 protocol.
        </Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🔐</Text>
          <Text style={styles.infoText}>Verified contacts are elevated to Trust Level 2</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📱</Text>
          <Text style={styles.infoText}>Both devices must be present for verification</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.showMyQR} onPress={() => navigation.navigate('QRCode')}>
        <Text style={styles.showMyQRText}>Show My QR Code</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  closeBtn: {color: Colors.textPrimary, fontSize: FontSize.xl},
  title: {color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '600'},
  cameraPlaceholder: {height: 300, marginHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center'},
  scanFrame: {width: 200, height: 200, position: 'relative'},
  corner: {position: 'absolute', width: 30, height: 30, borderColor: Colors.primary},
  topLeft: {top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3},
  topRight: {top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3},
  bottomLeft: {bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3},
  bottomRight: {bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3},
  scanText: {color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: Spacing.lg},
  instructions: {padding: Spacing.lg, marginTop: Spacing.lg},
  instructionTitle: {color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '600', marginBottom: Spacing.sm},
  instructionText: {color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 22},
  infoRow: {flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md},
  infoIcon: {fontSize: 16, marginRight: Spacing.sm},
  infoText: {color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1},
  showMyQR: {marginHorizontal: Spacing.lg, marginTop: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, alignItems: 'center'},
  showMyQRText: {color: Colors.primary, fontSize: FontSize.md, fontWeight: '600'},
});

export default QRScannerScreen;
