import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAHdG5D2KNgzrs7lZyeK0m2HM6yQbUg98Q",
  authDomain: "screenmind-project.firebaseapp.com",
  projectId: "screenmind-project",
  storageBucket: "screenmind-project.appspot.com", // ✅ FIXED
  messagingSenderId: "689257122168",
  appId: "1:689257122168:web:2b1afdbaffec41b170a08d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
