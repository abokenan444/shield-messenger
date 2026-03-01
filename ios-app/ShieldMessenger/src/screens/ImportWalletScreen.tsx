import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

const ImportWalletScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [seedPhrase, setSeedPhrase] = useState('');
  const [restoreHeight, setRestoreHeight] = useState('');
  const [importing, setImporting] = useState(false);

  const wordCount = seedPhrase.trim().split(/\s+/).filter(Boolean).length;
  const validSeed = wordCount === 25; // Monero uses 25-word seeds

  const handleImport = () => {
    if (!validSeed) return;
    setImporting(true);
    // TODO: Import Monero wallet via Rust core
    setTimeout(() => {
      setImporting(false);
      navigation.navigate('Wallet');
    }, 5000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('import_wallet')}</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>{t('monero_25_word_seed')}</Text>
        <TextInput
          style={styles.seedInput}
          placeholder={t('enter_25_word_seed')}
          placeholderTextColor={Colors.textTertiary}
          value={seedPhrase}
          onChangeText={setSeedPhrase}
          multiline
          numberOfLines={4}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={[styles.wordCount, validSeed && styles.wordCountValid]}>{wordCount}/25 words</Text>

        <Text style={styles.sectionTitle}>{t('restore_height_optional')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('block_height_hint')}
          placeholderTextColor={Colors.textTertiary}
          value={restoreHeight}
          onChangeText={setRestoreHeight}
          keyboardType="number-pad"
        />

        <TouchableOpacity
          style={[styles.importBtn, !validSeed && styles.btnDisabled]}
          disabled={!validSeed || importing}
          onPress={handleImport}>
          {importing ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={Colors.textOnPrimary} />
              <Text style={styles.importBtnText}> {t('syncing_blockchain')}</Text>
            </View>
          ) : (
            <Text style={styles.importBtnText}>{t('import_wallet')}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠️ {t('security')}</Text>
          <Text style={styles.warningText}>{t('seed_encrypted_locally')}</Text>
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
  content: {flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg},
  sectionTitle: {color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '600', marginBottom: Spacing.sm, marginTop: Spacing.lg},
  seedInput: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, color: Colors.textPrimary, fontSize: FontSize.md, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: Colors.border},
  wordCount: {color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: Spacing.sm, textAlign: 'right'},
  wordCountValid: {color: Colors.success},
  input: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border},
  importBtn: {backgroundColor: Colors.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center', marginTop: Spacing.xl},
  importBtnText: {color: Colors.textOnPrimary, fontSize: FontSize.lg, fontWeight: '700'},
  loadingRow: {flexDirection: 'row', alignItems: 'center'},
  btnDisabled: {opacity: 0.4},
  warningCard: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.xl, borderLeftWidth: 3, borderLeftColor: Colors.warning},
  warningTitle: {color: Colors.warning, fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.sm},
  warningText: {color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20},
});

export default ImportWalletScreen;
