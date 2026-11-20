const { randomBytes } = require("crypto");
const storage = require("./storage");
const { machineStatus } = require("./status");
const { dayAvailability, suggestFreeSlots, slotIsPast } = require("./availability");
const { ContractError } = require("./errors");

const DAY_START = 9;
const DAY_END = 18;

function slotEnd(start) {
  const match = /^(\d{2}):00$/.exec(start);
  if (!match) return "";
  const hour = Number(match[1]);
  if (hour < DAY_START || hour >= DAY_END) return "";
  return `${String(hour + 1).padStart(2, "0")}:00`;
}

async function failSlot(code, equipmentId, date, status) {
  const error = new ContractError(code);
  if (code === "SlotTaken") error.suggestions = await suggestFreeSlots(equipmentId, date, status);
  throw error;
}

async function reserveSlot(userId, input) {
  const equipmentId = String(input.equipmentId || "");
  const date = String(input.date || "");
  const start = String(input.start || "");
  const end = String(input.end || "");
  const expectedEnd = slotEnd(start);
  if (!expectedEnd || end !== expectedEnd) throw new ContractError("InvalidSlot");

  const status = await machineStatus(equipmentId);
  if (slotIsPast(date, start)) throw new ContractError("PastSlot");
  const day = await dayAvailability(equipmentId, date, status);
  const slot = day.slots.find((item) => item.start === start && item.end === end);
  if (!slot || slot.state !== "free") {
    await failSlot(slot && slot.state === "unavailable" ? "MachineBlocked" : "SlotTaken", equipmentId, date, status);
  }

  const id = `res-${randomBytes(4).toString("hex")}`;
  try {
    await storage.insertReservation({
      id,
      equipmentId,
      studentId: userId,
      date,
      start,
      end,
      status: "Awaiting confirmation"
    });
  } catch (error) {
    if (error.code !== "SlotTaken") throw error;
    error.suggestions = await suggestFreeSlots(equipmentId, date, status);
    throw error;
  }

  const machine = await storage.findMachineRecord(equipmentId);
  return {
    id,
    equipmentId,
    equipment: machine.Type,
    location: machine.Location,
    date,
    start,
    end,
    status: "Awaiting confirmation",
    message: "Reservation created. Status: Awaiting confirmation."
  };
}

module.exports = { reserveSlot };
