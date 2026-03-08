import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  NativeModules,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const COOLDOWN_KEY = 'sm_alert_cooldown';
const COOLDOWN_MINS = 30;

export default function SMAlertOverlay({ visible, riskScore, onClose }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  // ── "I Manage It" → 30 min cooldown ──
  const handleIManageIt = async () => {
    try {
      const cooldownUntil = Date.now() + COOLDOWN_MINS * 60 * 1000;
      await AsyncStorage.setItem(
        COOLDOWN_KEY,
        JSON.stringify({ until: cooldownUntil }),
      );
      console.log(`⏳ Cooldown set for ${COOLDOWN_MINS} mins`);
    } catch (e) {
      console.log('❌ Cooldown save error:', e);
    }
    onClose();
  };

  // ── Lock Screen ──
  const handleLockScreen = () => {
    if (!NativeModules.DeviceControl) {
      console.log('⚠️ DeviceControl not available');
      onClose();
      return;
    }

    // Close overlay first, then attempt lock after short delay
    onClose();
    setTimeout(() => {
      try {
        // This will lock if admin granted, or open Security Settings if not
        NativeModules.DeviceControl.lockScreen();
        console.log('🔒 Lock attempted');
      } catch (e) {
        console.log('❌ Lock error:', e);
        // Fallback: request admin permission directly
        NativeModules.DeviceControl.requestAdminPermission?.();
      }
    }, 600);
  };

  // ── Silence ──
  const handleSilence = () => {
    try {
      if (NativeModules.DeviceControl) {
        NativeModules.DeviceControl.silencePhone();
        console.log('🔕 Phone silenced');
      }
    } catch (e) {
      console.log('❌ Silence error:', e);
    }
    onClose();
  };

  const handleCancel = () => onClose();
  const scorePercent = Math.round((riskScore || 0) * 100);

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <StatusBar backgroundColor="#0A0F2E" barStyle="light-content" />

      <Animated.View
        style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
      >
        <TouchableOpacity style={styles.closeBtn} onPress={handleCancel}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <Animated.View
          style={[styles.iconWrap, { transform: [{ scale: pulseAnim }] }]}
        >
          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <Text style={styles.iconText}>⚠️</Text>
            </View>
          </View>
        </Animated.View>

        <Text style={styles.title}>Emotional Alert</Text>
        <Text style={styles.subtitle}>High Negative Exposure Detected</Text>

        <View style={styles.scoreWrap}>
          <View style={styles.scoreBar}>
            <View style={[styles.scoreFill, { width: `${scorePercent}%` }]} />
          </View>
          <Text style={styles.scoreText}>Risk Score: {scorePercent}%</Text>
        </View>

        <Text style={styles.message}>
          You've been receiving a high number of negative messages recently.
          {'\n\n'}
          It's okay to step away and take care of yourself. 💙
        </Text>

        <View style={styles.btnGrid}>
          <TouchableOpacity
            style={[styles.btn, styles.btnManage]}
            onPress={handleIManageIt}
          >
            <Text style={styles.btnIcon}>✋</Text>
            <Text style={styles.btnLabel}>I Manage It</Text>
            <Text style={styles.btnSub}>No alerts for 30 mins</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnLock]}
            onPress={handleLockScreen}
          >
            <Text style={styles.btnIcon}>🔒</Text>
            <Text style={styles.btnLabel}>Lock Screen</Text>
            <Text style={styles.btnSub}>Lock my device</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnSilence]}
            onPress={handleSilence}
          >
            <Text style={styles.btnIcon}>🔕</Text>
            <Text style={styles.btnLabel}>Silence</Text>
            <Text style={styles.btnSub}>Mute notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnCancel]}
            onPress={handleCancel}
          >
            <Text style={styles.btnIcon}>↩️</Text>
            <Text style={styles.btnLabel}>Cancel</Text>
            <Text style={styles.btnSub}>Dismiss this alert</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    backgroundColor: 'rgba(5, 10, 40, 0.97)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    width: width * 0.88,
    backgroundColor: '#0D1545',
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(0, 180, 255, 0.25)',
    alignItems: 'center',
    shadowColor: '#00B4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: '#9CA3AF', fontSize: 14, fontWeight: '900' },
  iconWrap: { marginTop: 16, marginBottom: 20 },
  iconOuter: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: 'rgba(239,68,68,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.30)',
  },
  iconInner: {
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: 'rgba(239,68,68,0.20)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: { fontSize: 28 },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subtitle: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  scoreWrap: { width: '100%', marginBottom: 20 },
  scoreBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  scoreFill: { height: '100%', backgroundColor: '#EF4444', borderRadius: 999 },
  scoreText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  btnGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%' },
  btn: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnIcon: { fontSize: 22, marginBottom: 6 },
  btnLabel: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    marginBottom: 3,
  },
  btnSub: {
    color: '#9CA3AF',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  btnManage: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: 'rgba(34,197,94,0.35)',
  },
  btnLock: {
    backgroundColor: 'rgba(0,180,255,0.12)',
    borderColor: 'rgba(0,180,255,0.35)',
  },
  btnSilence: {
    backgroundColor: 'rgba(255,184,0,0.12)',
    borderColor: 'rgba(255,184,0,0.35)',
  },
  btnCancel: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
});
