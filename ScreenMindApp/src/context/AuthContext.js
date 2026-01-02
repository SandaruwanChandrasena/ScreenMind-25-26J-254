import React, { createContext, useEffect, useState } from "react";

import storage from "@react-native-firebase/storage";
import firestore from "@react-native-firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
} from "@react-native-firebase/auth";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const auth = getAuth();

  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // ✅ Convert Firebase user object -> plain JS object (react state friendly)
  const mapUser = (u) => {
    if (!u) return null;
    return {
      uid: u.uid,
      email: u.email || "",
      displayName: u.displayName || "",
      photoURL: u.photoURL || "",
    };
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(mapUser(currentUser));
      if (initializing) setInitializing(false);
    });

    return unsubscribe;
  }, [auth, initializing]);

  const refreshUser = async () => {
    if (!auth.currentUser) return null;
    await auth.currentUser.reload();
    setUser(mapUser(auth.currentUser));
    return auth.currentUser;
  };

  const signUp = async ({ name, email, password }) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    if (name) {
      await updateProfile(userCredential.user, { displayName: name });
    }

    try {
      await firestore()
        .collection("users")
        .doc(userCredential.user.uid)
        .set(
          {
            name: name || "",
            email: email || "",
            photoURL: userCredential.user.photoURL || "",
            createdAt: firestore.FieldValue.serverTimestamp?.()
              ? firestore.FieldValue.serverTimestamp()
              : firestore.Timestamp.now(),
          },
          { merge: true }
        );
    } catch (e) {
      console.log("Firestore user doc write skipped:", e?.message);
    }

    await refreshUser();
    return auth.currentUser;
  };

  const signIn = async ({ email, password }) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await refreshUser();
    return userCredential.user;
  };

  const updateName = async (newName) => {
    if (!auth.currentUser) throw new Error("No user currently signed in.");

    await updateProfile(auth.currentUser, { displayName: newName });

    try {
      await firestore()
        .collection("users")
        .doc(auth.currentUser.uid)
        .set(
          {
            name: newName,
            updatedAt: firestore.FieldValue.serverTimestamp?.()
              ? firestore.FieldValue.serverTimestamp()
              : firestore.Timestamp.now(),
          },
          { merge: true }
        );
    } catch (e) {
      console.log("Firestore name write skipped:", e?.message);
    }

    await refreshUser(); // ✅ UI updates immediately
  };

  const updateProfilePhoto = async (localUri) => {
    if (!auth.currentUser) throw new Error("No user currently signed in.");

    const uid = auth.currentUser.uid;

    // ✅ unique name to avoid caching issues
    const filename = `profile_${Date.now()}.jpg`;
    const ref = storage().ref(`users/${uid}/${filename}`);

    await ref.putFile(localUri);
    const photoURL = await ref.getDownloadURL();

    await updateProfile(auth.currentUser, { photoURL });

    try {
      await firestore()
        .collection("users")
        .doc(uid)
        .set(
          {
            photoURL,
            updatedAt: firestore.FieldValue.serverTimestamp?.()
              ? firestore.FieldValue.serverTimestamp()
              : firestore.Timestamp.now(),
          },
          { merge: true }
        );
    } catch (e) {
      console.log("Firestore photo write skipped:", e?.message);
    }

    await refreshUser(); // ✅ UI updates immediately
    return photoURL;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        signUp,
        signIn,
        signOut,
        updateName,
        updateProfilePhoto,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
