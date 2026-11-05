const { ContractError } = require("./errors");

// Answers whether this request already has a session.
const ACTIVE_SESSIONS = new Set(["demo-session"]);

function currentSession(request) {
  const header = request.headers && request.headers["x-session"];
  const token = Array.isArray(header) ? header[0] : header;
  if (!token || !ACTIVE_SESSIONS.has(token)) {
    throw new ContractError("NoSession");
  }
  return { signedIn: true };
}

module.exports = { currentSession };
