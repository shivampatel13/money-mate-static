import { categories, defaultPayroll, taxSettings } from "./defaults.js";

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

const bytesToHex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(hash));
}

export function getSession() {
  return readJson(SESSION_KEY, null);
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export async function register(name, email, password) {
  const id = normaliseEmail(email);
  if (!name.trim()) throw new Error("Enter your name.");
  if (!id || !id.includes("@")) throw new Error("Enter a valid email address.");
  if (password.length < 4) throw new Error("Use at least 4 characters for the password.");
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
  const id = normaliseEmail(email);
  const user = readJson(USERS_KEY, []).find((item) => item.id === id);
  if (!user) throw new Error("No account found for that email.");
  const passwordHash = await hashPassword(password, user.salt);
  if (passwordHash !== user.passwordHash) throw new Error("Password is incorrect.");
  const session = { id: user.id, name: user.name, email: user.email || user.id };
  writeJson(SESSION_KEY, session);
  return session;
}

export async function resetPassword(email, newPassword) {
  const id = normaliseEmail(email);
  if (!id || !id.includes("@")) throw new Error("Enter the email address for your account.");
  if (newPassword.length < 4) throw new Error("Use at least 4 characters for the new password.");
  const users = readJson(USERS_KEY, []);
  const index = users.findIndex((user) => user.id === id);
  if (index === -1) throw new Error("No account found for that email.");
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = bytesToHex(saltBytes);
  users[index] = {
    ...users[index],
    salt,
    passwordHash: await hashPassword(newPassword, salt),
    passwordUpdatedAt: new Date().toISOString(),
  };
  writeJson(USERS_KEY, users);
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
