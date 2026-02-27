import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';

interface VoiceCallScreenProps {
  route: any;
  navigation: any;
}

type CallState = 'connecting' | 'ringing' | 'active' | 'ended';

const VoiceCallScreen: React.FC<VoiceCallScreenProps> = ({route, navigation}) => {
  const {contactName} = route.params;
  const [callState, setCallState] = useState<CallState>('connecting');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for connecting state
  useEffect(() => {
    if (callState === 'connecting' || callState === 'ringing') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {toValue: 1.2, duration: 800, useNativeDriver: true}),
          Animated.timing(pulseAnim, {toValue: 1, duration: 800, useNativeDriver: true}),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [callState, pulseAnim]);

  // Simulate call connection
  useEffect(() => {
    const timer1 = setTimeout(() => setCallState('ringing'), 2000);
    const timer2 = setTimeout(() => setCallState('active'), 5000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Duration timer
  useEffect(() => {
    if (callState === 'active') {
      const timer = setInterval(() => setDuration(d => d + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [callState]);

  const formatDuration = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const endCall = () => {
    setCallState('ended');
    setTimeout(() => navigation.goBack(), 1000);
  };

  const getStatusText = (): string => {
    switch (callState) {
      case 'connecting': return 'Establishing Tor circuit...';
      case 'ringing': return 'Ringing...';
      case 'active': return formatDuration(duration);
      case 'ended': return 'Call ended';
    }
  };

  return (
    <View style={styles.container}>
      {/* Encryption indicator */}
      <View style={styles.encryptionBar}>
        <Text style={styles.encryptionText}>
          🔒 End-to-end encrypted via Tor
        </Text>
      </View>

      {/* Contact info */}
      <View style={styles.contactSection}>
        <Animated.View
          style={[
            styles.avatarLarge,
            callState !== 'active' && {transform: [{scale: pulseAnim}]},
          ]}>
          <Text style={styles.avatarLargeText}>
            {contactName.charAt(0).toUpperCase()}
          </Text>
        </Animated.View>
        <Text style={styles.contactName}>{contactName}</Text>
        <Text
          style={[
            styles.callStatus,
            callState === 'active' && styles.callStatusActive,
          ]}>
          {getStatusText()}
        </Text>
      </View>

      {/* Call controls */}
      <View style={styles.controlsSection}>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={() => setIsMuted(!isMuted)}
            accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}>
            <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🔊'}</Text>
            <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isSpeaker && styles.controlButtonActive]}
            onPress={() => setIsSpeaker(!isSpeaker)}
            accessibilityLabel={isSpeaker ? 'Earpiece' : 'Speaker'}>
            <Text style={styles.controlIcon}>{isSpeaker ? '📢' : '🔈'}</Text>
            <Text style={styles.controlLabel}>{isSpeaker ? 'Earpiece' : 'Speaker'}</Text>
          </TouchableOpacity>
        </View>

        {/* End call button */}
        <TouchableOpacity
          style={styles.endCallButton}
          onPress={endCall}
          accessibilityLabel="End call"
          accessibilityRole="button">
          <Text style={styles.endCallIcon}>📞</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
  },
  encryptionBar: {
    alignItems: 'center',
    paddingTop: Spacing.xxl + Spacing.xl,
    paddingBottom: Spacing.md,
  },
  encryptionText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  contactSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarLargeText: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.primary,
  },
  contactName: {
    fontSize: FontSize.title,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  callStatus: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
  },
  callStatusActive: {
    color: Colors.success,
    fontVariant: ['tabular-nums'],
  },
  controlsSection: {
    alignItems: 'center',
    paddingBottom: Spacing.xxl * 2,
  },
  controlsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xxl,
  },
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
  },
  controlButtonActive: {
    backgroundColor: Colors.primary,
  },
  controlIcon: {
    fontSize: 24,
  },
  controlLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  endCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.destructive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallIcon: {
    fontSize: 28,
    transform: [{rotate: '135deg'}],
  },
});

export default VoiceCallScreen;
