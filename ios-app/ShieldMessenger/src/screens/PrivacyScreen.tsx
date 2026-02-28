import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView} from 'react-native';
import {Colors, Spacing, FontSize} from '../theme/colors';

const PrivacyScreen: React.FC<{navigation: any}> = ({navigation}) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.content}>
        <Text style={styles.heading}>Shield Messenger Privacy Policy</Text>
        <Text style={styles.date}>Last updated: January 2025</Text>

        <Text style={styles.sectionHead}>1. Data Collection</Text>
        <Text style={styles.body}>Shield Messenger collects NO user data. We do not have access to your messages, contacts, keys, or metadata. All data is encrypted locally on your device using SQLCipher with an Argon2id-derived key.</Text>

        <Text style={styles.sectionHead}>2. End-to-End Encryption</Text>
        <Text style={styles.body}>All communications use post-quantum hybrid encryption (ML-KEM-1024 + X25519) with the Double Ratchet protocol. Messages are encrypted before leaving your device and can only be decrypted by the intended recipient.</Text>

        <Text style={styles.sectionHead}>3. Network Privacy</Text>
        <Text style={styles.body}>All network traffic is routed through Tor onion services. We never see your IP address, and messages are transmitted through Tor circuits, providing multiple layers of encryption and anonymity.</Text>

        <Text style={styles.sectionHead}>4. No Metadata</Text>
        <Text style={styles.body}>We do not store any metadata: no timestamps, no sender/recipient records, no message sizes, no contact lists. We literally cannot comply with data requests because we have no data.</Text>

        <Text style={styles.sectionHead}>5. Local Storage</Text>
        <Text style={styles.body}>All data is stored locally in a SQLCipher-encrypted database. Your password never leaves your device. Cryptographic keys are stored in the platform's secure enclave (Keychain/Keystore).</Text>

        <Text style={styles.sectionHead}>6. Open Source</Text>
        <Text style={styles.body}>Shield Messenger is fully open source. You can audit the code, build it yourself, and verify that our privacy claims are accurate. We believe in transparency through code.</Text>

        <Text style={styles.sectionHead}>7. Duress Protection</Text>
        <Text style={styles.body}>The duress PIN feature securely wipes all data when activated. This uses cryptographic erasure to ensure data is permanently destroyed and unrecoverable.</Text>

        <Text style={styles.footer}>Shield Messenger — No tracking · No metadata · No compromises</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  content: {paddingHorizontal: Spacing.lg, paddingBottom: 40},
  heading: {color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '700', marginBottom: Spacing.sm},
  date: {color: Colors.textTertiary, fontSize: FontSize.sm, marginBottom: Spacing.xl},
  sectionHead: {color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '600', marginTop: Spacing.xl, marginBottom: Spacing.sm},
  body: {color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 24},
  footer: {color: Colors.textTertiary, fontSize: FontSize.sm, textAlign: 'center', marginTop: Spacing.xxl, paddingVertical: Spacing.lg},
});

export default PrivacyScreen;
