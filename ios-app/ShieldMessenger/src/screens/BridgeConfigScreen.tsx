import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, ScrollView} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

const BridgeConfigScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [useBridges, setUseBridges] = useState(false);
  const [bridgeType, setBridgeType] = useState<'obfs4' | 'meek' | 'snowflake' | 'custom'>('obfs4');
  const [customBridge, setCustomBridge] = useState('');

  const bridgeTypes = [
    {id: 'obfs4' as const, name: 'obfs4', desc: t('obfs4_desc')},
    {id: 'meek' as const, name: 'meek-azure', desc: t('meek_desc')},
    {id: 'snowflake' as const, name: 'Snowflake', desc: t('snowflake_desc')},
    {id: 'custom' as const, name: t('custom_bridge'), desc: t('custom_bridge_desc')},
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('bridges')}</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.section}>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>{t('use_bridges')}</Text>
            <Text style={styles.toggleDesc}>{t('use_bridges_desc')}</Text>
          </View>
          <Switch value={useBridges} onValueChange={setUseBridges} trackColor={{false: Colors.border, true: Colors.primary}} thumbColor={Colors.textPrimary} />
        </View>
      </View>

      {useBridges && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('bridge_type')}</Text>
            {bridgeTypes.map(bt => (
              <TouchableOpacity key={bt.id} style={styles.typeRow} onPress={() => setBridgeType(bt.id)}>
                <View style={styles.typeInfo}>
                  <Text style={styles.typeName}>{bt.name}</Text>
                  <Text style={styles.typeDesc}>{bt.desc}</Text>
                </View>
                <View style={[styles.radio, bridgeType === bt.id && styles.radioSelected]}>
                  {bridgeType === bt.id && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {bridgeType === 'custom' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('custom_bridge_address')}</Text>
              <TextInput
                style={styles.bridgeInput}
                placeholder="obfs4 IP:PORT FINGERPRINT cert=... iat-mode=..."
                placeholderTextColor={Colors.textTertiary}
                value={customBridge}
                onChangeText={setCustomBridge}
                multiline
                numberOfLines={3}
                autoCapitalize="none"
              />
            </View>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>ℹ️ {t('about_bridges')}</Text>
            <Text style={styles.infoText}>
              {t('about_bridges_desc')}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  section: {borderBottomWidth: 1, borderBottomColor: Colors.divider, paddingVertical: Spacing.md},
  sectionTitle: {color: Colors.textSecondary, fontSize: FontSize.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm},
  toggleRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm},
  toggleLabel: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '500'},
  toggleDesc: {color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2},
  typeRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md},
  typeInfo: {flex: 1},
  typeName: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '500'},
  typeDesc: {color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2},
  radio: {width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center'},
  radioSelected: {borderColor: Colors.primary},
  radioInner: {width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary},
  bridgeInput: {marginHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, color: Colors.textPrimary, fontSize: FontSize.sm, fontFamily: 'monospace', minHeight: 80, textAlignVertical: 'top'},
  infoCard: {margin: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg},
  infoTitle: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600', marginBottom: Spacing.sm},
  infoText: {color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20},
});

export default BridgeConfigScreen;
