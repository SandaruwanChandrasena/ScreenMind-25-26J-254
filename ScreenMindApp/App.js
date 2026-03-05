import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import SMAlertOverlay from './src/features/socialMedia/components/SMAlertOverlay';

const OVERLAY_KEY = 'sm_overlay_trigger';

export default function App() {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayRiskScore, setOverlayRiskScore] = useState(0);
  const pollingRef = useRef(null);
  const overlayShownRef = useRef(false); // ✅ guard — prevents re-showing

  const checkOverlayTrigger = async () => {
    if (overlayShownRef.current) return; // ✅ skip if already showing
    try {
      const raw = await AsyncStorage.getItem(OVERLAY_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data?.show) {
        overlayShownRef.current = true; // ✅ mark as shown
        setOverlayRiskScore(data.risk_score || 0);
        setOverlayVisible(true);
        await AsyncStorage.removeItem(OVERLAY_KEY); // ✅ clear immediately
      }
    } catch (e) {}
  };

  useEffect(() => {
    // Check immediately on app open
    checkOverlayTrigger();

    // Check every 3 seconds while app is running
    pollingRef.current = setInterval(checkOverlayTrigger, 3000);

    // Check when app comes back to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkOverlayTrigger();
      }
    });

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      subscription.remove();
    };
  }, []);

  return (
    <AuthProvider>
      <AppNavigator />
      {/* ✅ Global overlay — shows on ANY screen */}
      <SMAlertOverlay
        visible={overlayVisible}
        riskScore={overlayRiskScore}
        onClose={() => {
          overlayShownRef.current = false; // ✅ reset guard when closed
          setOverlayVisible(false);
        }}
      />
    </AuthProvider>
  );
}
