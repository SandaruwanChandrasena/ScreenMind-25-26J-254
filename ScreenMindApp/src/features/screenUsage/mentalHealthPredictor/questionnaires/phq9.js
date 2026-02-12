// src/features/screenUsage/mentalHealthPredictor/questionnaires/phq9.js

export const PHQ9_OPTIONS = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" },
];

export const PHQ9_QUESTIONS = [
  {
    id: "phq9_q1",
    text: "Little interest or pleasure in doing things",
  },
  {
    id: "phq9_q2",
    text: "Feeling down, depressed, or hopeless",
  },
  {
    id: "phq9_q3",
    text: "Trouble falling or staying asleep, or sleeping too much",
  },
  {
    id: "phq9_q4",
    text: "Feeling tired or having little energy",
  },
  {
    id: "phq9_q5",
    text: "Poor appetite or overeating",
  },
  {
    id: "phq9_q6",
    text: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
  },
  {
    id: "phq9_q7",
    text: "Trouble concentrating on things, such as reading or watching TV",
  },
  {
    id: "phq9_q8",
    text: "Moving or speaking so slowly that other people could have noticed, or the opposite — being fidgety/restless",
  },
  {
    id: "phq9_q9",
    text: "Thoughts that you would be better off dead, or of hurting yourself in some way",
    // ⚠️ We keep it clinically phrased and do NOT add any detail.
    isSafetyItem: true,
  },
];
