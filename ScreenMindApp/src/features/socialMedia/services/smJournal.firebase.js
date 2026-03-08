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
// BUG FIX: pages array was missing from doc_data — all multi-page
//          content was silently discarded on save.
// ─────────────────────────────────────────────────────────────
export async function saveJournalToFirebase(entry) {
  try {
    const userId = await getUserId();
    const db = getFirestore(getApp());

    // BUG FIX #1: Include pages in the document so multi-page
    // entries are fully persisted to Firestore.
    const doc_data = {
      text: entry.text,
      mood: entry.mood || null,
      createdAt: entry.createdAt || new Date().toISOString(),
      sentiment: entry.sentiment || null,
      // ✅ FIXED: was missing — caused silent data loss for multi-page entries
      pages:
        Array.isArray(entry.pages) && entry.pages.length > 0
          ? entry.pages
          : [{ id: '1', title: 'Page 1', text: entry.text, format: {} }],
    };

    // Save to Firestore → returns doc reference with auto ID
    const colRef = collection(db, 'users', userId, 'journal_entries');
    const docRef = await addDoc(colRef, doc_data);

    console.log(`✅ Journal saved to Firebase: ${docRef.id}`);
    console.log(
      `   Pages: ${doc_data.pages.length} | Sentiment: ${
        entry.sentiment?.riskLevel || 'none'
      }`,
    );

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
//
// BUG FIX: Old entries saved before this fix won't have `pages`.
// We normalise the shape here so the UI never crashes on missing pages.
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

    // Map docs → normalise shape for backward compatibility
    const entries = snapshot.docs.map(d => {
      const data = d.data();

      // BUG FIX #2: Old docs may not have `pages` field.
      // Ensure pages always exists so the UI doesn't crash.
      const pages =
        Array.isArray(data.pages) && data.pages.length > 0
          ? data.pages
          : [{ id: '1', title: 'Page 1', text: data.text || '', format: {} }];

      return {
        id: d.id,
        firebaseId: d.id,
        text: data.text || '',
        mood: data.mood || null,
        createdAt: data.createdAt || null,
        sentiment: data.sentiment || null,
        pages,
      };
    });

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

// ─────────────────────────────────────────────────────────────
// ✅ UPDATE an existing journal entry in Firebase
// Called by the Edit modal when user saves changes
// ─────────────────────────────────────────────────────────────
export async function updateJournalInFirebase(firebaseId, updatedEntry) {
  try {
    const userId = await getUserId();
    const db = getFirestore(getApp());

    const docRef = doc(db, 'users', userId, 'journal_entries', firebaseId);

    // Only update fields that can change — never overwrite createdAt
    const patch = {
      text: updatedEntry.text || '',
      mood: updatedEntry.mood || null,
      pages: Array.isArray(updatedEntry.pages) ? updatedEntry.pages : [],
      sentiment: updatedEntry.sentiment || null,
      updatedAt: updatedEntry.updatedAt || new Date().toISOString(),
    };

    // Firestore setDoc with merge:true updates only provided fields
    const { setDoc } = await import('@react-native-firebase/firestore');
    await setDoc(docRef, patch, { merge: true });

    console.log(`✅ Journal entry updated: ${firebaseId}`);

    // Sync local backup
    await _syncLocalUpdate(updatedEntry);

    return { success: true };
  } catch (e) {
    console.log('❌ Firebase journal update error:', e.message);
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────
// 🔒 PRIVATE — update one entry in AsyncStorage backup
// ─────────────────────────────────────────────────────────────
async function _syncLocalUpdate(updatedEntry) {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    let entries = raw ? JSON.parse(raw) : [];
    const key = updatedEntry.firebaseId || updatedEntry.id;
    entries = entries.map(e =>
      (e.firebaseId || e.id) === key ? { ...e, ...updatedEntry } : e,
    );
    await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(entries));
  } catch (e) {
    console.log('❌ Local update sync error:', e.message);
  }
}
