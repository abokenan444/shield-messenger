import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';

const BackupSeedScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [revealed, setRevealed] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyIndex, setVerifyIndex] = useState(3); // Word #4

  // Demo seed phrase - in production comes from Rust core BIP39 generation
  const seedWords = [
    'abandon', 'ability', 'able', 'about', 'above', 'absent',
    'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident',
    'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire',
    'across', 'act', 'action', 'actor', 'actress', 'actual',
  ];

  const handleReveal = () => {
    Alert.alert(
      'Security Warning',
      'Make sure no one can see your screen. Never screenshot or copy your seed phrase digitally.',
      [{text: 'Cancel'}, {text: 'I Understand', onPress: () => setRevealed(true)}],
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Backup Seed</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.content}>
        <Text style={styles.instruction}>
          Write down these 24 words in order on paper. Store it in a safe place. This is the ONLY way to recover your account.
        </Text>

        {!revealed ? (
          <TouchableOpacity style={styles.revealBtn} onPress={handleReveal}>
            <Text style={styles.revealIcon}>👁️</Text>
            <Text style={styles.revealText}>Tap to Reveal Seed Phrase</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.seedGrid}>
            {seedWords.map((word, i) => (
              <View key={i} style={styles.wordCard}>
                <Text style={styles.wordNumber}>{i + 1}</Text>
                <Text style={styles.wordText}>{word}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠️ Critical Security Rules</Text>
          <Text style={styles.warningItem}>• Never share your seed phrase with anyone</Text>
          <Text style={styles.warningItem}>• Never enter it on any website</Text>
          <Text style={styles.warningItem}>• Never take a screenshot or photo</Text>
          <Text style={styles.warningItem}>• Write it on paper and store offline</Text>
          <Text style={styles.warningItem}>• Consider using a metal seed plate</Text>
        </View>

        {revealed && (
          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.doneBtnText}>I've Written It Down</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md},
  backText: {color: Colors.primary, fontSize: FontSize.lg},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  content: {paddingHorizontal: Spacing.lg},
  instruction: {color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 24, marginBottom: Spacing.xl},
  revealBtn: {alignItems: 'center', paddingVertical: 60, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, marginBottom: Spacing.xl},
  revealIcon: {fontSize: 40},
  revealText: {color: Colors.primary, fontSize: FontSize.md, fontWeight: '600', marginTop: Spacing.md},
  seedGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl},
  wordCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, width: '30%'},
  wordNumber: {color: Colors.textTertiary, fontSize: FontSize.xs, fontWeight: '600', width: 20},
  wordText: {color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '500'},
  warningCard: {backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderLeftWidth: 3, borderLeftColor: Colors.warning, marginBottom: Spacing.xl},
  warningTitle: {color: Colors.warning, fontSize: FontSize.md, fontWeight: '600', marginBottom: Spacing.sm},
  warningItem: {color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 24},
  doneBtn: {backgroundColor: Colors.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center', marginBottom: 40},
  doneBtnText: {color: Colors.textOnPrimary, fontSize: FontSize.lg, fontWeight: '700'},
});

export default BackupSeedScreen;
