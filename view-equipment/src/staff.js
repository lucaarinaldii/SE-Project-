const storage = require("./storage");
const { statusOf, machineStatus } = require("./status");
const { sendMail } = require("./mail");
const { ContractError } = require("./errors");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function prettyDate(value) {
  const [, month, day] = value.split("-").map(Number);
  const year = value.slice(0, 4);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

async function listStaffEquipment() {
  const records = await storage.listMachineRecords();
  const statuses = await statusOf(records.map((item) => item.id));
  const byId = new Map(statuses.map((item) => [item.id, item]));
  return {
    equipment: records.map((item) => {
      const status = byId.get(item.id);
      return {
        id: item.id,
        type: item.Type,
        location: item.Location,
        serial: item.serial || "",
        status: status.state,
        reason: status.reason || "",
        period: status.period || "",
        blockStart: status.blockStart || "",
        blockEnd: status.blockEnd || ""
      };
    })
  };
}

function todayIso(now) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function nextDay(value) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  const monthText = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dayText = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${monthText}-${dayText}`;
}

function clockNow(now) {
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function parseBlock(input) {
  const reason = String(input && input.reason || "").trim();
  const openEnded = input && input.untilFurtherNotice === true;
  const blockStart = String(input && input.blockStart || "");
  const blockEnd = String(input && input.blockEnd || "");
  const periodOk = openEnded || (isIsoDate(blockStart) && isIsoDate(blockEnd) && blockStart <= blockEnd);
  if (!reason || reason.length > 200 || !periodOk) throw new ContractError("BlockIncomplete");
  return { reason, openEnded, blockStart: openEnded ? "" : blockStart, blockEnd: openEnded ? "" : blockEnd };
}

function periodText(block) {
  if (!block.blockStart && !block.blockEnd) return "until further notice";
  if (block.blockStart && !block.blockEnd) return `${prettyDate(block.blockStart)} – until further notice`;
  return `${prettyDate(block.blockStart)} – ${prettyDate(block.blockEnd)}`;
}

function covers(block, date) {
  if (block.blockStart && date < block.blockStart) return false;
  if (block.blockEnd && date > block.blockEnd) return false;
  return true;
}

function publicReservation(row) {
  return {
    id: row.id,
    name: row.name || "Unknown user",
    date: row.date,
    start: row.start,
    end: row.end,
    status: row.status
  };
}

async function reservationsFor(id, block, now) {
  const start = block.blockStart || (block.openEnded ? todayIso(now) : "");
  const rows = await storage.listPeriodReservations(id, start, block.blockEnd);
  return rows.filter((row) => covers({ ...block, blockStart: start }, row.date));
}

function activeSession(rows, now) {
  const today = todayIso(now);
  const clock = clockNow(now);
  return rows.find((row) => row.date === today && row.start <= clock && clock < row.end) || null;
}

function afterSession(block, session) {
  const start = nextDay(session.date);
  if (!block.openEnded && start > block.blockEnd) throw new ContractError("BlockAfterSession");
  return {
    ...block,
    blockStart: start,
    blockEnd: block.openEnded ? "" : block.blockEnd
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

async function blockEquipment(id, input, mail = sendMail, now = new Date()) {
  await storage.findMachineRecord(id);
  const requested = parseBlock(input);
  const current = await machineStatus(id);
  const listed = await reservationsFor(id, requested, now);
  const session = activeSession(listed, now);
  const confirm = input && input.confirm === true;
  if (!confirm && (listed.length > 0 || session)) {
    return {
      preview: true,
      alreadyBlocked: current.state === "blocked",
      reservations: listed.map(publicReservation),
      activeSession: session ? publicReservation(session) : null,
      message: session
        ? "This machine is in use. Block it now, or after the current session ends."
        : "Choose which reservations to cancel."
    };
  }
  const block = input && input.when === "after" && session ? afterSession(requested, session) : requested;
  const stillListed = input && input.when === "after" && session ? await reservationsFor(id, block, now) : listed;
  const allowed = new Set(stillListed.map((row) => row.id));
  const cancelIds = Array.isArray(input && input.cancelIds) ? input.cancelIds.filter((item) => allowed.has(item)) : [];
  const saved = {
    reason: block.reason,
    period: periodText(block),
    blockStart: block.blockStart,
    blockEnd: block.blockEnd
  };
  const cancelled = await storage.blockMachineAndCancel(id, saved, cancelIds);
  const cancelledRows = stillListed.filter((row) => cancelled.includes(row.id));
  let notified = 0;
  for (const row of cancelledRows) {
    if (!row.email) continue;
    const sent = await deliver(mail, {
      to: row.email,
      subject: "Reservation cancelled",
      text: [
        "Staff blocked this machine and cancelled your reservation.",
        `Reason: ${block.reason}`,
        `${row.date} ${row.start}–${row.end}`,
        "Status: Cancelled"
      ].join("\n")
    });
    if (sent) notified += 1;
  }
  const needsMail = cancelledRows.some((row) => row.email);
  const mailFailed = needsMail && notified < cancelledRows.filter((row) => row.email).length;
  return {
    id,
    preview: false,
    status: "blocked",
    reason: saved.reason,
    period: saved.period,
    cancelled: cancelled.length,
    mailSent: needsMail && !mailFailed,
    message: mailFailed
      ? "Machine blocked. The affected users could not be notified."
      : current.state === "blocked" ? "Block updated." : "Machine blocked."
  };
}

async function unblockEquipment(id) {
  await storage.findMachineRecord(id);
  await storage.setMachineBlock(id, { open: true, reason: "", period: "", blockStart: "", blockEnd: "" });
  return { id, status: "open", message: "Machine unblocked." };
}

module.exports = { listStaffEquipment, blockEquipment, unblockEquipment };
