import { firebaseConfig, firebaseEnabled } from "./firebase-config.js";

const firebaseReady = () =>
  firebaseEnabled &&
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId;

const withTimeout = (task, message) =>
  Promise.race([
    task,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), 10000);
    }),
  ]);

async function getFirestoreTools() {
  if (!firebaseReady()) {
    throw new Error("Cloud storage is not connected yet.");
  }

  const firebaseAppUrl = "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
  const firestoreUrl = "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
  const appModule = await import(firebaseAppUrl);
  const firestoreModule = await import(firestoreUrl);
  const apps = appModule.getApps();
  const app = apps.length ? apps[0] : appModule.initializeApp(firebaseConfig);
  const db = firestoreModule.getFirestore(app);
  return { db, firestoreModule };
}

function cloudError(error) {
  const code = error?.code || "";
  if (code.includes("permission-denied")) {
    return "Cloud save was blocked by security rules. Check that Firestore rules allow this logged-in user to access their own data.";
  }
  if (code.includes("unavailable") || code.includes("deadline-exceeded")) {
    return "Cloud storage is temporarily unavailable. Check your internet connection and try again.";
  }
  return error?.message || "Cloud storage failed. Please try again.";
}

export async function loadCloudData(userId, fallbackData) {
  if (!firebaseReady()) return fallbackData;

  try {
    const { db, firestoreModule } = await getFirestoreTools();
    const docRef = firestoreModule.doc(db, "users", userId, "finance", "main");
    const snapshot = await withTimeout(
      firestoreModule.getDoc(docRef),
      "Cloud data did not respond. Check that Firestore Database is created and your rules are published.",
    );
    if (!snapshot.exists()) {
      await saveCloudData(userId, fallbackData);
      return fallbackData;
    }
    return { ...fallbackData, ...(snapshot.data().data || {}) };
  } catch (error) {
    throw new Error(cloudError(error));
  }
}

export async function saveCloudData(userId, data) {
  if (!firebaseReady()) return;

  try {
    const { db, firestoreModule } = await getFirestoreTools();
    const docRef = firestoreModule.doc(db, "users", userId, "finance", "main");
    await withTimeout(
      firestoreModule.setDoc(
        docRef,
        {
          data,
          ownerId: userId,
          updatedAt: firestoreModule.serverTimestamp(),
        },
        { merge: true },
      ),
      "Cloud save did not respond. Check that Firestore Database is created and your rules are published.",
    );
  } catch (error) {
    throw new Error(cloudError(error));
  }
}
