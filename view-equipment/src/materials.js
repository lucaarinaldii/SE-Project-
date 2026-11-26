const { randomBytes } = require("crypto");
const storage = require("./storage");
const { ContractError } = require("./errors");

const MAX_LEVEL = 9999;

function stateOf(row) {
  if (row.quantity <= 0) return "empty";
  if (row.quantity <= row.minimum) return "low";
  return "ok";
}

function percentOf(row) {
  if (!row.capacity) return 0;
  return Math.round((row.quantity / row.capacity) * 100);
}

function present(row, ticketId, uses) {
  return {
    id: row.id,
    equipmentId: row.id,
    equipment: row.equipment,
    serial: row.serial,
    location: row.location,
    name: row.name,
    unit: row.unit,
    quantity: row.quantity,
    minimum: row.minimum,
    capacity: row.capacity,
    usePerHour: row.usePerHour,
    percent: percentOf(row),
    state: stateOf(row),
    ticketId: ticketId || "",
    uses: uses || []
  };
}

async function materialOf(id) {
  const row = await storage.findMaterialRecord(id);
  return {
    name: row.name,
    unit: row.unit,
    quantity: row.quantity,
    minimum: row.minimum,
    capacity: row.capacity,
    usePerHour: row.usePerHour,
    percent: percentOf(row),
    state: stateOf(row)
  };
}

async function listMaterials(isStaff) {
  const rows = await storage.listMaterialRecords();
  const tickets = isStaff ? await storage.listOpenMaterialTickets() : new Map();
  const uses = await storage.listMaterialUses();
  const byEquipment = new Map();
  for (const use of uses) {
    const list = byEquipment.get(use.equipmentId) || [];
    list.push({
      reservationId: use.reservationId,
      date: use.date,
      start: use.start,
      end: use.end,
      amount: use.amount,
      stockAfter: use.stockAfter
    });
    byEquipment.set(use.equipmentId, list);
  }
  return {
    materials: rows.map((row) => present(row, tickets.get(row.id), byEquipment.get(row.id) || [])),
    canManage: isStaff,
    message: rows.length === 0 ? "No materials found" : ""
  };
}

function parseQuantity(input, capacity) {
  const value = input && input.quantity;
  if (!Number.isInteger(value) || value < 0 || value > capacity || value > MAX_LEVEL) throw new ContractError("InvalidQuantity");
  return value;
}

async function setMaterialLevel(id, input, now = new Date()) {
  const material = await storage.findMaterialRecord(id);
  const quantity = parseQuantity(input, material.capacity);
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

module.exports = { materialOf, listMaterials, setMaterialLevel };
