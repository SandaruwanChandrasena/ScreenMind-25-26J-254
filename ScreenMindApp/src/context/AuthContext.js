import React, { createContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';

export const AuthContext = createContext(null);

// ✅ AsyncStorage key — used by headlessTask.js + smFirebase.service.js
export const USER_ID_KEY = 'current_user_id';

export const AuthProvider = ({ children }) => {
  const auth = getAuth();

  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // ✅ Convert Firebase user object -> plain JS object (react state friendly)
  const mapUser = u => {
    if (!u) return null;
    return {
      uid: u.uid,
      email: u.email || '',
      displayName: u.displayName || '',
      photoURL: u.photoURL || '',
    };
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      setUser(mapUser(currentUser));

      if (currentUser) {
        // ✅ Save UID to AsyncStorage every time auth state changes
        // This makes it available in headlessTask.js (background task)
        await AsyncStorage.setItem(USER_ID_KEY, currentUser.uid);
        console.log(`✅ User ID saved to AsyncStorage: ${currentUser.uid}`);
      } else {
        // ✅ Clear UID when user signs out
        await AsyncStorage.removeItem(USER_ID_KEY);
        console.log('🚪 User signed out — UID cleared from AsyncStorage');
      }

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
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    if (name) {
      await updateProfile(userCredential.user, { displayName: name });
    }

    try {
      await firestore()
        .collection('users')
        .doc(userCredential.user.uid)
        .set(
          {
            name: name || '',
            email: email || '',
            photoURL: userCredential.user.photoURL || '',
            createdAt: firestore.FieldValue.serverTimestamp?.()
              ? firestore.FieldValue.serverTimestamp()
              : firestore.Timestamp.now(),
          },
          { merge: true },
        );
    } catch (e) {
      console.log('Firestore user doc write skipped:', e?.message);
    }

    await refreshUser();
    return auth.currentUser;
  };

  const signIn = async ({ email, password }) => {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    await refreshUser();
    return userCredential.user;
  };

  const updateName = async newName => {
    if (!auth.currentUser) throw new Error('No user currently signed in.');

    await updateProfile(auth.currentUser, { displayName: newName });

    try {
      await firestore()
        .collection('users')
        .doc(auth.currentUser.uid)
        .set(
          {
            name: newName,
            updatedAt: firestore.FieldValue.serverTimestamp?.()
              ? firestore.FieldValue.serverTimestamp()
              : firestore.Timestamp.now(),
          },
          { merge: true },
        );
    } catch (e) {
      console.log('Firestore name write skipped:', e?.message);
    }

    await refreshUser();
  };

  const updateProfilePhoto = async localUri => {
    if (!auth.currentUser) throw new Error('No user currently signed in.');

    const uid = auth.currentUser.uid;
    const filename = `profile_${Date.now()}.jpg`;
    const ref = storage().ref(`users/${uid}/${filename}`);

    await ref.putFile(localUri);
    const photoURL = await ref.getDownloadURL();

    await updateProfile(auth.currentUser, { photoURL });

    try {
      await firestore()
        .collection('users')
        .doc(uid)
        .set(
          {
            photoURL,
            updatedAt: firestore.FieldValue.serverTimestamp?.()
              ? firestore.FieldValue.serverTimestamp()
              : firestore.Timestamp.now(),
          },
          { merge: true },
        );
    } catch (e) {
      console.log('Firestore photo write skipped:', e?.message);
    }

    await refreshUser();
    return photoURL;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    // ✅ Clear all user-specific local data on sign out
    await AsyncStorage.multiRemove([
      'current_user_id',
      'latest_sm_analysis',
      'sm_message_buffer',
      'sm_alert_cooldown',
      'sm_overlay_trigger',
    ]);
    console.log('🧹 AsyncStorage cleared on sign out');
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
