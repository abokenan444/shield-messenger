import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';

const AutoLockScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [selected, setSelected] = useState('5min');

  const options = [
    {id: 'immediate', label: 'Immediately', desc: 'Lock as soon as app goes to background'},
    {id: '30sec', label: '30 seconds', desc: 'Brief delay for multitasking'},
    {id: '1min', label: '1 minute', desc: 'Standard delay'},
    {id: '5min', label: '5 minutes', desc: 'Default setting'},
    {id: '15min', label: '15 minutes', desc: 'Extended session'},
    {id: '1hour', label: '1 hour', desc: 'Long session (not recommended)'},
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Auto-Lock</Text>
        <View style={{width: 60}} />
      </View>

      <Text style={styles.subtitle}>Choose when the app should lock after going to the background</Text>

      {options.map(opt => (
        <TouchableOpacity key={opt.id} style={styles.optionRow} onPress={() => setSelected(opt.id)}>
          <View style={styles.optionInfo}>
            <Text style={styles.optionLabel}>{opt.label}</Text>
            <Text style={styles.optionDesc}>{opt.desc}</Text>
          </View>
          <View style={[styles.radio, selected === opt.id && styles.radioSelected]}>
            {selected === opt.id && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>
      ))}

      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          🔐 When locked, all data is encrypted with your Argon2id-derived key and cannot be accessed without your password.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  subtitle: {color: Colors.textSecondary, fontSize: FontSize.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg},
  optionRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider},
  optionInfo: {flex: 1},
  optionLabel: {color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '500'},
  optionDesc: {color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2},
  radio: {width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center'},
  radioSelected: {borderColor: Colors.primary},
  radioInner: {width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary},
  infoCard: {margin: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg},
  infoText: {color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20},
});

export default AutoLockScreen;
