import { categories, defaultPayroll, taxSettings } from "./defaults.js";
import { createFirebaseUser, firebaseReady, loginFirebaseUser, sendVerifiedPasswordResetEmail, signOutFirebaseUser } from "./firebase-auth.js";

const USERS_KEY = "mm_users";
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
  if (firebaseReady()) {
    localStorage.removeItem(USERS_KEY);
  }
};

const bytesToHex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(hash));
}

export function getSession() {
  clearLegacyAuthIfNeeded();
  const session = readJson(SESSION_KEY, null);
  if (firebaseReady() && session?.authProvider !== "firebase") {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return session;
}

export function logout() {
  if (firebaseReady()) {
    signOutFirebaseUser();
  }
  localStorage.removeItem(SESSION_KEY);
}

export async function register(name, email, password) {
  clearLegacyAuthIfNeeded();
  const id = normaliseEmail(email);
  if (!name.trim()) throw new Error("Enter your name.");
  if (!id || !id.includes("@")) throw new Error("Enter a valid email address.");
  if (password.length < 8) throw new Error("Use at least 8 characters for the password.");

  if (firebaseReady()) {
    const user = await createFirebaseUser(name, id, password);
    if (!localStorage.getItem(userDataKey(user.id))) {
      writeJson(userDataKey(user.id), starterData());
    }
    return user;
  }

  const users = readJson(USERS_KEY, []);
  if (users.some((user) => user.id === id)) throw new Error("That email already has an account. Please log in.");
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = bytesToHex(saltBytes);
  const user = {
    id,
    name: name.trim(),
    email: id,
    salt,
    passwordHash: await hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };
  writeJson(USERS_KEY, [...users, user]);
  writeJson(userDataKey(id), starterData());
  return { id: user.id, name: user.name, email: user.email };
}

export async function login(email, password) {
  clearLegacyAuthIfNeeded();
  const id = normaliseEmail(email);

  if (firebaseReady()) {
    const session = { ...(await loginFirebaseUser(id, password)), authProvider: "firebase", signedInAt: new Date().toISOString() };
    if (!localStorage.getItem(userDataKey(session.id))) {
      writeJson(userDataKey(session.id), starterData());
    }
    writeJson(SESSION_KEY, session);
    return session;
  }

  const user = readJson(USERS_KEY, []).find((item) => item.id === id);
  if (!user) throw new Error("No account found for that email.");
  const passwordHash = await hashPassword(password, user.salt);
  if (passwordHash !== user.passwordHash) throw new Error("Password is incorrect.");
  const session = { id: user.id, name: user.name, email: user.email || user.id };
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

export function loadData(userId) {
  return { ...starterData(), ...readJson(userDataKey(userId), {}) };
}

export function saveData(userId, data) {
  writeJson(userDataKey(userId), data);
}

export function makeId() {
  return uid();
}
