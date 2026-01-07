# Quick Viva Reference - Social Isolation Detection Component

## 🎯 One-Sentence Summary
"My component detects social isolation and loneliness risk using smartphone mobility, communication metadata, proximity sensing, and phone usage behavior, presenting explainable insights while preserving user privacy."

---

## 📊 What I Implemented

### Native Layer (Android/Kotlin)
1. **LocationForegroundService** - Background GPS collection (5 min intervals)
2. **IsolationMetricsModule** - Computes GPS features (distance, entropy, etc.)
3. **UsageStatsModule** - Screen time tracking
4. **UnlockReceiver** - Counts device unlocks
5. **ServiceStarterModule** - Service control

### JavaScript Layer
1. **isolationCollector.js** - Feature collection from all sensors
2. **isolationScoring.js** - Risk scoring algorithm (0-100)
3. **isolationStorage.js** - Data persistence
4. **permissionHelper.js** - Permission management
5. **8 UI screens** - Dashboard, stats, trends, insights

---

## 🔑 15+ Features Collected

### Mobility (5 features)
- Daily distance, Time at home %, Location entropy, Transitions, Radius of gyration

### Communication (5 features)
- Calls/day, Unique contacts, Avg call duration, SMS/day, Silence hours

### Behavior (3 features)
- Night usage, Unlocks, Rhythm irregularity

### Proximity (2 features)
- Bluetooth devices, WiFi diversity

---

## 🛡️ Privacy Measures

✅ No raw GPS stored (only daily aggregates)
✅ No call/SMS content (metadata only)
✅ No Bluetooth device IDs
✅ On-device processing
✅ User can disable any sensor
✅ Data deletion anytime

---

## 🎓 Key Viva Answers

### "Why these features?"
- **Research-backed**: Saeb et al. (mobility-depression), Nakamura et al. (communication-mental health)
- **Non-invasive**: Passive collection, no user input required
- **Complementary**: Multiple modalities reduce false positives

### "How do you ensure privacy?"
- All processing on-device
- No content, only metadata
- Aggregated daily (not real-time)
- Transparent to user
- Full control via toggles

### "How accurate is it?"
- Currently: Algorithm based on literature thresholds
- Validation plan: 10-20 student pilot + UCLA Loneliness Scale
- Will refine with labeled data
- Multi-day trends more reliable than single-day

### "What about introverts?"
- System detects **changes**, not absolute levels
- Personalized baselines over time
- Focus on sudden drops in social activity
- Future: User can set their "normal" range

### "What's innovative?"
1. **Multi-modal fusion** - 4 sensor types combined
2. **Explainable AI** - User sees exact reasons
3. **Privacy-first** - No cloud, no raw data
4. **Non-clinical** - Early warning, not diagnosis
5. **User control** - Granular permission toggles

---

## 📈 Risk Scoring

```
Total = (Mobility×25%) + (Communication×25%) + (Behavior×25%) + (Proximity×25%)

0-33: Low Risk (Green)
34-66: Moderate Risk (Yellow)  
67-100: High Risk (Red)
```

**Example breakdown shown to user:**
- "Low movement detected (1.2km vs 3km baseline)"
- "Fewer unique contacts (2 vs 6 baseline)"
- "High night usage (95 min vs 20 min baseline)"

---

## 🔐 Permissions Needed

### Essential
- FINE_LOCATION + BACKGROUND_LOCATION
- BLUETOOTH_SCAN
- PACKAGE_USAGE_STATS
- FOREGROUND_SERVICE

### Optional
- READ_CALL_LOG
- READ_SMS
- ACCESS_WIFI_STATE

---

## 🚀 How It Works (Demo Flow)

1. **User opens app** → Privacy screen explains data collection
2. **Grants permissions** → Location, Bluetooth, Usage Access
3. **Background service starts** → GPS collected every 5 min
4. **Daily processing** → Features extracted, risk computed
5. **Dashboard shows**:
   - Risk: Moderate (48/100)
   - "Low movement + reduced social diversity"
   - 4 highlight cards with key metrics
6. **User taps "Why?"** → Detailed breakdown with graphs
7. **User taps "Suggestions"** → Actionable tips

---

## 📱 Demo Preparation

### If permissions granted:
- Show real data on IsolationOverviewScreen
- Walk through Stats → Trends → Why screens
- Explain each metric card

### If no permissions (backup):
- Use `generateDummyFeatures()` for demo
- Explain what real data would show
- Show permission request flow

---

## 🎯 Strengths to Highlight

1. ✅ **Complete implementation** - Native + JS + UI all working
2. ✅ **Privacy-preserving** - No raw sensitive data stored
3. ✅ **Explainable** - User sees exact reasons for risk
4. ✅ **Research-backed** - Features from published studies
5. ✅ **User-centric** - Full control, transparent operation
6. ✅ **Scalable** - Ready for pilot study

---

## ⚠️ Limitations (Be Honest)

1. **Not validated yet** - Need pilot study with labeled data
2. **Thresholds are estimates** - From literature, will refine
3. **No personalization yet** - Future: learn individual baselines
4. **Communication requires opt-in** - Many won't grant call/SMS access
5. **Battery impact** - GPS every 5 min (acceptable but notable)

---

## 🔮 Future Work

### Immediate (Progress → Final)
1. Pilot study with 10-20 students
2. Collect labeled data (UCLA Loneliness Scale)
3. Validate feature importance
4. Refine thresholds

### Advanced (Post-project)
1. LSTM for temporal patterns
2. Personalized baselines
3. Federated learning (privacy + collective intelligence)
4. Integration with other components (sleep, social media)

---

## 📚 Key Citations

1. **Saeb et al., 2015** - GPS patterns predict depression
2. **Nakamura et al., 2016** - Smartphone logs detect loneliness
3. **Canzian & Musolesi, 2015** - Trajectories of depression
4. **Russell, 1996** - UCLA Loneliness Scale
5. **WHO, 2021** - Social isolation as health risk

---

## 💬 Confident Closing Statement

> "I have successfully implemented all core functionality for social isolation detection:
> 
> - Native Android modules collect privacy-preserving behavioral data
> - JavaScript services extract 15+ research-backed features
> - A weighted scoring algorithm provides explainable risk assessment
> - 8 UI screens present insights in an understandable way
> - Users maintain full control via granular permissions
> 
> The system is ready for pilot testing. Next phase: validate with real users using established loneliness scales, then refine the model based on labeled data. This approach balances innovation with ethical responsibility."

---

## ❓ Anticipated Hard Questions

### "How is this different from existing apps?"

**Answer**: Most mental health apps rely on self-reporting or focus on single modalities (e.g., only screen time). My approach:
1. Passive multi-modal sensing (no user burden)
2. Focuses on **loneliness/isolation** specifically (often overlooked)
3. Explainable risk scores (not black-box)
4. Privacy-first design (on-device, no cloud)
5. Research-backed features (not arbitrary metrics)

### "Can't users fake this by just walking around?"

**Answer**: Valid concern, but:
1. Multiple features checked (hard to fake all)
2. Patterns matter more than single-day spikes
3. Communication + proximity add objective measures
4. Intent is early warning, not enforcement
5. Users motivated to be honest (it's for their benefit)

### "What if someone has a legitimate reason for low mobility?"

**Answer**: Great point. System should:
1. Allow user context input ("I'm sick this week")
2. Look for **changes** from personal baseline, not absolutes
3. Combine with other signals (if mobility low BUT communication high = less concerning)
4. Provide suggestions, not diagnoses
5. Future: Disability-aware thresholds

### "Isn't this creepy/invasive?"

**Answer**: Ethical design principles:
1. **Transparency**: User sees exactly what's collected
2. **Consent**: Granular opt-in for each sensor
3. **Control**: Can disable anytime, delete data
4. **Purpose limitation**: Only for loneliness detection
5. **On-device**: No corporate tracking
6. **Notification**: Persistent reminder when collecting

---

**Print this out. Keep it with you during the viva. You've got this! 🚀**
