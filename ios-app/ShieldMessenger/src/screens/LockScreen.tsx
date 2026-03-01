import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Vibration,
} from 'react-native';
import {Colors, Spacing, FontSize, BorderRadius} from '../theme/colors';
import {t} from '../i18n';
import RustBridge from '../native/RustBridge';
import * as Keychain from 'react-native-keychain';

interface LockScreenProps {
  onUnlock: () => void;
}

const LockScreen: React.FC<LockScreenProps> = ({onUnlock}) => {
  const [password, setPassword] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    // Check if password hash exists in Keychain
    checkFirstLaunch();
    // Auto-trigger biometric on launch
    triggerBiometricOnMount();
  }, [fadeAnim]);

  const checkFirstLaunch = async () => {
    try {
      const credentials = await Keychain.getGenericPassword({service: 'shield_password_hash'});
      if (!credentials) {
        setIsFirstLaunch(true);
      }
    } catch {
      setIsFirstLaunch(true);
    }
  };

  const triggerBiometricOnMount = async () => {
    try {
      const credentials = await Keychain.getGenericPassword({service: 'shield_password_hash'});
      if (credentials) {
        handleBiometric();
      }
    } catch {
      // Biometric not available, user will enter password
    }
  };

  // Lockout timer
  useEffect(() => {
    if (lockTimer > 0) {
      const timer = setTimeout(() => setLockTimer(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isLocked && lockTimer === 0) {
      setIsLocked(false);
    }
  }, [lockTimer, isLocked]);

  const shakeAnimation = useCallback(() => {
    Vibration.vibrate(200);
    Animated.sequence([
      Animated.timing(shakeAnim, {toValue: 10, duration: 50, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: -10, duration: 50, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: 10, duration: 50, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: -10, duration: 50, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: 0, duration: 50, useNativeDriver: true}),
    ]).start();
  }, [shakeAnim]);

  const handleUnlock = useCallback(async () => {
    if (isLocked) return;
    if (password.length < 4) {
      shakeAnimation();
      return;
    }

    try {
      if (isFirstLaunch) {
        // First launch: hash password and store in Keychain
        const hash = await RustBridge.hashPassword(password);
        await Keychain.setGenericPassword('shield_user', hash, {
          service: 'shield_password_hash',
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
        // Also store password in biometric-protected entry
        await Keychain.setGenericPassword('shield_user', password, {
          service: 'shield_biometric',
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
        setIsFirstLaunch(false);
        setAttempts(0);
        onUnlock();
      } else {
        // Verify password against stored hash via Rust core
        const credentials = await Keychain.getGenericPassword({service: 'shield_password_hash'});
        if (credentials) {
          const isValid = await RustBridge.verifyPassword(password, credentials.password);
          if (isValid) {
            setAttempts(0);
            onUnlock();
          } else {
            handleFailedAttempt();
          }
        } else {
          handleFailedAttempt();
        }
      }
    } catch {
      handleFailedAttempt();
    }
    setPassword('');
  }, [password, attempts, isLocked, isFirstLaunch, onUnlock, shakeAnimation]);

  const handleFailedAttempt = () => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    shakeAnimation();
    if (newAttempts >= 5) {
      setIsLocked(true);
      const lockDuration = Math.min(30 * Math.pow(2, newAttempts - 5), 3600);
      setLockTimer(lockDuration);
      Alert.alert(t('too_many_attempts'), t('wait_seconds').replace('%s', String(lockDuration)));
    }
  };

  const handleBiometric = useCallback(async () => {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: 'shield_biometric',
        authenticationPrompt: {
          title: t('use_biometric'),
          subtitle: t('app_name'),
          cancel: t('cancel'),
        },
      });
      if (credentials) {
        setAttempts(0);
        onUnlock();
      }
    } catch {
      // Biometric failed or cancelled — user can enter password
    }
  }, [onUnlock]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View style={[styles.content, {opacity: fadeAnim}]}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🛡️</Text>
          </View>
          <Text style={styles.appName}>{t('app_name')}</Text>
          <Text style={styles.tagline}>{t('tagline_lock')}</Text>
        </View>

        {/* Tor Status Indicator */}
        <View style={styles.torStatus}>
          <View style={[styles.torDot, {backgroundColor: Colors.torConnecting}]} />
          <Text style={styles.torStatusText}>{t('connecting_to_tor')}</Text>
        </View>

        {/* Password Input */}
        <Animated.View
          style={[styles.inputContainer, {transform: [{translateX: shakeAnim}]}]}>
          <TextInput
            style={styles.passwordInput}
            placeholder={t('enter_password')}
            placeholderTextColor={Colors.textTertiary}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleUnlock}
            returnKeyType="go"
            autoCorrect={false}
            autoCapitalize="none"
            editable={!isLocked}
            accessibilityLabel={t('enter_password')}
          />
          <TouchableOpacity
            style={styles.showPasswordButton}
            onPress={() => setShowPassword(!showPassword)}
            accessibilityLabel={showPassword ? t('hide_password') : t('show_password')}>
            <Text style={styles.showPasswordText}>
              {showPassword ? '🙈' : '👁️'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Lockout Warning */}
        {isLocked && (
          <Text style={styles.lockoutText}>
            {t('locked_for').replace('%s', String(lockTimer))}
          </Text>
        )}

        {/* Attempt Counter */}
        {attempts > 0 && !isLocked && (
          <Text style={styles.attemptText}>
            {t('attempts_remaining').replace('%s', String(5 - attempts))}
          </Text>
        )}

        {/* Unlock Button */}
        <TouchableOpacity
          style={[styles.unlockButton, isLocked && styles.unlockButtonDisabled]}
          onPress={handleUnlock}
          disabled={isLocked}
          accessibilityLabel={t('unlock')}
          accessibilityRole="button">
          <Text style={styles.unlockButtonText}>{t('unlock')}</Text>
        </TouchableOpacity>

        {/* Biometric Button */}
        <TouchableOpacity
          style={styles.biometricButton}
          onPress={handleBiometric}
          accessibilityLabel={t('use_biometric')}
          accessibilityRole="button">
          <Text style={styles.biometricText}>{t('use_biometric')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logoText: {
    fontSize: 36,
  },
  appName: {
    fontSize: FontSize.title,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  torStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
  },
  torDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  torStatusText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  passwordInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: Spacing.lg,
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
  },
  showPasswordButton: {
    padding: Spacing.md,
  },
  showPasswordText: {
    fontSize: 20,
  },
  lockoutText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  attemptText: {
    color: Colors.warning,
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  unlockButton: {
    width: '100%',
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  unlockButtonDisabled: {
    backgroundColor: Colors.surfaceVariant,
  },
  unlockButtonText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
  biometricButton: {
    paddingVertical: Spacing.md,
  },
  biometricText: {
    fontSize: FontSize.md,
    color: Colors.primary,
  },
});

export default LockScreen;
