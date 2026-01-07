# Social Isolation & Loneliness Detection Component

> Part of ScreenMind: AI-Based Mental Health Detection System for University Students

## 📱 What This Component Does

Detects social isolation and loneliness risk by analyzing:
- **Mobility patterns** (GPS tracking)
- **Communication metadata** (call/SMS counts, not content)
- **Phone behavior** (usage patterns, unlocks)
- **Proximity sensing** (Bluetooth device counts)

**Output**: Risk score (0-100) with explainable breakdown and suggestions.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│          React Native UI Layer              │
│  (8 screens: Overview, Stats, Why, etc.)   │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│         JavaScript Services                 │
│  • isolationCollector.js                    │
│  • isolationScoring.js                      │
│  • isolationStorage.js                      │
│  • permissionHelper.js                      │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│      Native Android Modules (Kotlin)        │
│  • LocationForegroundService               │
│  • IsolationMetricsModule                  │
│  • UsageStatsModule                        │
│  • UnlockReceiver                          │
└─────────────────────────────────────────────┘
```

---

## 📂 File Structure

```
ScreenMindApp/
├── android/app/src/main/java/com/screenmindapp/isolation/
│   ├── LocationForegroundService.kt    # Background GPS collection
│   ├── IsolationMetricsModule.kt       # GPS feature extraction
│   ├── IsolationMetricsPackage.kt      # Module registration
│   ├── UsageStatsModule.kt             # Screen time tracking
│   ├── UsageStatsPackage.kt            # Module registration
│   ├── ServiceStarterModule.kt         # Service control
│   ├── ServiceStarterPackage.kt        # Module registration
│   ├── UnlockReceiver.kt               # Unlock counter
│   └── DateKey.kt                      # Date utility
│
└── src/features/isolation/
    ├── services/
    │   ├── isolationCollector.js       # Feature collection
    │   ├── isolationScoring.js         # Risk calculation
    │   ├── isolationStorage.js         # AsyncStorage wrapper
    │   └── permissionHelper.js         # Permission management
    │
    ├── screens/
    │   ├── IsolationOverviewScreen.js  # Main dashboard
    │   ├── IsolationPrivacyScreen.js   # Privacy controls
    │   ├── IsolationStatsScreen.js     # Historical data
    │   ├── IsolationTrendsScreen.js    # Time-series charts
    │   ├── IsolationWhyScreen.js       # Risk breakdown
    │   ├── IsolationSuggestionsScreen.js # Actionable tips
    │   ├── MobilityInsightsScreen.js   # GPS details
    │   ├── SocialInteractionScreen.js  # Communication details
    │   ├── BehaviourInsightsScreen.js  # Usage patterns
    │   └── ProximityExposureScreen.js  # Bluetooth/WiFi
    │
    └── components/
        ├── GlassCard.js                # UI component
        ├── MiniBarChart.js             # Chart component
        ├── SegmentedControl.js         # Tab component
        └── YearInPixels.js             # Calendar heatmap
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd ScreenMindApp
npm install
```

### 2. Build Android
```bash
npx react-native run-android
```

### 3. Grant Permissions
- **Location**: Settings → Apps → ScreenMind → Permissions → Location → Allow all the time
- **Bluetooth**: Auto-prompted
- **Usage Access**: Settings → Apps → Special Access → Usage Access → Enable ScreenMind

### 4. Start Tracking
```javascript
import { startLocationTracking } from './features/isolation/services/isolationCollector';

startLocationTracking();
```

### 5. View Results
Navigate to "Social Well-being" tab in app.

---

## 🔑 Key Features

### Mobility Features (GPS)
| Feature | Description | Formula |
|---------|-------------|---------|
| dailyDistanceMeters | Total distance traveled | Σ Haversine(p₁, p₂) |
| timeAtHomePct | % time within 100m of home | (t_home / t_total) × 100 |
| locationEntropy | Variety of places visited | -Σ p_i log(p_i) |
| transitions | Number of location changes | Count(dist > 50m) |
| radiusOfGyration | Spread of movement | √(Σ d²_centroid / n) |

### Communication Features (Metadata)
- callsPerDay
- uniqueContacts
- avgCallDuration
- smsPerDay
- silenceHours

### Behavior Features (Usage)
- nightUsageMinutes (11pm-7am)
- unlocks
- rhythmIrregularity

### Proximity Features
- bluetoothAvgDevices (nearby device count)
- wifiDiversity (network variety)

---

## 📊 Risk Scoring Algorithm

### Formula
```javascript
function computeIsolationRisk(features, prefs) {
  // Each category: 0-25 points
  mobility = computeMobilityScore(features);      // 0-25
  communication = computeCommScore(features);     // 0-25
  behavior = computeBehaviorScore(features);      // 0-25
  proximity = computeProximityScore(features);    // 0-25
  
  total = mobility + communication + behavior + proximity; // 0-100
  
  if (total < 34) return { score: total, label: "Low" };
  if (total < 67) return { score: total, label: "Moderate" };
  return { score: total, label: "High" };
}
```

### Normalization Example
```javascript
// Lower is worse (e.g., daily distance)
riskScore = (goodValue - actualValue) / (goodValue - badValue)
riskScore = clamp(riskScore, 0, 1) × 25

// Higher is worse (e.g., time at home)
riskScore = (actualValue - goodValue) / (badValue - goodValue)
riskScore = clamp(riskScore, 0, 1) × 25
```

### Thresholds (from literature)
- Daily distance: Good = 3000m, Bad = 300m
- Time at home: Good = 55%, Bad = 85%
- Unique contacts: Good = 6, Bad = 1
- Night usage: Good = 20min, Bad = 120min

---

## 🛡️ Privacy & Ethics

### Data Collection Principles
1. **Purpose Limitation**: Only for loneliness detection
2. **Data Minimization**: Only necessary features, no raw content
3. **User Control**: Granular toggles for each sensor
4. **Transparency**: Clear explanations of what/why
5. **On-Device Processing**: No data leaves the phone
6. **Informed Consent**: Required before collection starts

### What We DON'T Collect
❌ Message content (only count)
❌ Call recordings (only duration)
❌ Exact GPS coordinates long-term (aggregated daily)
❌ Bluetooth device identities (only count)
❌ WiFi network names (only diversity metric)

### What We DO Collect
✅ Daily distance traveled (meters)
✅ Time spent at home (percentage)
✅ Number of calls/SMS (count only)
✅ Screen time at night (minutes)
✅ Device unlock count
✅ Nearby Bluetooth device count

---

## 🔐 Required Permissions

### Android Manifest
```xml
<!-- Location -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<!-- Bluetooth -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />

<!-- Usage Stats -->
<uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" />

<!-- Foreground Service -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

<!-- Optional -->
<uses-permission android:name="android.permission.READ_CALL_LOG" />
<uses-permission android:name="android.permission.READ_SMS" />
```

### Runtime Permission Request
```javascript
import { requestAllEssentialPermissions } from './services/permissionHelper';

const perms = await requestAllEssentialPermissions();
if (perms.location && perms.backgroundLocation) {
  console.log("Ready to track!");
}
```

---

## 📖 Usage Examples

### Collect Features
```javascript
import { collectRealFeatures } from './services/isolationCollector';

const features = await collectRealFeatures();
console.log(features);
// {
//   dailyDistanceMeters: 2400,
//   timeAtHomePct: 62,
//   locationEntropy: 0.85,
//   unlocks: 47,
//   ...
// }
```

### Compute Risk Score
```javascript
import { computeIsolationRisk } from './services/isolationScoring';
import { getIsolationPrefs } from './services/isolationStorage';

const prefs = await getIsolationPrefs();
const risk = computeIsolationRisk(features, prefs);
console.log(risk);
// {
//   score: 48,
//   label: "Moderate",
//   breakdown: {
//     mobility: 12,
//     communication: 15,
//     behavior: 10,
//     proximity: 11
//   },
//   used: ["mobility", "behavior", "proximity"]
// }
```

### Save Daily Record
```javascript
import { upsertDailyIsolationRecord } from './services/isolationStorage';

await upsertDailyIsolationRecord({
  date: "2026-01-07",
  features: features,
  riskScore: 48,
  riskLabel: "Moderate",
  breakdown: risk.breakdown
});
```

### Generate Dummy Data (Testing)
```javascript
import { generateDummyFeatures } from './services/isolationCollector';

const testFeatures = generateDummyFeatures();
// Returns realistic random features for UI testing
```

---

## 🧪 Testing

### Unit Test Example (Jest)
```javascript
import { computeIsolationRisk } from '../isolationScoring';

test('Low risk for healthy patterns', () => {
  const features = {
    dailyDistanceMeters: 4000,  // Good
    timeAtHomePct: 50,          // Good
    uniqueContacts: 8,          // Good
    nightUsageMinutes: 15       // Good
  };
  
  const prefs = { gps: true, calls: true, usage: true, bluetooth: false };
  const risk = computeIsolationRisk(features, prefs);
  
  expect(risk.score).toBeLessThan(34);
  expect(risk.label).toBe("Low");
});
```

### Integration Test
```bash
# Start app
npx react-native run-android

# Grant permissions manually

# Wait 10 minutes (collect GPS data)

# Open IsolationOverviewScreen

# Verify:
# - Risk score displays
# - Feature cards populated
# - No crashes
```

---

## 🐛 Troubleshooting

### GPS features all 0
**Cause**: Location service not running
**Fix**:
```javascript
import { startLocationTracking } from './services/isolationCollector';
startLocationTracking();
```

### "UsageStatsBridge is null"
**Cause**: Usage Access permission not granted
**Fix**: Settings → Apps → Special Access → Usage Access → Enable ScreenMind

### Bluetooth scan returns 0
**Cause**: 
1. Bluetooth off
2. Permission not granted
3. No nearby devices

**Fix**: Enable Bluetooth, grant permission, test near other devices

### App crashes on launch
**Cause**: Native module registration issue
**Fix**:
```bash
cd android && ./gradlew clean
cd .. && npm run android
```

---

## 📚 Research References

### Key Papers
1. **Saeb et al. (2015)** - "Mobile phone sensor correlates of depressive symptom severity in daily-life behavior: An exploratory study"
2. **Nakamura et al. (2016)** - "Relationship between smartphone-based calling patterns and loneliness"
3. **Canzian & Musolesi (2015)** - "Trajectories of depression: Unobtrusive monitoring of depressive states"
4. **Wang et al. (2018)** - "Tracking depression dynamics in college students using mobile phone and wearable sensing"

### Loneliness Scales
- UCLA Loneliness Scale (Russell, 1996)
- De Jong Gierveld Loneliness Scale
- Social Network Index

---

## 🔮 Future Enhancements

### Short-Term (Progress → Final)
- [ ] Pilot study with 10-20 students
- [ ] Validate features against UCLA Loneliness Scale
- [ ] Refine thresholds based on labeled data
- [ ] Add personalized baselines

### Long-Term (Post-Project)
- [ ] LSTM for temporal pattern detection
- [ ] Federated learning across users
- [ ] Integration with wearables (heart rate, sleep)
- [ ] Call/SMS sentiment analysis (if opt-in)
- [ ] WiFi diversity implementation

---

## 👥 Contributing

### Code Style
- Use ESLint for JavaScript
- Follow Kotlin coding conventions
- Comment complex algorithms
- Write unit tests for scoring functions

### Adding New Features
1. Extract feature in `isolationCollector.js`
2. Add normalization in `isolationScoring.js`
3. Update UI in relevant screen
4. Document in IMPLEMENTATION_SUMMARY.md

---

## 📄 License

Part of ScreenMind research project. For academic use only.

---

## 🙏 Acknowledgments

- Research papers cited above
- React Native community
- University supervisors and panel

---

## 📞 Contact

For questions about this component:
- Project: ScreenMind Mental Health Detection
- Component: Social Isolation Detection (Part 2)
- Date: January 2026

---

**Status**: ✅ Ready for progress presentation and pilot testing
