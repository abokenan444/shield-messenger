import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

const SubscriptionScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [currentPlan, setCurrentPlan] = useState('free');

  const plans = [
    {
      id: 'free',
      name: t('free_plan'),
      price: '$0',
      period: '/mo',
      features: [
        '1:1 Encrypted Messaging',
        'Voice Calls over Tor',
        '5 Group Chats',
        '10MB File Transfer',
        'Basic Wallet',
      ],
      color: Colors.textSecondary,
    },
    {
      id: 'supporter',
      name: t('supporter_plan'),
      price: '$4.99',
      period: '/mo',
      features: [
        'Everything in Free',
        'Unlimited Group Chats',
        'Video Calls over Tor',
        '50MB File Transfer',
        'Priority Tor Relays',
        'Custom Bridge Support',
        'Read Receipts',
      ],
      color: Colors.primary,
    },
    {
      id: 'enterprise',
      name: t('enterprise_plan'),
      price: '$14.99',
      period: '/mo',
      features: [
        'Everything in Supporter',
        'SecureMesh (LoRa)',
        '100MB File Transfer',
        'Multi-device Sync',
        'Custom Onion Domain',
        'Priority Support',
        'Audit Logs',
        'Team Management',
      ],
      color: Colors.success,
    },
  ];

  const handleUpgrade = (planId: string) => {
    if (planId === currentPlan) return;
    Alert.alert(
      t('upgrade'),
      `Upgrade to ${plans.find(p => p.id === planId)?.name}?`,
      [
        {text: t('cancel'), style: 'cancel'},
        {text: t('confirm'), onPress: () => setCurrentPlan(planId)},
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('subscription')}</Text>
        <View style={{width: 60}} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {plans.map(plan => (
          <View key={plan.id} style={[styles.planCard, currentPlan === plan.id && styles.planCardActive]}>
            <View style={[styles.planBadge, {backgroundColor: plan.color}]}>
              <Text style={styles.planBadgeText}>{plan.name}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{plan.price}</Text>
              <Text style={styles.period}>{plan.period}</Text>
            </View>
            {plan.features.map((feature, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={[
                styles.selectButton,
                currentPlan === plan.id ? styles.currentButton : {backgroundColor: plan.color},
              ]}
              onPress={() => handleUpgrade(plan.id)}
              disabled={currentPlan === plan.id}>
              <Text style={styles.selectButtonText}>
                {currentPlan === plan.id ? t('current_plan') : t('upgrade')}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  backBtn: {color: Colors.primary, fontSize: FontSize.md},
  title: {color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700'},
  content: {padding: Spacing.xl, gap: Spacing.lg},
  planCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border,
  },
  planCardActive: {borderColor: Colors.primary, borderWidth: 2},
  planBadge: {
    alignSelf: 'flex-start', paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, marginBottom: Spacing.md,
  },
  planBadgeText: {color: '#FFF', fontSize: FontSize.sm, fontWeight: '600'},
  priceRow: {flexDirection: 'row', alignItems: 'baseline', marginBottom: Spacing.lg},
  price: {color: Colors.textPrimary, fontSize: 36, fontWeight: '800'},
  period: {color: Colors.textSecondary, fontSize: FontSize.md, marginLeft: 4},
  featureRow: {flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm},
  checkmark: {color: Colors.success, fontSize: FontSize.md, marginRight: Spacing.sm, width: 20},
  featureText: {color: Colors.textSecondary, fontSize: FontSize.md, flex: 1},
  selectButton: {
    height: 48, borderRadius: BorderRadius.lg,
    justifyContent: 'center', alignItems: 'center', marginTop: Spacing.lg,
  },
  currentButton: {backgroundColor: Colors.surfaceVariant},
  selectButtonText: {color: '#FFF', fontSize: FontSize.lg, fontWeight: '600'},
});

export default SubscriptionScreen;
