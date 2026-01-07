# Pre-Presentation Testing Checklist

## 🔧 Build & Installation

- [ ] Clean build: `cd android && ./gradlew clean`
- [ ] Rebuild: `cd .. && npm run android`
- [ ] App installs without errors
- [ ] No red screen crashes on launch
- [ ] Check logs: `npx react-native log-android`

---

## 📱 Permission Flow Testing

### Location Permissions
- [ ] App requests location permission
- [ ] Accept location permission → toast confirms
- [ ] App requests background location
- [ ] Accept background location → service starts
- [ ] Check notification appears (foreground service)
- [ ] Deny permission → app handles gracefully

### Bluetooth Permission
- [ ] App requests Bluetooth scan permission
- [ ] Accept → scanning works
- [ ] Deny → feature disabled, no crash

### Usage Access
- [ ] Open Usage Access Settings works
- [ ] Grant permission in Android settings
- [ ] Return to app → screen time displays

---

## 🎯 Feature Collection Testing

### GPS Features
- [ ] Walk around for 10 minutes
- [ ] Open IsolationOverviewScreen
- [ ] Check "Daily distance" card shows > 0m
- [ ] Move to different location
- [ ] Reopen screen → distance increased
- [ ] "Time at home" shows percentage

### Unlock Counter
- [ ] Lock phone
- [ ] Unlock phone (5-10 times)
- [ ] Open app → "unlocks" metric should increment
- [ ] Check native SharedPreferences if needed

### Screen Time
- [ ] Use phone for 30 minutes
- [ ] Open IsolationOverviewScreen  
- [ ] "Night usage" or screen time shows data
- [ ] Value seems reasonable (not 0, not absurdly high)

### Bluetooth Scanning
- [ ] Enable Bluetooth on phone
- [ ] Be near other Bluetooth devices
- [ ] Open IsolationOverviewScreen
- [ ] Check "Bluetooth devices" metric > 0
- [ ] Move to isolated area → count drops

---

## 📊 Risk Scoring Testing

### Low Risk Scenario
- [ ] Generate features with good values:
  - High distance (3000m+)
  - Low time at home (50%)
  - Many contacts (6+)
  - Low night usage (20 min)
- [ ] Risk score: 0-33 (Green/Low)
- [ ] Summary says "patterns look balanced"

### High Risk Scenario
- [ ] Generate features with concerning values:
  - Low distance (300m)
  - High time at home (85%)
  - Few contacts (1-2)
  - High night usage (120 min)
- [ ] Risk score: 67-100 (Red/High)
- [ ] Summary lists detected issues

### Dummy Data Testing
- [ ] Comment out `collectRealFeatures()`
- [ ] Use `generateDummyFeatures()` instead
- [ ] Risk score displays
- [ ] All UI cards populated
- [ ] No crashes

---

## 🖼️ UI Testing

### IsolationOverviewScreen
- [ ] Title: "📍 Social Well-being"
- [ ] Subtitle explains purpose
- [ ] Risk card shows score and label
- [ ] Summary text appears
- [ ] 4 highlight cards display
- [ ] "Open Stats" button works
- [ ] "Why this risk?" button works

### IsolationPrivacyScreen
- [ ] All toggles render
- [ ] Toggling GPS → saves to AsyncStorage
- [ ] Toggling Usage → saves to AsyncStorage
- [ ] "Start Tracking" button works
- [ ] Info cards explain each sensor

### IsolationStatsScreen
- [ ] Historical data displays (if any)
- [ ] Charts render without crashes
- [ ] Empty state handled gracefully

### IsolationWhyScreen
- [ ] Breakdown by category shows
- [ ] Percentages add up correctly
- [ ] Explanations make sense

---

## 🔐 Privacy Testing

### Data Storage
- [ ] Open AsyncStorage viewer
- [ ] Check "isolation_prefs" exists
- [ ] Check "isolation_records" exists
- [ ] Verify no raw GPS coordinates stored
- [ ] Verify only aggregated metrics present

### Native SharedPreferences
- [ ] Use `adb shell` to check SharedPreferences
- [ ] File: `/data/data/com.screenmindapp/shared_prefs/isolation_metrics.xml`
- [ ] GPS data: Array of {t, lat, lng}
- [ ] Unlock count: Integer
- [ ] Data deleted when day changes

### Permissions Respect
- [ ] Disable GPS in privacy screen
- [ ] GPS features = 0 in overview
- [ ] Disable Bluetooth
- [ ] Bluetooth metric = 0
- [ ] Disable Usage
- [ ] Screen time = 0

---

## 🐛 Error Handling Testing

### Network Errors
- [ ] Turn off internet
- [ ] App still works (on-device only)
- [ ] No network error toasts

### Missing Permissions
- [ ] Revoke location in Android settings
- [ ] Open app → feature gracefully disabled
- [ ] No crash, just shows 0 or "N/A"

### Native Module Errors
- [ ] If UsageStatsBridge not granted
- [ ] App shows 0 screen time, doesn't crash
- [ ] If IsolationMetricsBridge fails
- [ ] GPS features return 0, no crash

### Bluetooth Errors
- [ ] Turn off Bluetooth
- [ ] scanBluetoothCountOnce → returns 0
- [ ] No crash

---

## 📸 Demo Preparation

### Screenshots to Take
- [ ] IsolationOverviewScreen (main dashboard)
- [ ] IsolationPrivacyScreen (consent toggles)
- [ ] IsolationStatsScreen (if data available)
- [ ] IsolationWhyScreen (breakdown)
- [ ] Permission request dialogs
- [ ] Foreground service notification

### Video Recording (Optional)
- [ ] Screen record full flow:
  1. Open app
  2. Privacy screen
  3. Grant permissions
  4. Background service starts
  5. Walk around
  6. Return to app
  7. View updated metrics

---

## 🎓 Panel Demo Scenarios

### Scenario 1: Full Demo (Permissions Granted)
1. Show foreground service notification
2. Open app → IsolationOverviewScreen
3. Point out risk score and label
4. Tap "Why this risk?" → explain breakdown
5. Tap "Open Stats" → show historical trends
6. Go to Privacy screen → show toggles

### Scenario 2: Backup Demo (No Permissions)
1. Explain permission requirements
2. Use dummy data mode
3. Show UI flow with generated data
4. Explain what real data would show

### Scenario 3: Code Walkthrough
1. Open `IsolationMetricsModule.kt`
2. Show `computeGpsFeatures()` function
3. Explain Haversine distance calculation
4. Show entropy computation
5. Open `isolationScoring.js`
6. Explain risk formula
7. Show weighted subscores

---

## ✅ Final Pre-Presentation Checklist

### Day Before Presentation
- [ ] Full rebuild from clean state
- [ ] Test on actual device (not emulator)
- [ ] Charge device to 100%
- [ ] Enable Developer Options
- [ ] Stay Awake: ON (so screen doesn't sleep during demo)
- [ ] Take screenshots
- [ ] Save demo video backup

### Morning of Presentation
- [ ] Charge device again
- [ ] Turn off auto-updates
- [ ] Turn off notifications (except ScreenMind)
- [ ] Set screen brightness to max
- [ ] Have backup phone ready
- [ ] Print VIVA_QUICK_REFERENCE.md

### In the Room
- [ ] Open app before panel arrives
- [ ] Have code editor ready (VS Code)
- [ ] Have AndroidManifest.xml open in browser
- [ ] Have IMPLEMENTATION_SUMMARY.md printed
- [ ] Water bottle nearby
- [ ] Deep breath → You got this! 💪

---

## 🚨 Common Issues & Fixes

### "BleManager not available"
**Fix**: Check if `react-native-ble-plx` is linked
```bash
cd android && ./gradlew clean
cd .. && npm run android
```

### "UsageStatsBridge is null"
**Fix**: Usage Access not granted
- Go to Settings → Apps → Special Access → Usage Access
- Enable for ScreenMind

### "Location data empty"
**Fix**: Background location not working
- Check foreground service is running
- Check notification is visible
- Grant background location permission
- Walk around for 5-10 minutes

### "Risk score always 0"
**Fix**: No features collected
- Check permissions granted
- Check preferences enabled
- Use `generateDummyFeatures()` for testing

### "App crashes on launch"
**Fix**: Native module registration issue
- Check `MainApplication.kt` has all packages
- Rebuild: `cd android && ./gradlew clean`

---

## 📝 Notes Section

### Issues Found During Testing:
(Write here as you test)

### Questions to Ask Supervisor:
(Write here before presentation)

### Improvements Noted for Final:
(Write here after progress presentation)

---

**Test everything at least 3 times. If it works 3 times, it'll work during demo! 🎯**
