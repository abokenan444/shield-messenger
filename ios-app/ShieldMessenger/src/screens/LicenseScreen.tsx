import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';

const licenses = [
  {name: 'ml-kem', version: '0.2.1', license: 'MIT/Apache-2.0', desc: 'Post-quantum key encapsulation mechanism'},
  {name: 'x25519-dalek', version: '2.0', license: 'BSD-3-Clause', desc: 'X25519 Diffie-Hellman key exchange'},
  {name: 'ed25519-dalek', version: '2.1', license: 'BSD-3-Clause', desc: 'Ed25519 digital signatures'},
  {name: 'aes-gcm', version: '0.10', license: 'MIT/Apache-2.0', desc: 'AES-256-GCM authenticated encryption'},
  {name: 'chacha20poly1305', version: '0.10', license: 'MIT/Apache-2.0', desc: 'ChaCha20-Poly1305 AEAD'},
  {name: 'argon2', version: '0.5', license: 'MIT/Apache-2.0', desc: 'Argon2id password hashing'},
  {name: 'arti-client', version: '0.23', license: 'MIT/Apache-2.0', desc: 'Tor client implementation in Rust'},
  {name: 'sqlcipher', version: '4.6.0', license: 'BSD-3-Clause', desc: 'Encrypted SQLite database'},
  {name: 'react-native', version: '0.84.0', license: 'MIT', desc: 'Cross-platform mobile framework'},
  {name: 'zustand', version: '5.0', license: 'MIT', desc: 'State management for React'},
  {name: 'monero-wallet', version: '0.1.0', license: 'MIT', desc: 'Monero cryptocurrency wallet'},
  {name: 'tokio', version: '1.44', license: 'MIT', desc: 'Async runtime for Rust'},
];

const LicenseScreen: React.FC<{navigation: any}> = ({navigation}) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Licenses</Text>
        <View style={{width: 60}} />
      </View>

      <Text style={styles.subtitle}>Shield Messenger uses the following open source components</Text>

      {licenses.map(lib => (
        <View key={lib.name} style={styles.licenseCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.libName}>{lib.name}</Text>
            <Text style={styles.libVersion}>v{lib.version}</Text>
          </View>
          <Text style={styles.libDesc}>{lib.desc}</Text>
          <Text style={styles.libLicense}>{lib.license}</Text>
        </View>
      ))}

      <Text style={styles.footer}>
        Shield Messenger itself is licensed under GPL-3.0.{'\n'}
        Full license texts available in the source repository.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  subtitle: {color: Colors.textSecondary, fontSize: FontSize.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg},
  licenseCard: {backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, borderRadius: BorderRadius.md, padding: Spacing.md},
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  libName: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600'},
  libVersion: {color: Colors.textTertiary, fontSize: FontSize.xs, fontFamily: 'monospace'},
  libDesc: {color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 4},
  libLicense: {color: Colors.primary, fontSize: FontSize.xs, fontWeight: '500', marginTop: 4},
  footer: {color: Colors.textTertiary, fontSize: FontSize.xs, textAlign: 'center', paddingVertical: Spacing.xxl, lineHeight: 20},
});

export default LicenseScreen;
