export function sumScore(answers = {}, questionIds = []) {
  return questionIds.reduce((total, id) => total + (Number(answers[id]) || 0), 0);
}

export function phq9Severity(score) {
  if (score <= 4) return { label: 'Minimal', level: 0 };
  if (score <= 9) return { label: 'Mild', level: 1 };
  if (score <= 14) return { label: 'Moderate', level: 2 };
  if (score <= 19) return { label: 'Moderately severe', level: 3 };
  return { label: 'Severe', level: 4 };
}

export function gad7Severity(score) {
  if (score <= 4) return { label: 'Minimal', level: 0 };
  if (score <= 9) return { label: 'Mild', level: 1 };
  if (score <= 14) return { label: 'Moderate', level: 2 };
  return { label: 'Severe', level: 3 };
}

export function combinedQuestionnaireRisk({ phq9Score, gad7Score }) {
  const normalizedPHQ9 = Math.min(phq9Score / 27, 1);
  const normalizedGAD7 = Math.min(gad7Score / 21, 1);
  const risk01 = 0.6 * normalizedPHQ9 + 0.4 * normalizedGAD7;
  let label = 'Low';
  if (risk01 >= 0.33 && risk01 < 0.66) label = 'Moderate';
  if (risk01 >= 0.66) label = 'High';
  return { risk01, label };
}

// ✅ Added: used by submitAssessment.js
export function scorePHQ9Total(answers = []) {
  return answers.reduce((sum, val) => sum + (Number(val) || 0), 0);
}

export function scoreGAD7Total(answers = []) {
  return answers.reduce((sum, val) => sum + (Number(val) || 0), 0);
}