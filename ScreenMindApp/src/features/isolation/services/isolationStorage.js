import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@screenmind_isolation_history';

/**
 * Save daily isolation data
 * @param {Object} data - { date: 'YYYY-MM-DD', score: number, risk: string, ... }
 */
export async function saveDailyIsolation(data) {
  try {
    const history = await getDailyIsolationHistory();
    const dateKey = data.date || new Date().toISOString().split('T')[0];
    
    // Update or add entry for this date
    const updated = [...history.filter(item => item.date !== dateKey), data];
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error saving daily isolation:', error);
    return [];
  }
}

/**
 * Get all daily isolation history
 * @returns {Array} Array of daily isolation records
 */
export async function getDailyIsolationHistory() {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting isolation history:', error);
    return [];
  }
}

/**
 * Get isolation data for a specific date range
 * @param {number} days - Number of days to retrieve (e.g., 7 for week, 30 for month)
 * @returns {Array} Filtered array of daily isolation records
 */
export async function getIsolationHistoryByRange(days) {
  try {
    const history = await getDailyIsolationHistory();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return history.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= cutoffDate;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  } catch (error) {
    console.error('Error getting isolation history by range:', error);
    return [];
  }
}

/**
 * Clear all isolation history
 */
export async function clearIsolationHistory() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing isolation history:', error);
    return false;
  }
}
