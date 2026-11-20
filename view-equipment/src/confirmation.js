const storage = require("./storage");
const { sendMail } = require("./mail");
const { ContractError } = require("./errors");

const REMIND_MS = 15 * 60 * 1000;

function startOf(date, start) {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, mins] = start.split(":").map(Number);
  return new Date(year, month - 1, day, hours, mins, 0, 0);
}

function notStarted(date, start, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(start)) return false;
  return startOf(date, start).getTime() > now.getTime();
}

function confirmWindow(date, start, now = new Date()) {
  if (!notStarted(date, start, now)) return false;
  const left = startOf(date, start).getTime() - now.getTime();
  return left <= REMIND_MS;
}

function canCancelReservation(reservation, now = new Date()) {
  const open = reservation.status === "Awaiting confirmation" || reservation.status === "Confirmed";
  return open && notStarted(reservation.date, reservation.start, now);
}

function letter(kind, reservation) {
  const lines = [
    `${reservation.equipment}, ${reservation.location}`,
    `${reservation.date} ${reservation.start}–${reservation.end}`
  ];
  if (kind === "remind") {
    return {
      subject: "Confirm your reservation",
      text: [
        "Your reservation starts in 15 minutes.",
        ...lines,
        "Status: Awaiting confirmation",
        "Open My reservations and choose Confirm before the start.",
        "If you do not confirm, the reservation is cancelled."
      ].join("\n")
    };
  }
  if (kind === "confirmed") {
    return {
      subject: "Reservation confirmed",
      text: ["Your reservation is confirmed.", ...lines, "Status: Confirmed"].join("\n")
    };
  }
  if (kind === "withdrawn") {
    return {
      subject: "Reservation cancelled",
      text: [
        "You cancelled this reservation.",
        "The time slot is free again.",
        ...lines,
        "Status: Cancelled"
      ].join("\n")
    };
  }
  return {
    subject: "Reservation cancelled",
    text: [
      "You did not confirm before the start, so the reservation was cancelled.",
      "The time slot is free again.",
      ...lines,
      "Status: Cancelled"
    ].join("\n")
  };
}

async function deliver(mail, message) {
  try {
    return await mail(message);
  } catch (error) {
    console.error(error.message);
    return false;
  }
}

async function sweepReservations(mail = sendMail, now = new Date()) {
  const rows = await storage.listAwaitingReservations();
  for (const row of rows) {
    const start = startOf(row.date, row.start).getTime();
    if (now.getTime() >= start) {
      const cancelled = await storage.cancelAwaiting(row.id);
      if (cancelled) await deliver(mail, { to: row.email, ...letter("cancel", row) });
      continue;
    }
    if (now.getTime() < start - REMIND_MS || row.reminderSentAt) continue;
    const claimed = await storage.claimReminder(row.id, now.toISOString());
    if (!claimed) continue;
    const sent = await deliver(mail, { to: row.email, ...letter("remind", row) });
    if (!sent) await storage.releaseReminder(row.id);
  }
}

async function confirmReservation(userId, id, mail = sendMail) {
  const owned = await storage.listOwnedReservations(userId);
  const existing = owned.find((item) => item.id === id);
  if (!existing) throw new ContractError("ReservationNotFound");
  if (existing.status !== "Awaiting confirmation" || !confirmWindow(existing.date, existing.start)) {
    throw new ContractError("CannotConfirm");
  }
  const saved = await storage.confirmAwaiting(userId, id);
  if (!saved) throw new ContractError("CannotConfirm");
  const user = await storage.findUserById(userId);
  const machine = await storage.findMachineRecord(existing.equipmentId);
  const view = {
    equipment: machine.Type,
    location: machine.Location,
    date: existing.date,
    start: existing.start,
    end: existing.end
  };
  const sent = await deliver(mail, { to: user.email, ...letter("confirmed", view) });
  return {
    id,
    equipmentId: existing.equipmentId,
    equipment: view.equipment,
    location: view.location,
    date: view.date,
    start: view.start,
    end: view.end,
    status: "Confirmed",
    canConfirm: false,
    canCancel: notStarted(existing.date, existing.start),
    mailSent: sent,
    message: sent
      ? "Reservation confirmed."
      : "Reservation confirmed. The email could not be sent."
  };
}

async function cancelReservation(userId, id, mail = sendMail) {
  const owned = await storage.listOwnedReservations(userId);
  const existing = owned.find((item) => item.id === id);
  if (!existing) throw new ContractError("ReservationNotFound");
  if (!canCancelReservation(existing)) throw new ContractError("CannotCancel");
  const saved = await storage.cancelOwned(userId, id);
  if (!saved) throw new ContractError("CannotCancel");
  const user = await storage.findUserById(userId);
  const machine = await storage.findMachineRecord(existing.equipmentId);
  const view = {
    equipment: machine.Type,
    location: machine.Location,
    date: existing.date,
    start: existing.start,
    end: existing.end
  };
  const sent = await deliver(mail, { to: user.email, ...letter("withdrawn", view) });
  return {
    id,
    equipmentId: existing.equipmentId,
    equipment: view.equipment,
    location: view.location,
    date: view.date,
    start: view.start,
    end: view.end,
    status: "Cancelled",
    canConfirm: false,
    canCancel: false,
    mailSent: sent,
    message: sent
      ? "Reservation cancelled. The time slot is free again."
      : "Reservation cancelled. The time slot is free again. The email could not be sent."
  };
}

module.exports = { confirmWindow, canCancelReservation, sweepReservations, confirmReservation, cancelReservation };
