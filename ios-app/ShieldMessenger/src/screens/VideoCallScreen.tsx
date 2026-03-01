import React, {useState, useEffect, useRef} from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions,
} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';

const {width} = Dimensions.get('window');

interface Props {
  route: {params: {contactId: string; contactName: string}};
  navigation: any;
}

const VideoCallScreen: React.FC<Props> = ({route, navigation}) => {
  const {contactName} = route.params;
  const [callState, setCallState] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => setCallState('ringing'), 2000);
    const timer2 = setTimeout(() => setCallState('connected'), 4000);
    return () => { clearTimeout(timer); clearTimeout(timer2); };
  }, []);

  useEffect(() => {
    if (callState === 'connected') {
      const interval = setInterval(() => setDuration(d => d + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [callState]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {toValue: 1.2, duration: 1000, useNativeDriver: true}),
        Animated.timing(pulseAnim, {toValue: 1, duration: 1000, useNativeDriver: true}),
      ]),
    ).start();
  }, [pulseAnim]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const endCall = () => {
    setCallState('ended');
    setTimeout(() => navigation.goBack(), 1000);
  };

  return (
    <View style={styles.container}>
      {/* Remote Video Placeholder */}
      <View style={styles.remoteVideo}>
        <Text style={styles.remoteInitial}>{contactName[0]}</Text>
      </View>

      {/* Local Video Preview */}
      {!isCameraOff && (
        <View style={styles.localVideo}>
          <Text style={styles.localText}>📷</Text>
        </View>
      )}

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.encryptedBadge}>
          <Text style={styles.encryptedIcon}>🔒</Text>
          <Text style={styles.encryptedText}>{t('encrypted_call')}</Text>
        </View>
      </View>

      {/* Call Info */}
      <View style={styles.callInfo}>
        <Text style={styles.contactName}>{contactName}</Text>
        <Text style={styles.callStatus}>
          {callState === 'connecting' ? t('calling') :
            callState === 'ringing' ? t('ringing') :
              callState === 'connected' ? formatDuration(duration) :
                t('call_ended')}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={() => setIsMuted(!isMuted)}>
            <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
            <Text style={styles.controlLabel}>{isMuted ? t('unmute') : t('mute')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isCameraOff && styles.controlButtonActive]}
            onPress={() => setIsCameraOff(!isCameraOff)}>
            <Text style={styles.controlIcon}>{isCameraOff ? '📷' : '📹'}</Text>
            <Text style={styles.controlLabel}>{isCameraOff ? 'Camera On' : 'Camera Off'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setIsFrontCamera(!isFrontCamera)}>
            <Text style={styles.controlIcon}>🔄</Text>
            <Text style={styles.controlLabel}>Flip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isSpeaker && styles.controlButtonActive]}
            onPress={() => setIsSpeaker(!isSpeaker)}>
            <Text style={styles.controlIcon}>{isSpeaker ? '🔊' : '🔈'}</Text>
            <Text style={styles.controlLabel}>{t('speaker')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
          <Text style={styles.endCallIcon}>📞</Text>
          <Text style={styles.endCallText}>{t('end_call')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000'},
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteInitial: {fontSize: 80, color: Colors.textTertiary, fontWeight: '300'},
  localVideo: {
    position: 'absolute', top: 60, right: 20,
    width: 120, height: 160, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.primary,
  },
  localText: {fontSize: 40},
  topBar: {
    position: 'absolute', top: 50, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', paddingHorizontal: Spacing.xl,
  },
  encryptedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs, borderRadius: BorderRadius.full,
  },
  encryptedIcon: {fontSize: 12, marginRight: 4},
  encryptedText: {color: Colors.success, fontSize: FontSize.xs},
  callInfo: {
    position: 'absolute', bottom: 220, left: 0, right: 0, alignItems: 'center',
  },
  contactName: {fontSize: FontSize.xxl, fontWeight: '700', color: '#FFF'},
  callStatus: {fontSize: FontSize.md, color: Colors.textSecondary, marginTop: 4},
  controls: {
    position: 'absolute', bottom: 40, left: 0, right: 0,
    paddingHorizontal: Spacing.xl,
  },
  controlRow: {
    flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.xl,
  },
  controlButton: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  controlButtonActive: {backgroundColor: Colors.primary},
  controlIcon: {fontSize: 24},
  controlLabel: {fontSize: 9, color: '#FFF', marginTop: 2},
  endCallButton: {
    flexDirection: 'row', backgroundColor: Colors.destructive,
    height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center',
  },
  endCallIcon: {fontSize: 20, marginRight: 8, transform: [{rotate: '135deg'}]},
  endCallText: {fontSize: FontSize.lg, fontWeight: '600', color: '#FFF'},
});

export default VideoCallScreen;
