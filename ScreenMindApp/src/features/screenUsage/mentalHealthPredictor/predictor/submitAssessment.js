import { doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../services/firebase/firestore";

import { scorePHQ9Total, scoreGAD7Total } from "../questionnaires/scoring";

/**
 * Writes:
 *  1) users/{uid}/dailyUsage/{dateKey}  (merge)
 *  2) users/{uid}/assessments/{assessmentId} (create) -> triggers Cloud Function
 *
 * @param {Object} params
 * @param {string} params.uid - Firebase Auth user id
 * @param {string} params.dateKey - "YYYY-MM-DD"
 * @param {number[]} params.phq9Answers - length 9, values 0..3
 * @param {number[]} params.gad7Answers - length 7, values 0..3
 * @param {Object} [params.usageFeatures] - general screen usage features for that day
 *
 * @returns {Promise<{assessmentId: string, phq9Total: number, gad7Total: number}>}
 */
export async function submitAssessment({
  uid,
  dateKey,
  phq9Answers,
  gad7Answers,
  usageFeatures = null,
}) {
  if (!uid) throw new Error("submitAssessment: uid is required");
  if (!dateKey) throw new Error("submitAssessment: dateKey is required (YYYY-MM-DD)");
  if (!Array.isArray(phq9Answers) || phq9Answers.length !== 9) {
    throw new Error("submitAssessment: phq9Answers must be an array of length 9");
  }
  if (!Array.isArray(gad7Answers) || gad7Answers.length !== 7) {
    throw new Error("submitAssessment: gad7Answers must be an array of length 7");
  }

  const phq9Total = scorePHQ9Total(phq9Answers);
  const gad7Total = scoreGAD7Total(gad7Answers);

  // 1) Save daily usage

  if (usageFeatures && typeof usageFeatures === "object") {
    const usageRef = doc(db, "users", uid, "dailyUsage", dateKey);

    await setDoc(
      usageRef,
      {
        ...usageFeatures,
        dateKey,
        updatedAt: serverTimestamp(),
        createdAt: usageFeatures.createdAt ?? serverTimestamp(),
      },
      { merge: true }
    );
  }

  // 2) Create assessment doc 
  
  const assessmentsCol = collection(db, "users", uid, "assessments");

  const assessmentPayload = {
    type: "PHQ9_GAD7",
    dateKey,

    phq9Answers,
    gad7Answers,
    phq9Total,
    gad7Total,

    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(assessmentsCol, assessmentPayload);

  return { assessmentId: docRef.id, phq9Total, gad7Total };
}
