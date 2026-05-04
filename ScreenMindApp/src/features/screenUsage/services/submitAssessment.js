import { doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../services/firebase/firestore";

// ✅ Fixed import path
import { scorePHQ9Total, scoreGAD7Total } from "./scoring";

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