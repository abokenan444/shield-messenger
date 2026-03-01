import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

const SecurityModeScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [mode, setMode] = useState<'standard' | 'high' | 'maximum'>('standard');

  const modes = [
    {
      id: 'standard' as const, name: t('standard'), icon: '🟢',
      features: [t('e2ee_messaging'), t('tor_routing'), t('sqlcipher_encryption'), t('auto_lock_5min')],
      desc: t('standard_desc'),
    },
    {
      id: 'high' as const, name: t('high_security'), icon: '🟡',
      features: [t('all_standard_features'), t('disappearing_messages_default'), t('no_link_previews'), t('screenshot_blocking'), t('auto_lock_30sec')],
      desc: t('high_security_desc'),
    },
    {
      id: 'maximum' as const, name: t('maximum_security'), icon: '🔴',
      features: [t('all_high_features'), t('duress_pin_enabled'), t('no_notifications'), t('tor_bridges_required'), t('auto_lock_immediate'), t('no_media_storage')],
      desc: t('maximum_security_desc'),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('security_mode')}</Text>
        <View style={{width: 60}} />
      </View>

      <Text style={styles.subtitle}>{t('choose_security_level')}</Text>

      {modes.map(m => (
        <TouchableOpacity key={m.id} style={[styles.modeCard, mode === m.id && styles.modeCardActive]} onPress={() => setMode(m.id)}>
          <View style={styles.modeHeader}>
            <Text style={styles.modeIcon}>{m.icon}</Text>
            <View style={styles.modeInfo}>
              <Text style={styles.modeName}>{m.name}</Text>
              <Text style={styles.modeDesc}>{m.desc}</Text>
            </View>
            <View style={[styles.radio, mode === m.id && styles.radioSelected]}>
              {mode === m.id && <View style={styles.radioInner} />}
            </View>
          </View>
          <View style={styles.featureList}>
            {m.features.map(f => (
              <Text key={f} style={styles.featureItem}>• {f}</Text>
            ))}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  subtitle: {color: Colors.textSecondary, fontSize: FontSize.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg},
  modeCard: {marginHorizontal: Spacing.lg, marginBottom: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 2, borderColor: 'transparent'},
  modeCardActive: {borderColor: Colors.primary},
  modeHeader: {flexDirection: 'row', alignItems: 'center'},
  modeIcon: {fontSize: 28},
  modeInfo: {flex: 1, marginLeft: Spacing.md},
  modeName: {color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '600'},
  modeDesc: {color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2},
  radio: {width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center'},
  radioSelected: {borderColor: Colors.primary},
  radioInner: {width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary},
  featureList: {marginTop: Spacing.md, paddingLeft: 44},
  featureItem: {color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 22},
});

export default SecurityModeScreen;
