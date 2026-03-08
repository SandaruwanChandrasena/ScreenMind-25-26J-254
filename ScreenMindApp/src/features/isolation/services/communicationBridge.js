/**
 * Communication Stats Bridge
 * 
 * Provides access to call and SMS metadata for social interaction analysis.
 * Privacy: Only aggregated metadata (counts, durations, diversity) - no content.
 */

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

const { CommunicationStats } = NativeModules;

function emptyCommunicationStats() {
  return {
    callsPerDay: 0,
    avgCallDurationSeconds: 0,
    uniqueContacts: 0,
    smsCountPerDay: 0,
    interactionSilenceHours: 0,
  };
}

if (!CommunicationStats) {
  console.warn('⚠️ CommunicationStats native module not found');
}

/**
 * Request READ_CALL_LOG and READ_SMS permissions
 * @returns {Promise<boolean>} true if both granted
 */
export async function requestCommunicationPermissions() {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
    ]);

    const callLogGranted = results[PermissionsAndroid.PERMISSIONS.READ_CALL_LOG] === 'granted';
    const smsGranted = results[PermissionsAndroid.PERMISSIONS.READ_SMS] === 'granted';

    return callLogGranted && smsGranted;
  } catch (e) {
    console.warn('Permission request error:', e);
    return false;
  }
}

/**
 * Check if communication permissions are granted
 * @returns {Promise<{callLog: boolean, sms: boolean}>}
 */
export async function checkCommunicationPermissions() {
  if (Platform.OS !== 'android' || !CommunicationStats) {
    return { callLog: false, sms: false };
  }

  try {
    const [callLog, sms] = await Promise.all([
      CommunicationStats.hasCallLogPermission(),
      CommunicationStats.hasSmsPermission(),
    ]);

    return { callLog, sms };
  } catch (e) {
    console.warn('Check permissions error:', e);
    return { callLog: false, sms: false };
  }
}

/**
 * Get communication statistics (7-day averages)
 * @returns {Promise<CommunicationData | null>}
 * 
 * @typedef {Object} CommunicationData
 * @property {number} callsPerDay - Average calls per day (last 7 days)
 * @property {number} avgCallDurationSeconds - Average call duration in seconds
 * @property {number} uniqueContacts - Unique contacts (last 7 days)
 * @property {number} smsCountPerDay - Average SMS per day (last 7 days)
 * @property {number} interactionSilenceHours - Hours since last call/SMS
 */
export async function getCommunicationStats() {
  if (Platform.OS !== 'android' || !CommunicationStats) {
    return null;
  }

  try {
    const stats = await CommunicationStats.getCommunicationStats();
    return stats;
  } catch (e) {
    console.warn('Get communication stats error:', e);
    return null;
  }
}

/**
 * Get communication stats with permission check
 * Automatically requests permissions if needed
 * @returns {Promise<CommunicationData | null>}
 */
export async function getCommunicationStatsWithPermission() {
  const perms = await checkCommunicationPermissions();
  const hasAllPermissions = perms.callLog && perms.sms;
  
  if (!hasAllPermissions) {
    const granted = await requestCommunicationPermissions();
    if (!granted) {
      if (__DEV__) {
        console.warn('[C2][Communication] Permissions not granted', perms);
      }
      return {
        ...emptyCommunicationStats(),
        _meta: {
          permissionDenied: true,
          permissionState: perms,
        },
      };
    }
  }

  const stats = await getCommunicationStats();
  if (!stats) {
    return {
      ...emptyCommunicationStats(),
      _meta: {
        unavailable: true,
        permissionDenied: false,
      },
    };
  }

  return {
    ...emptyCommunicationStats(),
    ...stats,
    _meta: {
      permissionDenied: false,
      permissionState: { callLog: true, sms: true },
    },
  };
}
