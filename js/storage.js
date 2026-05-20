import { categories, defaultPayroll, taxSettings } from "./defaults.js";
import { createFirebaseUser, firebaseReady, loginFirebaseUser, sendVerifiedPasswordResetEmail, signOutFirebaseUser } from "./firebase-auth.js";
import { loadCloudData, saveCloudData } from "./cloud-storage.js";

const SESSION_KEY = "mm_session";

const starterData = () => ({
  payroll: { ...defaultPayroll },
  accounts: [],
  expenses: [],
  budgets: [],
  subscriptions: [],
  debts: [],
  categories: [...categories],
  taxSettings,
});

const normaliseEmail = (value) => value.trim().toLowerCase();
const uid = () => crypto.randomUUID();
const userDataKey = (userId) => `mm_data_${userId}`;

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const clearLegacyAuthIfNeeded = () => {
  localStorage.removeItem("mm_users");
};

export function getSession() {
  clearLegacyAuthIfNeeded();
  const session = readJson(SESSION_KEY, null);
  if (firebaseReady() && session?.authProvider !== "firebase") {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return session;
}

export async function logout() {
  const session = readJson(SESSION_KEY, null);
  if (firebaseReady()) {
    await signOutFirebaseUser();
  }
  if (session?.id) {
    localStorage.removeItem(userDataKey(session.id));
  }
  localStorage.removeItem(SESSION_KEY);
}

export async function register(name, email, password) {
  clearLegacyAuthIfNeeded();
  const id = normaliseEmail(email);
  if (!name.trim()) throw new Error("Enter your name.");
  if (!id || !id.includes("@")) throw new Error("Enter a valid email address.");
  if (password.length < 8) throw new Error("Use at least 8 characters for the password.");
  if (!firebaseReady()) {
    throw new Error("Secure cloud login is not connected. Please connect Firebase before creating accounts.");
  }

  const user = await createFirebaseUser(name, id, password);
  if (!localStorage.getItem(userDataKey(user.id))) {
    writeJson(userDataKey(user.id), starterData());
  }
  return user;
}

export async function login(email, password) {
  clearLegacyAuthIfNeeded();
  const id = normaliseEmail(email);
  if (!firebaseReady()) {
    throw new Error("Secure cloud login is not connected. Please connect Firebase before logging in.");
  }

  const session = { ...(await loginFirebaseUser(id, password)), authProvider: "firebase", signedInAt: new Date().toISOString() };
  const oldEmailData = readJson(userDataKey(id), null);
  if (!localStorage.getItem(userDataKey(session.id))) {
    writeJson(userDataKey(session.id), oldEmailData || starterData());
  }
  writeJson(SESSION_KEY, session);
  return session;
}

export async function requestPasswordReset(email) {
  clearLegacyAuthIfNeeded();
  const id = normaliseEmail(email);
  if (!id || !id.includes("@")) throw new Error("Enter the email address for your account.");
  await sendVerifiedPasswordResetEmail(id);
  return { email: id };
}

export async function loadData(userId) {
  const fallbackData = { ...starterData(), ...readJson(userDataKey(userId), {}) };
  if (!firebaseReady()) return fallbackData;
  const cloudData = await loadCloudData(userId, fallbackData);
  writeJson(userDataKey(userId), cloudData);
  return cloudData;
}

export async function saveData(userId, data) {
  writeJson(userDataKey(userId), data);
  if (firebaseReady()) {
    await saveCloudData(userId, data);
  }
}

export function makeId() {
  return uid();
}
