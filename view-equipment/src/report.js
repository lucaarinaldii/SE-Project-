const crypto = require("crypto");
const storage = require("./storage");
const { sendMail } = require("./mail");
const { ContractError } = require("./errors");

const ISSUE_TYPES = ["Not working", "Unsafe to use", "Other"];
const RECENT_MS = 24 * 60 * 60 * 1000;

function endOf(date, end) {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, mins] = end.split(":").map(Number);
  return new Date(year, month - 1, day, hours, mins, 0, 0);
}

function canReport(reservation, now = new Date()) {
  if (!reservation) return false;
  if (reservation.status === "Confirmed") return true;
  if (reservation.status !== "Completed") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reservation.date) || !/^\d{2}:\d{2}$/.test(reservation.end)) return false;
  const age = now.getTime() - endOf(reservation.date, reservation.end).getTime();
  return age >= 0 && age <= RECENT_MS;
}

async function submitReport(userId, reservationId, input, mail = sendMail) {
  const reservation = await storage.findOwnedReservation(userId, reservationId);
  if (!reservation) throw new ContractError("ReservationNotFound");
  if (!canReport(reservation)) throw new ContractError("CannotReport");
  const issueType = String(input && input.issueType || "");
  const description = String(input && input.description || "").trim();
  if (!ISSUE_TYPES.includes(issueType) || !description) throw new ContractError("ReportIncomplete");
  if (await storage.findReportByReservation(reservationId)) throw new ContractError("ReportExists");
  const id = `report-${crypto.randomBytes(4).toString("hex")}`;
  await storage.insertReport({
    id,
    reservationId,
    equipmentId: reservation.equipmentId,
    userId,
    issueType,
    description,
    status: "Open",
    createdAt: new Date().toISOString()
  });
  const machine = await storage.findMachineRecord(reservation.equipmentId);
  const staff = await storage.listStaffEmails();
  let mailSent = staff.length > 0;
  for (const email of staff) {
    const sent = await mail({
      to: email,
      subject: "Equipment report",
      text: [
        "A user reported a problem with equipment they used.",
        `${machine.Type}, ${machine.Location}`,
        `${reservation.date} ${reservation.start}–${reservation.end}`,
        `Issue: ${issueType}`,
        description,
        "Status: Open"
      ].join("\n")
    });
    if (!sent) mailSent = false;
  }
  return {
    id,
    status: "Open",
    issueType,
    description,
    mailSent,
    message: mailSent
      ? "Report submitted. Status: Open."
      : "Report submitted. Status: Open. The staff could not be notified."
  };
}

module.exports = { canReport, submitReport, ISSUE_TYPES };
