const storage = require("./storage");
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
    location: machine ? machine.Location : "",
    date: reservation.date,
    start: reservation.start,
    end: reservation.end,
    status: reservation.status,
    canConfirm: reservation.status === "Awaiting confirmation" && confirmWindow(reservation.date, reservation.start),
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

async function myReservations(userId, filters = {}) {
  const date = String(filters.date || "");
  const equipment = String(filters.equipment || "");
  const status = String(filters.status || "");
  if (date && !isIsoDate(date)) throw new ContractError("InvalidDate");
  if (status && !STATUSES.has(status)) throw new ContractError("UnknownStatus");
  const machines = await machinesById();
  if (equipment && !machines.has(equipment)) throw new ContractError("EquipmentNotFound");
  const owned = await storage.listOwnedReservations(userId);
  const reservations = (await withReports(owned
    .filter((item) => !date || item.date === date)
    .filter((item) => !equipment || item.equipmentId === equipment)
    .filter((item) => !status || item.status === status), machines))
    .sort((left, right) => `${left.date} ${left.start}`.localeCompare(`${right.date} ${right.start}`));
  return {
    reservations,
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

module.exports = { myReservations, reservationDetails };
