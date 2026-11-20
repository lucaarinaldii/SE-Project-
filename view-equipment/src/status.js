const storage = require("./storage");

function toPublicStatus(stored) {
  const flags = stored.value || {};
  const open = flags.Get_Status === true && flags.Is_Open === true;
  if (open) return { state: "open" };
  return {
    state: "blocked",
    reason: stored.reason || "",
    period: stored.period || "",
    blockStart: stored.blockStart || "",
    blockEnd: stored.blockEnd || ""
  };
}

async function statusOf(ids) {
  const statuses = [];
  for (const id of ids) {
    const stored = await storage.readStoredStatus(id);
    statuses.push({ id, ...toPublicStatus(stored) });
  }
  return statuses;
}

async function machineStatus(id) {
  const stored = await storage.readStoredStatus(id);
  return toPublicStatus(stored);
}

module.exports = { statusOf, machineStatus };
