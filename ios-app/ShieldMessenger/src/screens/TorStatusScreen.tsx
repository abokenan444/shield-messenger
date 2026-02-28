import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';

const TorStatusScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');

  // Demo data
  const torInfo = {
    circuitCount: 3,
    guardNode: '🇩🇪 Germany',
    middleNode: '🇨🇭 Switzerland',
    exitNode: '🇮🇸 Iceland',
    bandwidth: '1.2 MB/s',
    uptime: '4h 23m',
    hiddenService: 'shield7x3f...onion',
    version: '0.4.8.12',
    bootstrapProgress: 100,
  };

  const statusColor = status === 'connected' ? Colors.torConnected : status === 'connecting' ? Colors.torConnecting : Colors.torDisconnected;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tor Network</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.statusCard}>
        <View style={[styles.statusDot, {backgroundColor: statusColor}]} />
        <Text style={[styles.statusText, {color: statusColor}]}>
          {status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </Text>
        <Text style={styles.uptime}>Uptime: {torInfo.uptime}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Circuit</Text>
        <View style={styles.circuitPath}>
          <View style={styles.circuitNode}>
            <Text style={styles.nodeLabel}>Guard</Text>
            <Text style={styles.nodeValue}>{torInfo.guardNode}</Text>
          </View>
          <Text style={styles.circuitArrow}>→</Text>
          <View style={styles.circuitNode}>
            <Text style={styles.nodeLabel}>Middle</Text>
            <Text style={styles.nodeValue}>{torInfo.middleNode}</Text>
          </View>
          <Text style={styles.circuitArrow}>→</Text>
          <View style={styles.circuitNode}>
            <Text style={styles.nodeLabel}>Exit</Text>
            <Text style={styles.nodeValue}>{torInfo.exitNode}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hidden Service</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Address</Text>
          <Text style={styles.infoValue}>{torInfo.hiddenService}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={[styles.infoValue, {color: Colors.success}]}>Published</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Active Circuits</Text>
          <Text style={styles.infoValue}>{torInfo.circuitCount}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Bandwidth</Text>
          <Text style={styles.infoValue}>{torInfo.bandwidth}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tor Version</Text>
          <Text style={styles.infoValue}>{torInfo.version}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Bootstrap</Text>
          <Text style={styles.infoValue}>{torInfo.bootstrapProgress}%</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('BridgeConfig')}>
          <Text style={styles.actionText}>Configure Bridges</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionText}>Request New Circuit</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  statusCard: {alignItems: 'center', paddingVertical: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.divider},
  statusDot: {width: 16, height: 16, borderRadius: 8},
  statusText: {fontSize: FontSize.xl, fontWeight: '700', marginTop: Spacing.sm},
  uptime: {color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: Spacing.xs},
  section: {paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider},
  sectionTitle: {color: Colors.textSecondary, fontSize: FontSize.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm},
  circuitPath: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.md},
  circuitNode: {alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, minWidth: 90},
  nodeLabel: {color: Colors.textTertiary, fontSize: FontSize.xs},
  nodeValue: {color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '500', marginTop: 2},
  circuitArrow: {color: Colors.primary, fontSize: FontSize.xl, marginHorizontal: Spacing.sm},
  infoRow: {flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm},
  infoLabel: {color: Colors.textSecondary, fontSize: FontSize.md},
  infoValue: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '500'},
  actions: {paddingVertical: Spacing.md},
  actionBtn: {flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider},
  actionText: {color: Colors.primary, fontSize: FontSize.md, fontWeight: '500'},
  actionArrow: {color: Colors.textTertiary, fontSize: FontSize.lg},
});

export default TorStatusScreen;
