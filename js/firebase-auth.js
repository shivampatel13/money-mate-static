import { firebaseConfig, firebaseEnabled } from "./firebase-config.js";

export const firebaseReady = () =>
  firebaseEnabled &&
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId;

async function getFirebaseAuth() {
  if (!firebaseReady()) {
    throw new Error("Secure email login is not connected yet. Add Firebase Authentication settings to enable it.");
  }

  const firebaseAppUrl = "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
  const firebaseAuthUrl = "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
  const appModule = await import(firebaseAppUrl);
  const authModule = await import(firebaseAuthUrl);
  const apps = appModule.getApps();
  const app = apps.length ? apps[0] : appModule.initializeApp(firebaseConfig);
  return { auth: authModule.getAuth(app), authModule };
}

function friendlyFirebaseError(error) {
  const code = error?.code || "";
  if (code.includes("email-already-in-use")) return "That email already has an account. Please log in.";
  if (code.includes("invalid-email")) return "Enter a valid email address.";
  if (code.includes("weak-password")) return "Use a stronger password with at least 6 characters.";
  if (code.includes("user-not-found") || code.includes("invalid-credential") || code.includes("wrong-password")) {
    return "Email or password is incorrect.";
  }
  if (code.includes("network-request-failed")) return "Check your internet connection and try again.";
  return error?.message || "Something went wrong. Please try again.";
}

export async function createFirebaseUser(name, email, password) {
  try {
    const { auth, authModule } = await getFirebaseAuth();
    const credential = await authModule.createUserWithEmailAndPassword(auth, email, password);
    if (name.trim()) {
      await authModule.updateProfile(credential.user, { displayName: name.trim() });
    }
    await authModule.signOut(auth);
    return {
      id: credential.user.email,
      name: name.trim() || credential.user.email,
      email: credential.user.email,
    };
  } catch (error) {
    throw new Error(friendlyFirebaseError(error));
  }
}

export async function loginFirebaseUser(email, password) {
  try {
    const { auth, authModule } = await getFirebaseAuth();
    const credential = await authModule.signInWithEmailAndPassword(auth, email, password);
    return {
      id: credential.user.email,
      name: credential.user.displayName || credential.user.email,
      email: credential.user.email,
    };
  } catch (error) {
    throw new Error(friendlyFirebaseError(error));
  }
}

export async function sendVerifiedPasswordResetEmail(email) {
  if (!firebaseReady()) {
    throw new Error("Password reset emails are not switched on yet. Ask the app owner to connect secure email login before using this feature.");
  }

  try {
    const { auth, authModule } = await getFirebaseAuth();
    await authModule.sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw new Error(friendlyFirebaseError(error));
  }
}
