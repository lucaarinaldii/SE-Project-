const storage = require("./storage");
const { ContractError } = require("./errors");

const STATUSES = ["Open", "In progress", "Maintenance requested", "Resolved", "Rejected"];
const COMPLETED = new Set(["Resolved", "Rejected"]);

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function profileOf(row) {
  if (!row.email) return null;
  return {
    id: row.userId,
    name: row.user || "Unknown user",
    email: row.email,
    role: row.role || "user"
  };
}

function present(row) {
  return {
    id: row.id,
    equipmentId: row.equipmentId,
    equipment: row.equipment,
    serial: row.serial || "",
    location: row.location,
    user: row.user || "Unknown user",
    profile: profileOf(row),
    date: row.date,
    start: row.start,
    end: row.end,
    issueType: row.issueType,
    description: row.description,
    status: row.status,
    materialId: row.materialId || ""
  };
}

async function listTickets(filters = {}) {
  const group = String(filters.group || "open");
  const equipment = String(filters.equipment || "");
  const date = String(filters.date || "");
  if (group !== "open" && group !== "completed") throw new ContractError("UnknownStatus");
  if (date && !isIsoDate(date)) throw new ContractError("InvalidDate");
  const machines = await storage.listMachineRecords();
  if (equipment && !machines.some((item) => item.id === equipment)) throw new ContractError("EquipmentNotFound");
  const tickets = (await storage.listTicketRecords())
    .filter((row) => (group === "completed" ? COMPLETED.has(row.status) : !COMPLETED.has(row.status)))
    .filter((row) => !equipment || row.equipmentId === equipment)
    .filter((row) => !date || row.date === date)
    .map(present);
  return {
    tickets,
    equipment: machines.map((item) => ({ id: item.id, type: item.Type, serial: item.serial || "", location: item.Location })),
    message: tickets.length === 0 ? "No tickets found" : ""
  };
}

async function changeTicketStatus(id, status) {
  if (!STATUSES.includes(String(status || ""))) throw new ContractError("UnknownStatus");
  const updated = await storage.updateTicketStatus(id, status);
  if (!updated) throw new ContractError("TicketNotFound");
  const row = (await storage.listTicketRecords()).find((item) => item.id === id);
  return {
    ...present(row),
    message: `Ticket updated. Status: ${status}.`
  };
}

module.exports = { listTickets, changeTicketStatus, STATUSES };
