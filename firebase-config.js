/**
 * SafarSaarthi — Firebase Configuration
 * Real Firebase Auth (Email/Password) + Firestore.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBkbzGTOGUd0YtVhzuj3H2_XpkYxoBy25k",
  authDomain: "safarsaarthi-1d969.firebaseapp.com",
  projectId: "safarsaarthi-1d969",
  storageBucket: "safarsaarthi-1d969.firebasestorage.app",
  messagingSenderId: "431967128669",
  appId: "1:431967128669:web:d5547d58c8c6a2518d11b4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/* ============================================================
 *  AUTH HELPERS — Email / Password
 * ============================================================ */

// Creates a brand-new Firebase account. Throws on failure (e.g. email already in use).
export async function signUpWithEmail(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // Force the ID token to fully propagate before any Firestore write happens,
  // otherwise a write made within ~1-2s of signup can race and get rejected.
  await cred.user.getIdToken(true);
  return cred.user; // has .uid
}

// Logs an existing user in. Throws on failure (wrong password, no such user, etc).
export async function signInWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await cred.user.getIdToken(true);
  return cred.user;
}

export async function signOutFirebase() {
  try {
    await firebaseSignOut(auth);
  } catch (e) {
    console.warn("[SafarSaarthi Firebase] Sign-out error:", e);
  }
}

// Optional listener for auth state changes (not used to auto-login on page load —
// SafarSaarthi intentionally requires a fresh session sign-in each visit).
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/* ============================================================
 *  HYBRID STORE — instant localStorage cache + best-effort Firestore sync
 * ============================================================ */

class HybridStore {
  constructor() {
    this.storageKeyPrefix = "verida_data_";
    this.listeners = new Map();
  }

  getCollection(collectionName) {
    try {
      const raw = localStorage.getItem(this.storageKeyPrefix + collectionName);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn(`[SafarSaarthi Store] Read error for ${collectionName}:`, e);
      return [];
    }
  }

  saveCollection(collectionName, items) {
    try {
      localStorage.setItem(this.storageKeyPrefix + collectionName, JSON.stringify(items));
      this.notify(collectionName, items);
    } catch (e) {
      console.error(`[SafarSaarthi Store] Save error for ${collectionName}:`, e);
    }
  }

  // Adds a document locally (instant) and mirrors it to Firestore in the background.
  // Pass data.id to control the Firestore document id (e.g. a Firebase Auth uid).
  async addDocument(collectionName, data) {
    const items = this.getCollection(collectionName);
    const newDoc = {
      id: data.id || `${collectionName.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
      ...data
    };
    items.unshift(newDoc);
    this.saveCollection(collectionName, items);

    try {
      await setDoc(doc(db, collectionName, String(newDoc.id)), newDoc, { merge: true });
    } catch (err) {
      // One retry after a short pause — covers the rare case where this write
      // landed a beat before Firebase Auth's token fully propagated.
      await new Promise(res => setTimeout(res, 800));
      try {
        await setDoc(doc(db, collectionName, String(newDoc.id)), newDoc, { merge: true });
      } catch (err2) {
        console.log(`[SafarSaarthi Firestore] Offline or sync skipped for ${collectionName}:`, err2.message);
      }
    }

    return newDoc;
  }

  // Reads a single document straight from Firestore (used to pull a profile down
  // on a new device/browser where localStorage is empty).
  async getDocument(collectionName, id) {
    if (!id) return null;
    try {
      const snap = await getDoc(doc(db, collectionName, String(id)));
      return snap.exists() ? snap.data() : null;
    } catch (err) {
      console.warn(`[SafarSaarthi Firestore] getDocument failed for ${collectionName}/${id}:`, err.message);
      return null;
    }
  }

  async getDocuments(collectionName, filterFn = null) {
    let items = this.getCollection(collectionName);
    if (filterFn && typeof filterFn === "function") {
      items = items.filter(filterFn);
    }
    return items;
  }

  subscribe(collectionName, callback) {
    if (!this.listeners.has(collectionName)) {
      this.listeners.set(collectionName, new Set());
    }
    this.listeners.get(collectionName).add(callback);

    callback(this.getCollection(collectionName));

    return () => {
      if (this.listeners.has(collectionName)) {
        this.listeners.get(collectionName).delete(callback);
      }
    };
  }

  notify(collectionName, data) {
    if (this.listeners.has(collectionName)) {
      this.listeners.get(collectionName).forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error("[SafarSaarthi Store] Listener error:", err);
        }
      });
    }
  }
}

export const hybridStore = new HybridStore();
