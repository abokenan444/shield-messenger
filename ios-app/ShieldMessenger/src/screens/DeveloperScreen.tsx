import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

const DeveloperScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [debugLog, setDebugLog] = useState(false);
  const [mockRust, setMockRust] = useState(true);
  const [torDebug, setTorDebug] = useState(false);

  const info = {
    appVersion: '1.0.0-beta',
    buildNumber: '42',
    rustCoreVersion: '0.1.0',
    reactNative: '0.84.0',
    mlKemVersion: '0.2.1',
    sqlcipherVersion: '4.6.0',
    torVersion: '0.4.8.12',
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('developer')}</Text>
        <View style={{width: 60}} />
      </View>

      <Text style={styles.sectionTitle}>{t('build_info')}</Text>
      {Object.entries(info).map(([key, val]) => (
        <View key={key} style={styles.infoRow}>
          <Text style={styles.infoLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
          <Text style={styles.infoValue}>{val}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>{t('debug_options')}</Text>
      <View style={styles.toggleRow}>
        <View>
          <Text style={styles.toggleLabel}>{t('debug_logging')}</Text>
          <Text style={styles.toggleDesc}>{t('debug_logging_desc')}</Text>
        </View>
        <Switch value={debugLog} onValueChange={setDebugLog} trackColor={{false: Colors.border, true: Colors.primary}} thumbColor={Colors.textPrimary} />
      </View>
      <View style={styles.toggleRow}>
        <View>
          <Text style={styles.toggleLabel}>{t('mock_rust_bridge')}</Text>
          <Text style={styles.toggleDesc}>{t('mock_rust_desc')}</Text>
        </View>
        <Switch value={mockRust} onValueChange={setMockRust} trackColor={{false: Colors.border, true: Colors.primary}} thumbColor={Colors.textPrimary} />
      </View>
      <View style={styles.toggleRow}>
        <View>
          <Text style={styles.toggleLabel}>{t('tor_debug_mode')}</Text>
          <Text style={styles.toggleDesc}>{t('tor_debug_desc')}</Text>
        </View>
        <Switch value={torDebug} onValueChange={setTorDebug} trackColor={{false: Colors.border, true: Colors.primary}} thumbColor={Colors.textPrimary} />
      </View>

      <Text style={styles.sectionTitle}>{t('actions')}</Text>
      <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('SystemLog')}>
        <Text style={styles.actionText}>{t('view_system_logs')}</Text>
        <Text style={styles.actionArrow}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionRow}>
        <Text style={styles.actionText}>{t('export_database')}</Text>
        <Text style={styles.actionArrow}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionRow}>
        <Text style={styles.actionText}>{t('run_crypto_self_test')}</Text>
        <Text style={styles.actionArrow}>›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  sectionTitle: {color: Colors.textSecondary, fontSize: FontSize.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm},
  infoRow: {flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider},
  infoLabel: {color: Colors.textSecondary, fontSize: FontSize.sm, textTransform: 'capitalize'},
  infoValue: {color: Colors.textPrimary, fontSize: FontSize.sm, fontFamily: 'monospace'},
  toggleRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider},
  toggleLabel: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '500'},
  toggleDesc: {color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2},
  actionRow: {flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider},
  actionText: {color: Colors.primary, fontSize: FontSize.md, fontWeight: '500'},
  actionArrow: {color: Colors.textTertiary, fontSize: FontSize.lg},
});

export default DeveloperScreen;
