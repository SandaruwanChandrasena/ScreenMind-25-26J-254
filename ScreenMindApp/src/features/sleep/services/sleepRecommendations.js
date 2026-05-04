/**
 * Sleep Recommendations Engine
 * 
 * Generates personalized, data-driven sleep recommendations based on:
 * - Risk breakdown (worst scoring component)
 * - Morning check-in symptoms
 * - 7-day trend analysis
 * - Duration thresholds
 * - Specific sensor data insights
 */

/**
 * Generate prioritized recommendations based on sleep session data
 * 
 * @param {object} summary - Current session summary from sleepRepository
 * @param {array} last7Sessions - Last 7 sessions for trend analysis
 * @param {object} riskResult - Risk score breakdown from computeDisruptionScore
 * @returns {array} Recommendations sorted by priority
 */
export function generateRecommendations(summary, last7Sessions = [], riskResult = {}) {
  const recommendations = [];
  
  if (!summary) return recommendations;

  // ─────────────────────────────────────────────────────────────────
  // 1. HIGH PRIORITY: Worst scoring component
  // ─────────────────────────────────────────────────────────────────
  
  if (summary.unlockCount > 5) {
    recommendations.push({
      priority: 'high',
      icon: '📱',
      title: 'Reduce night phone unlocks',
      description: `You unlocked your phone ${summary.unlockCount} times during sleep.`,
      detail: 'Each unlock disrupts your sleep cycle by triggering light exposure and mental stimulation.',
      action: 'Enable Do Not Disturb mode 30 minutes before bed',
      dataTriggered: `unlocks: ${summary.unlockCount}`,
    });
  }

  if ((summary.socialNotifCount || 0) > 8) {
    recommendations.push({
      priority: 'high',
      icon: '🔔',
      title: 'Limit social media notifications at night',
      description: `You received ${summary.socialNotifCount} social media notifications after 9PM.`,
      detail: 'Emotional content from social apps triggers cortisol release, delaying sleep onset.',
      action: 'Turn off Instagram, WhatsApp, TikTok notifications after 9PM',
      dataTriggered: `social notifs: ${summary.socialNotifCount}`,
    });
  }

  if ((summary.snoringTotalMinutes || 0) > 20) {
    recommendations.push({
      priority: 'high',
      icon: '😴',
      title: 'Address snoring pattern',
      description: `Snoring detected for ${summary.snoringTotalMinutes} minutes tonight.`,
      detail: 'Consistent snoring indicates partial airway obstruction, reducing sleep quality and oxygen intake.',
      action: 'Try sleeping on your side (reduces snoring by ~67% vs. back sleeping)',
      dataTriggered: `snoring: ${summary.snoringTotalMinutes}min`,
    });
  }

  if ((summary.screenOnCount || 0) > 6) {
    recommendations.push({
      priority: 'high',
      icon: '💻',
      title: 'Reduce pre-sleep screen time',
      description: `High screen activity detected (${summary.screenOnCount} wake events).`,
      detail: 'Blue light from screens suppresses melatonin, making it harder to fall asleep.',
      action: 'Put phone in another room 1 hour before bed',
      dataTriggered: `screen on: ${summary.screenOnCount}`,
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // 2. IMPORTANT: Duration-based insights
  // ─────────────────────────────────────────────────────────────────

  const hours = summary.durationMs / (1000 * 60 * 60);

  if (hours < 6) {
    recommendations.push({
      priority: 'important',
      icon: '⏰',
      title: 'You slept less than 6 hours',
      description: `Last night: ${hours.toFixed(1)} hours. Ideal range is 7–9 hours.`,
      detail: 'Chronic sleep deprivation impairs cognition, mood, and immune function.',
      action: 'Gradually shift your bedtime 15 minutes earlier to extend sleep duration',
      dataTriggered: `duration: ${hours.toFixed(1)}h`,
    });
  }

  if (hours > 9) {
    recommendations.push({
      priority: 'suggestion',
      icon: '😴',
      title: 'Long sleep duration detected',
      description: `Last night: ${hours.toFixed(1)} hours. This may indicate poor sleep quality.`,
      detail: 'Oversleeping can be a sign of depression, poor sleep efficiency, or insufficient deep sleep.',
      action: 'Evaluate morning quality check-in. Consider earlier wake times to improve daytime energy.',
      dataTriggered: `duration: ${hours.toFixed(1)}h`,
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // 3. IMPORTANT: Morning check-in symptom analysis
  // ─────────────────────────────────────────────────────────────────

  if (summary.checkIn) {
    if (summary.checkIn.sleep_quality < 5 && summary.checkIn.sleep_quality >= 0) {
      recommendations.push({
        priority: 'important',
        icon: '⭐',
        title: 'Your sleep quality rating was very low',
        description: `Self-reported quality: ${summary.checkIn.sleep_quality}/10.`,
        detail: 'Low quality sleep indicates your sleep environment or routine needs adjustment.',
        action: 'Try: dark room (blackout curtains), cool temperature (65–68°F), white noise',
        dataTriggered: `quality: ${summary.checkIn.sleep_quality}/10`,
      });
    }

    if (summary.checkIn.headache === 'Yes') {
      recommendations.push({
        priority: 'important',
        icon: '🤕',
        title: 'Morning headaches detected',
        description: 'You reported a morning headache today.',
        detail: 'Common causes: poor sleep quality, dehydration, tension, or sleep apnea.',
        action: 'Drink water upon waking, check your pillow/mattress comfort, see a doctor if persistent',
        dataTriggered: `symptom: headache`,
      });
    }

    if (summary.checkIn.dry_mouth === 'Yes') {
      recommendations.push({
        priority: 'suggestion',
        icon: '💧',
        title: 'Dry mouth reported',
        description: 'You woke up with dry mouth.',
        detail: 'Can indicate mouth breathing during sleep (often from congestion or sleep position).',
        action: 'Try nasal strips or saline spray before bed. Sleep on your side.',
        dataTriggered: `symptom: dry_mouth`,
      });
    }

    if (summary.checkIn.woke_up === 'Yes') {
      recommendations.push({
        priority: 'suggestion',
        icon: '😲',
        title: 'Frequent night awakenings',
        description: 'You reported waking during the night.',
        detail: 'Fragmented sleep reduces restorative deep sleep even if total duration is adequate.',
        action: 'Avoid caffeine after 2PM, keep room temperature cool, limit fluids before bed',
        dataTriggered: `symptom: woke_up`,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // 4. TREND INSIGHT: 7-day analysis
  // ─────────────────────────────────────────────────────────────────

  if (last7Sessions && last7Sessions.length >= 3) {
    const trendAnalysis = analyzeTrend(last7Sessions);

    if (trendAnalysis.isWorsening) {
      recommendations.push({
        priority: 'important',
        icon: '📉',
        title: `Your sleep has worsened this week`,
        description: trendAnalysis.description,
        detail: `Risk score trend: ${trendAnalysis.trendDetail}`,
        action: 'Consider a "sleep reset" weekend: consistent bedtime, no screens after 8PM, no caffeine',
        dataTriggered: `trend: worsening over ${last7Sessions.length} days`,
      });
    }

    if (trendAnalysis.isImproving) {
      recommendations.push({
        priority: 'suggestion',
        icon: '📈',
        title: `Great improvement this week!`,
        description: trendAnalysis.description,
        detail: `Risk score trend: ${trendAnalysis.trendDetail}`,
        action: 'Keep up your current routine! Consistency is key.',
        dataTriggered: `trend: improving over ${last7Sessions.length} days`,
      });
    }

    if (trendAnalysis.worstDay) {
      recommendations.push({
        priority: 'suggestion',
        icon: '📅',
        title: `Pattern detected: ${trendAnalysis.worstDay} is your worst night`,
        description: `Your average risk on ${trendAnalysis.worstDay}s is higher than other days.`,
        detail: 'This suggests a social or routine pattern (e.g., social jet lag, social media binging).',
        action: `Plan ahead for ${trendAnalysis.worstDay} night: digital detox or early bedtime`,
        dataTriggered: `pattern: ${trendAnalysis.worstDay}`,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // 5. GENERAL SUGGESTIONS (if no high-priority items)
  // ─────────────────────────────────────────────────────────────────

  if (recommendations.filter(r => r.priority === 'high').length === 0) {
    recommendations.push({
      priority: 'suggestion',
      icon: '🌙',
      title: 'Maintain your sleep routine',
      description: 'Your sleep metrics look stable.',
      detail: 'Consistency is the most powerful tool for improving sleep quality.',
      action: 'Keep the same bedtime and wake time, even on weekends',
      dataTriggered: `baseline: good sleep`,
    });
  }

  // Sort by priority: high → important → suggestion
  const priorityOrder = { high: 0, important: 1, suggestion: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

/**
 * Analyze 7-day sleep trend for pattern insights
 * @param {array} sessions - Last 7 sessions
 * @returns {object} Trend analysis with isWorsening, isImproving, worstDay, etc.
 */
function analyzeTrend(sessions) {
  if (!sessions || sessions.length < 2) {
    return { isWorsening: false, isImproving: false, worstDay: null };
  }

  // Get numeric risk scores (handle various formats)
  const scores = sessions.map(s => {
    if (typeof s.sleepScore === 'number') return s.sleepScore;
    if (typeof s.riskScore === 'number') return s.riskScore;
    return 50; // default middle score
  });

  const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
  const secondHalf = scores.slice(Math.floor(scores.length / 2));

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const isWorsening = avgSecond > avgFirst + 10; // Worse by >10 points
  const isImproving = avgSecond < avgFirst - 10; // Better by >10 points

  // Find worst day of week
  const dayMap = {};
  sessions.forEach(s => {
    const date = new Date(s.start || s.startTime);
    const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
    const score = typeof s.sleepScore === 'number' ? s.sleepScore : 50;

    if (!dayMap[day]) dayMap[day] = [];
    dayMap[day].push(score);
  });

  let worstDay = null;
  let worstAvg = 0;
  Object.entries(dayMap).forEach(([day, scores]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg > worstAvg) {
      worstAvg = avg;
      worstDay = day;
    }
  });

  return {
    isWorsening,
    isImproving,
    worstDay: isWorsening || isImproving ? worstDay : null,
    trendDetail: isWorsening
      ? `↗ worsened from ${avgFirst.toFixed(0)} to ${avgSecond.toFixed(0)}`
      : isImproving
      ? `↘ improved from ${avgFirst.toFixed(0)} to ${avgSecond.toFixed(0)}`
      : `stable at ${avgSecond.toFixed(0)}`,
    description: isWorsening
      ? 'Your average sleep quality has decreased over the past few days.'
      : isImproving
      ? 'Your average sleep quality has improved this week — great work!'
      : 'Your sleep metrics are relatively stable.',
  };
}

/**
 * Get priority color for UI rendering
 */
export function getPriorityColor(priority) {
  const colors = {
    high: '#ef4444',      // red
    important: '#f59e0b', // amber
    suggestion: '#22c55e', // green
  };
  return colors[priority] || '#666666';
}

/**
 * Get priority label for UI
 */
export function getPriorityLabel(priority) {
  const labels = {
    high: '🔴 High Priority',
    important: '🟡 Important',
    suggestion: '🟢 Suggestion',
  };
  return labels[priority] || priority;
}
