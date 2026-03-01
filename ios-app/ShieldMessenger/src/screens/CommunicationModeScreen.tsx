import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

const CommunicationModeScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [mode, setMode] = useState<'tor' | 'direct' | 'hybrid'>('tor');

  const options = [
    {
      id: 'tor' as const, name: t('tor_only'), icon: '🧅',
      desc: t('tor_only_desc'),
      pros: [t('maximum_anonymity'), t('ip_hidden'), t('censorship_resistant')],
      cons: [t('higher_latency'), t('requires_tor_bootstrap')],
    },
    {
      id: 'direct' as const, name: t('direct_p2p'), icon: '🔗',
      desc: t('direct_p2p_desc'),
      pros: [t('low_latency'), t('fast_file_transfer'), t('instant_connection')],
      cons: [t('ip_exposed'), t('not_censorship_resistant')],
    },
    {
      id: 'hybrid' as const, name: t('hybrid'), icon: '⚡',
      desc: t('hybrid_desc'),
      pros: [t('good_balance'), t('falls_back_to_tor'), t('adaptive_performance')],
      cons: [t('some_metadata_exposure'), t('more_complex')],
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('network_mode')}</Text>
        <View style={{width: 60}} />
      </View>

      {options.map(opt => (
        <TouchableOpacity key={opt.id} style={[styles.card, mode === opt.id && styles.cardActive]} onPress={() => setMode(opt.id)}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>{opt.icon}</Text>
            <Text style={styles.cardName}>{opt.name}</Text>
            <View style={[styles.radio, mode === opt.id && styles.radioSelected]}>
              {mode === opt.id && <View style={styles.radioInner} />}
            </View>
          </View>
          <Text style={styles.cardDesc}>{opt.desc}</Text>
          <View style={styles.proscons}>
            <View style={styles.column}>
              {opt.pros.map(p => <Text key={p} style={styles.pro}>✓ {p}</Text>)}
            </View>
            <View style={styles.column}>
              {opt.cons.map(c => <Text key={c} style={styles.con}>✗ {c}</Text>)}
            </View>
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
  card: {marginHorizontal: Spacing.lg, marginBottom: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 2, borderColor: 'transparent'},
  cardActive: {borderColor: Colors.primary},
  cardHeader: {flexDirection: 'row', alignItems: 'center'},
  cardIcon: {fontSize: 28},
  cardName: {flex: 1, color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '600', marginLeft: Spacing.md},
  cardDesc: {color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: Spacing.sm, lineHeight: 20},
  proscons: {flexDirection: 'row', marginTop: Spacing.md, gap: Spacing.md},
  column: {flex: 1},
  pro: {color: Colors.success, fontSize: FontSize.xs, lineHeight: 20},
  con: {color: Colors.error, fontSize: FontSize.xs, lineHeight: 20},
  radio: {width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center'},
  radioSelected: {borderColor: Colors.primary},
  radioInner: {width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary},
});

export default CommunicationModeScreen;
