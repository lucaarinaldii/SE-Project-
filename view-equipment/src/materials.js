const { randomBytes } = require("crypto");
const storage = require("./storage");
const { ContractError } = require("./errors");

const MAX_LEVEL = 9999;

function stateOf(row) {
  if (row.quantity <= 0) return "empty";
  if (row.quantity <= row.minimum) return "low";
  return "ok";
}

function present(row, ticketId) {
  return {
    id: row.id,
    equipmentId: row.id,
    equipment: row.equipment,
    serial: row.serial,
    location: row.location,
    quantity: row.quantity,
    minimum: row.minimum,
    state: stateOf(row),
    ticketId: ticketId || ""
  };
}

async function listMaterials(isStaff) {
  const rows = await storage.listMaterialRecords();
  const tickets = isStaff ? await storage.listOpenMaterialTickets() : new Map();
  return {
    materials: rows.map((row) => present(row, tickets.get(row.id))),
    canManage: isStaff,
    message: rows.length === 0 ? "No materials found" : ""
  };
}

function parseQuantity(input) {
  const value = input && input.quantity;
  if (!Number.isInteger(value) || value < 0 || value > MAX_LEVEL) throw new ContractError("InvalidQuantity");
  return value;
}

async function setMaterialLevel(id, input, now = new Date()) {
  const material = await storage.findMaterialRecord(id);
  const quantity = parseQuantity(input);
  await storage.setMaterialQuantity(id, quantity);
  const updated = { ...material, quantity };
  const state = stateOf(updated);
  let ticketId = (await storage.listOpenMaterialTickets()).get(id) || "";
  let message = "Level updated.";
  if (state !== "ok" && !ticketId) {
    await storage.insertMaterialTicket({
      id: `rep-${randomBytes(4).toString("hex")}`,
      equipmentId: id,
      description: `Material level ${quantity} (minimum ${material.minimum}).`,
      createdAt: now.toISOString()
    });
    ticketId = (await storage.listOpenMaterialTickets()).get(id) || "";
    message = "Level updated. A low material ticket was opened.";
  } else if (state === "ok" && ticketId) {
    await storage.updateTicketStatus(ticketId, "Resolved");
    ticketId = "";
    message = "Level updated. The low material ticket was resolved.";
  }
  return { ...present(updated, ticketId), message };
}

module.exports = { listMaterials, setMaterialLevel };
