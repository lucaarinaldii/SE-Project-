const { randomBytes, scryptSync, timingSafeEqual } = require("crypto");
const storage = require("./storage");
const { ContractError } = require("./errors");

const SESSIONS = new Map();
const LOCK_MS = 15 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function headerToken(request) {
  const header = request.headers && request.headers["x-session"];
  return Array.isArray(header) ? header[0] : header;
}

function sessionUserId(request) {
  const token = headerToken(request);
  const userId = token ? SESSIONS.get(token) : "";
  if (!userId) throw new ContractError("NoSession");
  return userId;
}

function currentSession(request) {
  sessionUserId(request);
  return { signedIn: true };
}

function publicAccount(user) {
  return { name: user.name, email: user.email, role: user.role };
}

async function signedInUser(request) {
  const user = await storage.findUserById(sessionUserId(request));
  if (!user) throw new ContractError("NoSession");
  return user;
}

async function currentAccount(request) {
  return publicAccount(await signedInUser(request));
}

async function accountId(request) {
  return (await signedInUser(request)).id;
}

async function requireStaff(request) {
  const user = await signedInUser(request);
  if (user.role !== "staff") throw new ContractError("Forbidden");
  return user;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored || "").split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const actual = scryptSync(String(password), salt, 32);
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function todayText() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function isSuspended(user) {
  return Boolean(user.suspendedUntil) && user.suspendedUntil >= todayText();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validRegistration(name, email, password) {
  return name.trim().length > 0
    && name.trim().length <= 80
    && EMAIL_PATTERN.test(email)
    && typeof password === "string"
    && password.length >= 8
    && password.length <= 200;
}

async function signIn(email, password) {
  const normalized = normalizeEmail(email);
  if (!EMAIL_PATTERN.test(normalized) || typeof password !== "string") {
    throw new ContractError("InvalidCredentials");
  }
  const outcome = await storage.withUsers((users) => {
    const user = users.find((item) => item.email === normalized);
    if (!user || user.passwordHash === undefined) return { code: "InvalidCredentials" };
    if (user.lockedUntil && Date.parse(user.lockedUntil) > Date.now()) return { code: "LoginBlocked" };
    if (!verifyPassword(password, user.passwordHash)) {
      const attempts = Number(user.failedAttempts || 0) + 1;
      user.failedAttempts = attempts;
      user.lockedUntil = attempts >= 3 ? new Date(Date.now() + LOCK_MS).toISOString() : "";
      return { code: attempts >= 3 ? "LoginBlocked" : "InvalidCredentials" };
    }
    if (isSuspended(user)) return { code: "AccountSuspended" };
    user.failedAttempts = 0;
    user.lockedUntil = "";
    const token = randomBytes(24).toString("hex");
    SESSIONS.set(token, user.id);
    return { token, account: publicAccount(user) };
  });
  if (outcome.code) throw new ContractError(outcome.code);
  return { token: outcome.token, account: outcome.account };
}

async function registerAccount(input) {
  const name = String(input.name || "").trim();
  const email = normalizeEmail(input.email);
  const password = input.password;
  if (!validRegistration(name, email, password)) throw new ContractError("InvalidRegistration");
  const outcome = await storage.withUsers((users) => {
    if (users.some((item) => item.email === email)) return { code: "EmailTaken" };
    const user = {
      id: `user-${randomBytes(4).toString("hex")}`,
      name,
      email,
      passwordHash: hashPassword(password),
      role: "user",
      failedAttempts: 0,
      lockedUntil: "",
      suspendedUntil: ""
    };
    users.push(user);
    const token = randomBytes(24).toString("hex");
    SESSIONS.set(token, user.id);
    return { token, account: publicAccount(user) };
  });
  if (outcome.code) throw new ContractError(outcome.code);
  return { token: outcome.token, account: outcome.account };
}

function endSessionsOf(userId) {
  for (const [token, id] of SESSIONS) {
    if (id === userId) SESSIONS.delete(token);
  }
}

function signOut(request) {
  const token = headerToken(request);
  if (token) SESSIONS.delete(token);
  return { signedOut: true };
}

module.exports = { currentSession, currentAccount, accountId, requireStaff, signIn, registerAccount, signOut, endSessionsOf, isSuspended }
