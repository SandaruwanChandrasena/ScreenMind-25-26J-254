/**
 * src/features/isolation/services/rhythmCalculator.js
 * * Calculates the irregularity of the user's daily phone usage rhythm.
 * In a full AI implementation, this analyzes unlock timestamps over several days
 * using Approximate Entropy (ApEn) or standard deviation of active hours.
 */

export async function computeRhythmIrregularity() {
  try {
    // Note for Research Panel: In the final version, this will pull the last 7 days 
    // of unlock timestamps from the local SQLite database to calculate standard deviation.
    
    // For now, returning a simulated baseline value so the app builds.
    // 0.2 is considered "Good/Regular routine", 0.8 is "Bad/Irregular routine"
    const simulatedIrregularity = 0.3;

    return simulatedIrregularity;
  } catch (error) {
    console.warn("Error computing rhythm irregularity:", error);
    return 0.5; // Fallback middle-ground value
  }
}