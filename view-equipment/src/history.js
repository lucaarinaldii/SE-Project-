const storage = require("./storage");
const { rulesOfUse } = require("./catalogue");
const { confirmWindow, canCancelReservation } = require("./confirmation");
const { canReport } = require("./report");
const { ContractError } = require("./errors");

const STATUSES = new Set(["Awaiting confirmation", "Confirmed", "Completed", "Cancelled"]);

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

async function machinesById() {
  const records = await storage.listMachineRecords();
  return new Map(records.map((record) => [record.id, record]));
}

function present(reservation, machines, report) {
  const machine = machines.get(reservation.equipmentId);
  return {
    id: reservation.id,
    equipmentId: reservation.equipmentId,
    equipment: machine ? machine.Type : "",
    serial: machine ? machine.serial || "" : "",
    location: machine ? machine.Location : "",
    date: reservation.date,
    start: reservation.start,
    end: reservation.end,
    status: reservation.status,
    canConfirm: reservation.status === "Awaiting confirmation" && confirmWindow(reservation.date, reservation.start),
    needsConfirmation: Boolean(machine && machine.needsConfirmation),
    rules: machine ? rulesOfUse(machine.Max_Booking_Duration) : "",
    canCancel: canCancelReservation(reservation),
    canReport: canReport(reservation) && !report,
    report: report ? {
      id: report.id,
      issueType: report.issueType,
      description: report.description,
      status: report.status
    } : null
  };
}

async function withReports(reservations, machines) {
  const reports = await storage.listReportsFor(reservations.map((item) => item.id));
  const byReservation = new Map(reports.map((item) => [item.reservationId, item]));
  return reservations.map((item) => present(item, machines, byReservation.get(item.id) || null));
}

function equipmentIds(equipment, machines) {
  if (!equipment) return null;
  if (machines.has(equipment)) return new Set([equipment]);
  const ids = [...machines.entries()]
    .filter(([, machine]) => machine.Type === equipment)
    .map(([id]) => id);
  if (ids.length === 0) throw new ContractError("EquipmentNotFound");
  return new Set(ids);
}

async function myReservations(userId, filters = {}) {
  const date = String(filters.date || "");
  const equipment = String(filters.equipment || "");
  const status = String(filters.status || "");
  if (date && !isIsoDate(date)) throw new ContractError("InvalidDate");
  if (status && !STATUSES.has(status)) throw new ContractError("UnknownStatus");
  const machines = await machinesById();
  const ids = equipmentIds(equipment, machines);
  const owned = await storage.listOwnedReservations(userId);
  const reservations = (await withReports(owned
    .filter((item) => !date || item.date === date)
    .filter((item) => !ids || ids.has(item.equipmentId))
    .filter((item) => !status || item.status === status), machines))
    .sort((left, right) => `${left.date} ${left.start}`.localeCompare(`${right.date} ${right.start}`));
  return {
    reservations,
    message: reservations.length === 0 ? "No reservations yet" : ""
  };
}

function userChoices(accounts, rows) {
  const people = new Map(accounts.map((account) => [account.id, account.name]));
  for (const row of rows) {
    if (!people.has(row.userId)) people.set(row.userId, "Unknown user");
  }
  return [...people.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
}

async function allReservations(filters = {}) {
  const date = String(filters.date || "");
  const equipment = String(filters.equipment || "");
  const status = String(filters.status || "");
  const user = String(filters.user || "");
  if (date && !isIsoDate(date)) throw new ContractError("InvalidDate");
  if (status && !STATUSES.has(status)) throw new ContractError("UnknownStatus");
  const machines = await machinesById();
  const ids = equipmentIds(equipment, machines);
  const rows = await storage.listAllReservationRecords();
  const users = userChoices(await storage.listAccountNames(), rows);
  const filtered = rows
    .filter((item) => !date || item.date === date)
    .filter((item) => !ids || ids.has(item.equipmentId))
    .filter((item) => !status || item.status === status)
    .filter((item) => !user || item.userId === user);
  const names = new Map(filtered.map((item) => [item.id, item.user || "Unknown user"]));
  const profiles = new Map(filtered.map((item) => [item.id, item.email ? {
    id: item.userId,
    name: item.user || "Unknown user",
    email: item.email,
    role: item.role || "user"
  } : null]));
  const reservations = (await withReports(filtered, machines))
    .map((item) => ({
      ...item,
      user: names.get(item.id) || "Unknown user",
      profile: profiles.get(item.id) || null,
      canConfirm: false,
      canCancel: false,
      canReport: false
    }))
    .sort((left, right) => `${left.date} ${left.start}`.localeCompare(`${right.date} ${right.start}`));
  return {
    reservations,
    users,
    message: reservations.length === 0 ? "No reservations yet" : ""
  };
}

async function reservationDetails(userId, id) {
  const owned = await storage.listOwnedReservations(userId);
  const reservation = owned.find((item) => item.id === id);
  if (!reservation) throw new ContractError("ReservationNotFound");
  const [presented] = await withReports([reservation], await machinesById());
  return presented;
}

async function blockNotices(userId) {
  return { notices: await storage.listBlockNotices(userId) };
}

module.exports = { myReservations, allReservations, reservationDetails, blockNotices };
