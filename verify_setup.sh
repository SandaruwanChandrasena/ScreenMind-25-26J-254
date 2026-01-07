#!/bin/bash

# ScreenMind Isolation Component - Setup Verification Script
# Run this to check if everything is properly configured

echo "🔍 ScreenMind Isolation Component - Setup Verification"
echo "========================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
WARN=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $2 - FILE MISSING: $1"
        ((FAIL++))
    fi
}

# Function to check directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $2 - DIRECTORY MISSING: $1"
        ((FAIL++))
    fi
}

# Function to check string in file
check_string() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $3"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠${NC} $3 - NOT FOUND IN: $1"
        ((WARN++))
    fi
}

echo "📁 Checking File Structure..."
echo "------------------------------"

# Native Modules
check_file "android/app/src/main/java/com/screenmindapp/isolation/LocationForegroundService.kt" "LocationForegroundService.kt"
check_file "android/app/src/main/java/com/screenmindapp/isolation/IsolationMetricsModule.kt" "IsolationMetricsModule.kt"
check_file "android/app/src/main/java/com/screenmindapp/isolation/IsolationMetricsPackage.kt" "IsolationMetricsPackage.kt"
check_file "android/app/src/main/java/com/screenmindapp/isolation/UsageStatsModule.kt" "UsageStatsModule.kt"
check_file "android/app/src/main/java/com/screenmindapp/isolation/UsageStatsPackage.kt" "UsageStatsPackage.kt"
check_file "android/app/src/main/java/com/screenmindapp/isolation/ServiceStarterModule.kt" "ServiceStarterModule.kt"
check_file "android/app/src/main/java/com/screenmindapp/isolation/ServiceStarterPackage.kt" "ServiceStarterPackage.kt"
check_file "android/app/src/main/java/com/screenmindapp/isolation/UnlockReceiver.kt" "UnlockReceiver.kt"
check_file "android/app/src/main/java/com/screenmindapp/isolation/DateKey.kt" "DateKey.kt"

echo ""

# JavaScript Services
check_file "src/features/isolation/services/isolationCollector.js" "isolationCollector.js"
check_file "src/features/isolation/services/isolationScoring.js" "isolationScoring.js"
check_file "src/features/isolation/services/isolationStorage.js" "isolationStorage.js"
check_file "src/features/isolation/services/permissionHelper.js" "permissionHelper.js"

echo ""

# Screens
check_file "src/features/isolation/screens/IsolationOverviewScreen.js" "IsolationOverviewScreen.js"
check_file "src/features/isolation/screens/IsolationPrivacyScreen.js" "IsolationPrivacyScreen.js"
check_file "src/features/isolation/screens/IsolationStatsScreen.js" "IsolationStatsScreen.js"
check_file "src/features/isolation/screens/IsolationTrendsScreen.js" "IsolationTrendsScreen.js"
check_file "src/features/isolation/screens/IsolationWhyScreen.js" "IsolationWhyScreen.js"

echo ""
echo "🔧 Checking Configuration..."
echo "------------------------------"

# AndroidManifest permissions
check_string "android/app/src/main/AndroidManifest.xml" "ACCESS_FINE_LOCATION" "Location permission in manifest"
check_string "android/app/src/main/AndroidManifest.xml" "ACCESS_BACKGROUND_LOCATION" "Background location in manifest"
check_string "android/app/src/main/AndroidManifest.xml" "BLUETOOTH_SCAN" "Bluetooth scan in manifest"
check_string "android/app/src/main/AndroidManifest.xml" "PACKAGE_USAGE_STATS" "Usage stats in manifest"
check_string "android/app/src/main/AndroidManifest.xml" "FOREGROUND_SERVICE" "Foreground service in manifest"
check_string "android/app/src/main/AndroidManifest.xml" "LocationForegroundService" "Service registered in manifest"
check_string "android/app/src/main/AndroidManifest.xml" "UnlockReceiver" "Receiver registered in manifest"

echo ""

# MainApplication packages
check_string "android/app/src/main/java/com/screenmindapp/MainApplication.kt" "UsageStatsPackage" "UsageStatsPackage in MainApplication"
check_string "android/app/src/main/java/com/screenmindapp/MainApplication.kt" "ServiceStarterPackage" "ServiceStarterPackage in MainApplication"
check_string "android/app/src/main/java/com/screenmindapp/MainApplication.kt" "IsolationMetricsPackage" "IsolationMetricsPackage in MainApplication"

echo ""

# Package.json dependencies
check_string "package.json" "react-native-ble-plx" "react-native-ble-plx dependency"
check_string "package.json" "react-native-permissions" "react-native-permissions dependency"
check_string "package.json" "@react-native-async-storage/async-storage" "AsyncStorage dependency"

echo ""
echo "📊 Checking Function Implementations..."
echo "----------------------------------------"

# Check key functions exist
check_string "src/features/isolation/services/isolationCollector.js" "collectRealFeatures" "collectRealFeatures() function"
check_string "src/features/isolation/services/isolationCollector.js" "generateDummyFeatures" "generateDummyFeatures() function"
check_string "src/features/isolation/services/isolationCollector.js" "scanBluetoothCountOnce" "scanBluetoothCountOnce() function"
check_string "src/features/isolation/services/isolationCollector.js" "startLocationTracking" "startLocationTracking() function"

check_string "src/features/isolation/services/isolationScoring.js" "computeIsolationRisk" "computeIsolationRisk() function"

check_string "src/features/isolation/services/permissionHelper.js" "requestAllEssentialPermissions" "requestAllEssentialPermissions() function"

check_string "android/app/src/main/java/com/screenmindapp/isolation/IsolationMetricsModule.kt" "getGpsFeaturesToday" "getGpsFeaturesToday() native method"
check_string "android/app/src/main/java/com/screenmindapp/isolation/IsolationMetricsModule.kt" "getUnlockCountToday" "getUnlockCountToday() native method"
check_string "android/app/src/main/java/com/screenmindapp/isolation/IsolationMetricsModule.kt" "computeGpsFeatures" "computeGpsFeatures() native method"

echo ""
echo "📝 Checking Documentation..."
echo "------------------------------"

# Check for docs in parent directory if not in current
if [ -f "IMPLEMENTATION_SUMMARY.md" ]; then
    check_file "IMPLEMENTATION_SUMMARY.md" "Implementation Summary"
elif [ -f "../IMPLEMENTATION_SUMMARY.md" ]; then
    check_file "../IMPLEMENTATION_SUMMARY.md" "Implementation Summary (parent dir)"
else
    echo -e "${RED}✗${NC} Implementation Summary - NOT FOUND"
    ((FAIL++))
fi

if [ -f "VIVA_QUICK_REFERENCE.md" ]; then
    check_file "VIVA_QUICK_REFERENCE.md" "Viva Quick Reference"
elif [ -f "../VIVA_QUICK_REFERENCE.md" ]; then
    check_file "../VIVA_QUICK_REFERENCE.md" "Viva Quick Reference (parent dir)"
else
    echo -e "${RED}✗${NC} Viva Quick Reference - NOT FOUND"
    ((FAIL++))
fi

if [ -f "TESTING_CHECKLIST.md" ]; then
    check_file "TESTING_CHECKLIST.md" "Testing Checklist"
elif [ -f "../TESTING_CHECKLIST.md" ]; then
    check_file "../TESTING_CHECKLIST.md" "Testing Checklist (parent dir)"
else
    echo -e "${RED}✗${NC} Testing Checklist - NOT FOUND"
    ((FAIL++))
fi

check_file "src/features/isolation/README.md" "Component README"

echo ""
echo "======================================================"
echo "📊 Summary"
echo "======================================================"
echo -e "${GREEN}Passed:${NC} $PASS"
echo -e "${YELLOW}Warnings:${NC} $WARN"
echo -e "${RED}Failed:${NC} $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    echo "Your isolation component is properly set up."
    echo ""
    echo "Next steps:"
    echo "1. Run: npm run android"
    echo "2. Grant all permissions"
    echo "3. Test feature collection"
    echo "4. Review TESTING_CHECKLIST.md"
    exit 0
else
    echo -e "${RED}✗ Some checks failed.${NC}"
    echo "Please fix the missing files/configurations above."
    echo "Refer to IMPLEMENTATION_SUMMARY.md for details."
    exit 1
fi
