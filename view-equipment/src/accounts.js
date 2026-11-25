const storage = require("./storage");
const { endSessionsOf, isSuspended } = require("./login");
const { ContractError } = require("./errors");

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function todayIso(now) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function present(row) {
  const suspended = isSuspended(row);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: suspended ? "suspended" : "active",
    until: suspended ? row.suspendedUntil : ""
  };
}

function parseUntil(input, now) {
  const until = String(input && input.until || "");
  if (!isIsoDate(until) || until < todayIso(now)) throw new ContractError("SuspensionIncomplete");
  return until;
}

async function listAccounts() {
  const rows = await storage.listAccountRecords();
  return { accounts: rows.map(present) };
}

async function suspendAccount(actorId, id, input, now = new Date()) {
  const user = await storage.findUserById(id);
  if (!user) throw new ContractError("UserNotFound");
  if (user.id === actorId) throw new ContractError("CannotSuspend");
  const until = parseUntil(input, now);
  await storage.setUserSuspension(id, until);
  endSessionsOf(id);
  return { id, status: "suspended", until, message: "Account suspended." };
}

async function reactivateAccount(id) {
  const found = await storage.setUserSuspension(id, "");
  if (!found) throw new ContractError("UserNotFound");
  return { id, status: "active", until: "", message: "Account reactivated." };
}

module.exports = { listAccounts, suspendAccount, reactivateAccount };
