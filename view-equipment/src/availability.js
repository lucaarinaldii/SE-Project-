const storage = require("./storage");
const { ContractError } = require("./errors");

const DAY_START = 9 * 60;
const DAY_END = 18 * 60;
const SLOT_MINUTES = 60;
const LOOKAHEAD_DAYS = 14;
const SUGGESTION_LIMIT = 3;

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function shiftDate(value, days) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const monthText = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dayText = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${monthText}-${dayText}`;
}

function clock(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function dateIsBlocked(status, date) {
  if (!status || status.state !== "blocked") return false;
  const start = status.blockStart || "";
  const end = status.blockEnd || "";
  if (!start && !end) return true;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function occupies(reservation, date, start, end) {
  if (reservation.status === "Cancelled") return false;
  if (reservation.date !== date) return false;
  return reservation.start < end && reservation.end > start;
}

function calendarDate(now) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function slotIsPast(date, start, now = new Date()) {
  if (!isIsoDate(date)) return false;
  const today = calendarDate(now);
  if (date < today) return true;
  if (date > today) return false;
  const [hours, mins] = start.split(":").map(Number);
  return hours * 60 + mins <= now.getHours() * 60 + now.getMinutes();
}

function slotsForDate(reservations, status, date, now = new Date()) {
  const blocked = dateIsBlocked(status, date);
  const slots = [];
  for (let cursor = DAY_START; cursor < DAY_END; cursor += SLOT_MINUTES) {
    const start = clock(cursor);
    const end = clock(cursor + SLOT_MINUTES);
    let state = "free";
    if (slotIsPast(date, start, now)) state = "past";
    else if (blocked) state = "unavailable";
    else if (reservations.some((item) => occupies(item, date, start, end))) state = "booked";
    slots.push({ start, end, state });
  }
  return slots;
}

function nearestFree(reservations, status, date) {
  const suggestions = [];
  for (let offset = 1; offset <= LOOKAHEAD_DAYS && suggestions.length < SUGGESTION_LIMIT; offset += 1) {
    const day = shiftDate(date, offset);
    for (const slot of slotsForDate(reservations, status, day)) {
      if (slot.state !== "free") continue;
      suggestions.push({ date: day, start: slot.start, end: slot.end });
      if (suggestions.length === SUGGESTION_LIMIT) break;
    }
  }
  return suggestions;
}

async function reservationsFor(id) {
  const reservations = await storage.listReservationRecords();
  return reservations.filter((item) => item.equipmentId === id);
}

// Builds free and booked slots for one machine on one date. The caller passes the status.
async function dayAvailability(id, date, status) {
  if (!isIsoDate(date)) throw new ContractError("InvalidDate");
  const reservations = await reservationsFor(id);
  const blocked = dateIsBlocked(status, date);
  const all = slotsForDate(reservations, status, date);
  const slots = all.filter((slot) => slot.state !== "past");
  const fullyBooked = !blocked && slots.length > 0 && slots.every((slot) => slot.state === "booked");
  const passed = !blocked && slots.length === 0 && all.every((slot) => slot.state === "past");
  return {
    id,
    date,
    slots,
    message: fullyBooked ? "Fully booked" : passed ? "This time has already passed." : "",
    reason: blocked ? status.reason || "" : "",
    period: blocked ? status.period || "" : "",
    suggestions: fullyBooked ? nearestFree(reservations, status, date) : []
  };
}

async function suggestFreeSlots(id, date, status) {
  if (!isIsoDate(date)) throw new ContractError("InvalidDate");
  const reservations = await reservationsFor(id);
  const suggestions = [];
  for (const slot of slotsForDate(reservations, status, date)) {
    if (slot.state !== "free") continue;
    suggestions.push({ date, start: slot.start, end: slot.end });
    if (suggestions.length === SUGGESTION_LIMIT) return suggestions;
  }
  for (const slot of nearestFree(reservations, status, date)) {
    suggestions.push(slot);
    if (suggestions.length === SUGGESTION_LIMIT) break;
  }
  return suggestions;
}

module.exports = { dayAvailability, suggestFreeSlots, slotIsPast };
