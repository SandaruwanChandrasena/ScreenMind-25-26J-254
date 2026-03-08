import { getApp } from '@react-native-firebase/app';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_KEY = '@screenmind_sm_journal_entries_v1';

// ─────────────────────────────────────────────────────────────
// ✅ Get current user ID from AsyncStorage
// ─────────────────────────────────────────────────────────────
async function getUserId() {
  try {
    const uid = await AsyncStorage.getItem('current_user_id');
    return uid || 'test_user_123';
  } catch (e) {
    return 'test_user_123';
  }
}

// ─────────────────────────────────────────────────────────────
// ✅ SAVE journal entry to Firebase + AsyncStorage backup
//
// Firestore path:
//   users/{user_id}/journal_entries/{auto_id}
//
// Entry shape saved:
//   text, mood, createdAt, sentiment (if analyzed)
// ─────────────────────────────────────────────────────────────
export async function saveJournalToFirebase(entry) {
  try {
    const userId = await getUserId();
    const db = getFirestore(getApp());

    // Build the document
    const doc_data = {
      text: entry.text,
      mood: entry.mood || null,
      createdAt: entry.createdAt || new Date().toISOString(),
      sentiment: entry.sentiment || null, // from analyzeJournalText() if available
    };

    // Save to Firestore → returns doc reference with auto ID
    const colRef = collection(db, 'users', userId, 'journal_entries');
    const docRef = await addDoc(colRef, doc_data);

    console.log(`✅ Journal saved to Firebase: ${docRef.id}`);

    // Also save locally — store docId so we can delete later
    const entryWithId = { ...entry, firebaseId: docRef.id };
    await _syncLocalStorage(userId, entryWithId, 'add');

    return { success: true, firebaseId: docRef.id };
  } catch (e) {
    console.log('❌ Firebase journal save error:', e.message);

    // Fallback — save locally only so user doesn't lose data
    await _syncLocalStorage(null, entry, 'add');
    return { success: false, firebaseId: null };
  }
}

// ─────────────────────────────────────────────────────────────
// ✅ LOAD all journal entries from Firebase
// Falls back to AsyncStorage if Firebase fails
// ─────────────────────────────────────────────────────────────
export async function loadJournalFromFirebase() {
  try {
    const userId = await getUserId();
    const db = getFirestore(getApp());

    console.log(`📓 Loading journal entries for user: ${userId}`);

    const colRef = collection(db, 'users', userId, 'journal_entries');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('📭 No journal entries in Firebase');
      return [];
    }

    // Map docs → include Firestore doc ID as firebaseId
    const entries = snapshot.docs.map(d => ({
      id: d.id, // local UI key
      firebaseId: d.id, // same — Firestore doc ID
      ...d.data(),
    }));

    console.log(`✅ Loaded ${entries.length} journal entries from Firebase`);

    // Sync to local storage as offline backup
    await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(entries));

    return entries;
  } catch (e) {
    console.log('❌ Firebase journal load error:', e.message);
    console.log('   Falling back to AsyncStorage...');

    // Fallback to local
    try {
      const raw = await AsyncStorage.getItem(LOCAL_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

// ─────────────────────────────────────────────────────────────
// ✅ DELETE one journal entry from Firebase + AsyncStorage
// ─────────────────────────────────────────────────────────────
export async function deleteJournalFromFirebase(firebaseId) {
  try {
    const userId = await getUserId();
    const db = getFirestore(getApp());

    // Delete from Firestore
    const docRef = doc(db, 'users', userId, 'journal_entries', firebaseId);
    await deleteDoc(docRef);

    console.log(`🗑️ Journal entry deleted from Firebase: ${firebaseId}`);

    // Also remove from local backup
    await _syncLocalStorage(userId, { firebaseId }, 'delete');

    return { success: true };
  } catch (e) {
    console.log('❌ Firebase journal delete error:', e.message);

    // Still remove from local even if Firebase fails
    await _syncLocalStorage(null, { firebaseId }, 'delete');
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────
// 🔒 PRIVATE — keep AsyncStorage in sync with Firebase
// ─────────────────────────────────────────────────────────────
async function _syncLocalStorage(userId, entry, action) {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    let entries = raw ? JSON.parse(raw) : [];

    if (action === 'add') {
      entries = [entry, ...entries];
    } else if (action === 'delete') {
      entries = entries.filter(e => e.firebaseId !== entry.firebaseId);
    }

    await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(entries));
  } catch (e) {
    console.log('❌ Local sync error:', e.message);
  }
}
