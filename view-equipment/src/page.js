const { currentSession, accountId, requireStaff } = require("./login");
const { listEquipment, equipmentDetails } = require("./catalogue");
const { statusOf, machineStatus } = require("./status");
const { dayAvailability } = require("./availability");
const { myReservations, allReservations, reservationDetails } = require("./history");
const { reserveSlot } = require("./reserve");
const { confirmReservation, cancelReservation } = require("./confirmation");
const { submitReport } = require("./report");
const { listStaffEquipment, blockEquipment, unblockEquipment } = require("./staff");
const { listTickets, changeTicketStatus } = require("./tickets");
const { writeToUser } = require("./message");

// Builds screen data for the catalogue and for one day's slots. It does not read the HTTP request or write the response.
async function buildList(request, type) {
  currentSession(request);
  const equipment = await listEquipment(type);
  const statuses = await statusOf(equipment.map((item) => item.id));
  const byId = new Map(statuses.map((item) => [item.id, item]));
  return {
    equipment: equipment.map((item) => {
      const status = byId.get(item.id);
      return {
        id: item.id,
        type: item.type,
        location: item.location,
        serial: item.serial,
        status: status.state,
        reason: status.reason,
        period: status.period
      };
    }),
    message: equipment.length === 0 ? "No equipment found" : ""
  };
}

async function buildDetails(request, id) {
  currentSession(request);
  const details = await equipmentDetails(id);
  const status = await machineStatus(id);
  return { ...details, status: status.state, reason: status.reason, period: status.period };
}

async function buildAvailability(request, id, date) {
  currentSession(request);
  const status = await machineStatus(id);
  return dayAvailability(id, date, status);
}

async function buildHistory(request, filters) {
  return myReservations(await accountId(request), filters);
}

async function buildAllReservations(request, filters) {
  await requireStaff(request);
  return allReservations(filters);
}

async function buildReservation(request, id) {
  return reservationDetails(await accountId(request), id);
}

async function createReservation(request, input) {
  return reserveSlot(await accountId(request), input);
}

async function confirmOwnedReservation(request, id) {
  return confirmReservation(await accountId(request), id);
}

async function cancelOwnedReservation(request, id) {
  return cancelReservation(await accountId(request), id);
}

async function reportOwnedReservation(request, id, input) {
  return submitReport(await accountId(request), id, input);
}

async function buildStaffEquipment(request) {
  await requireStaff(request);
  return listStaffEquipment();
}

async function blockStaffEquipment(request, id, input) {
  await requireStaff(request);
  return blockEquipment(id, input);
}

async function unblockStaffEquipment(request, id) {
  await requireStaff(request);
  return unblockEquipment(id);
}

async function buildTickets(request, filters) {
  await requireStaff(request);
  return listTickets(filters);
}

async function updateTicket(request, id, input) {
  await requireStaff(request);
  return changeTicketStatus(id, input && input.status);
}

async function messageStaffUser(request, input) {
  await requireStaff(request);
  return writeToUser(input && input.userId, input);
}

module.exports = {
  buildList,
  buildDetails,
  buildAvailability,
  buildHistory,
  buildAllReservations,
  buildReservation,
  createReservation,
  confirmOwnedReservation,
  cancelOwnedReservation,
  reportOwnedReservation,
  buildStaffEquipment,
  blockStaffEquipment,
  unblockStaffEquipment,
  buildTickets,
  updateTicket,
  messageStaffUser
};
