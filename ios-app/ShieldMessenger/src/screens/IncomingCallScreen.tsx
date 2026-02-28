import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Vibration} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';

const IncomingCallScreen: React.FC<{route: any; navigation: any}> = ({route, navigation}) => {
  const {contactName, contactId, isVideo} = route.params || {contactName: 'Khalid', contactId: 'u1', isVideo: false};
  const [callState, setCallState] = useState<'ringing' | 'connecting'>('ringing');

  useEffect(() => {
    Vibration.vibrate([0, 500, 200, 500], true);
    return () => Vibration.cancel();
  }, []);

  const handleAccept = () => {
    Vibration.cancel();
    setCallState('connecting');
    navigation.replace('VoiceCall', {contactId, contactName});
  };

  const handleDecline = () => {
    Vibration.cancel();
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.callerInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{contactName[0]}</Text>
        </View>
        <Text style={styles.callerName}>{contactName}</Text>
        <Text style={styles.callType}>{isVideo ? 'Incoming Video Call' : 'Incoming Voice Call'}</Text>
        <Text style={styles.e2ee}>🔐 End-to-End Encrypted</Text>
        <Text style={styles.statusText}>{callState === 'ringing' ? 'Ringing...' : 'Connecting...'}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
          <Text style={styles.btnEmoji}>📵</Text>
          <Text style={styles.btnLabel}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
          <Text style={styles.btnEmoji}>📞</Text>
          <Text style={styles.btnLabel}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background, justifyContent: 'space-between', paddingBottom: 80},
  callerInfo: {alignItems: 'center', paddingTop: 120},
  avatar: {width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.surfaceVariant, alignItems: 'center', justifyContent: 'center'},
  avatarText: {color: Colors.primary, fontSize: 40, fontWeight: '600'},
  callerName: {color: Colors.textPrimary, fontSize: FontSize.title, fontWeight: '700', marginTop: Spacing.lg},
  callType: {color: Colors.textSecondary, fontSize: FontSize.lg, marginTop: Spacing.sm},
  e2ee: {color: Colors.success, fontSize: FontSize.sm, marginTop: Spacing.sm},
  statusText: {color: Colors.textTertiary, fontSize: FontSize.md, marginTop: Spacing.xl},
  actions: {flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: Spacing.xxl},
  declineBtn: {alignItems: 'center', width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.error, justifyContent: 'center'},
  acceptBtn: {alignItems: 'center', width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.success, justifyContent: 'center'},
  btnEmoji: {fontSize: 28},
  btnLabel: {color: Colors.textPrimary, fontSize: FontSize.xs, marginTop: 4},
});

export default IncomingCallScreen;
