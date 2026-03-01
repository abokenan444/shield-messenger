import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView} from 'react-native';
import {Colors, Spacing, FontSize} from '../theme/colors';
import {t} from '../i18n';

const PrivacyScreen: React.FC<{navigation: any}> = ({navigation}) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'‹ '}{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('privacy_policy')}</Text>
        <View style={{width: 60}} />
      </View>

      <View style={styles.content}>
        <Text style={styles.heading}>{t('shield_privacy_policy')}</Text>
        <Text style={styles.date}>{t('last_updated')}: January 2025</Text>

        <Text style={styles.sectionHead}>{t('privacy_data_collection_title')}</Text>
        <Text style={styles.body}>{t('privacy_data_collection')}</Text>

        <Text style={styles.sectionHead}>{t('privacy_e2ee_title')}</Text>
        <Text style={styles.body}>{t('privacy_e2ee')}</Text>

        <Text style={styles.sectionHead}>{t('privacy_network_title')}</Text>
        <Text style={styles.body}>{t('privacy_network')}</Text>

        <Text style={styles.sectionHead}>{t('privacy_no_metadata_title')}</Text>
        <Text style={styles.body}>{t('privacy_no_metadata')}</Text>

        <Text style={styles.sectionHead}>{t('privacy_local_storage_title')}</Text>
        <Text style={styles.body}>{t('privacy_local_storage')}</Text>

        <Text style={styles.sectionHead}>{t('privacy_open_source_title')}</Text>
        <Text style={styles.body}>{t('privacy_open_source')}</Text>

        <Text style={styles.sectionHead}>{t('privacy_duress_title')}</Text>
        <Text style={styles.body}>{t('privacy_duress')}</Text>

        <Text style={styles.footer}>{t('no_tracking_footer')}</Text>
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
