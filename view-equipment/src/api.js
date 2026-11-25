const fs = require("fs/promises");
const path = require("path");
const { ContractError } = require("./errors");
const { buildList, buildDetails, buildAvailability, buildHistory, buildAllReservations, buildReservation, createReservation, confirmOwnedReservation, cancelOwnedReservation, reportOwnedReservation, buildStaffEquipment, blockStaffEquipment, unblockStaffEquipment, buildTickets, updateTicket, messageStaffUser, buildAccounts, suspendStaffAccount, reactivateStaffAccount, buildMaterials, updateMaterialLevel } = require("./page");
const { currentAccount, signIn, registerAccount, signOut } = require("./login");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8"
};

const HTTP_STATUS = {
  NoSession: 401,
  InvalidCredentials: 401,
  LoginBlocked: 423,
  AccountSuspended: 423,
  CannotSuspend: 409,
  SuspensionIncomplete: 422,
  InvalidQuantity: 422,
  EmailTaken: 409,
  InvalidRegistration: 422,
  UnknownType: 422,
  InvalidDate: 422,
  UnknownStatus: 422,
  InvalidSlot: 422,
  PastSlot: 422,
  SlotTaken: 409,
  MachineBlocked: 409,
  CannotConfirm: 409,
  CannotCancel: 409,
  CannotReport: 409,
  ReportIncomplete: 422,
  ReportExists: 409,
  BlockIncomplete: 422,
  BlockAfterSession: 422,
  EquipmentNotFound: 404,
  ReservationNotFound: 404,
  TicketNotFound: 404,
  UserNotFound: 404,
  MessageIncomplete: 422,
  StorageUnavailable: 503,
  Forbidden: 403,
  NotFound: 404
};

// Turns a request into a call and writes the response. It does not decide catalogue rules.
function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendError(res, error) {
  const code = error instanceof ContractError ? error.code : "UnexpectedError";
  const payload = { error: code };
  if (error instanceof ContractError && Array.isArray(error.suggestions)) payload.suggestions = error.suggestions;
  sendJson(res, HTTP_STATUS[code] || 500, payload);
}

async function serveStatic(res, pathname) {
  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname === "/" ? "index.html" : pathname));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, HTTP_STATUS.Forbidden, { error: "Forbidden" });
    return;
  }
  const data = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
    "Content-Length": data.length,
    "Cache-Control": "no-cache"
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let failed = false;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 100000) {
        failed = true;
        reject(new ContractError("InvalidRegistration"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (failed) return;
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          reject(new ContractError("InvalidRegistration"));
          return;
        }
        resolve(parsed);
      } catch {
        reject(new ContractError("InvalidRegistration"));
      }
    });
    req.on("error", () => reject(new ContractError("InvalidRegistration")));
  });
}

async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  try {
    if (req.method === "POST" && url.pathname === "/api/login") {
      const body = await readBody(req);
      sendJson(res, 200, await signIn(body.email, body.password));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/register") {
      const body = await readBody(req);
      sendJson(res, 201, await registerAccount(body));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/logout") {
      sendJson(res, 200, signOut(req));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/me") {
      sendJson(res, 200, await currentAccount(req));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/reservations") {
      const body = await readBody(req);
      sendJson(res, 201, await createReservation(req, body));
      return;
    }
    const confirmMatch = url.pathname.match(/^\/api\/reservations\/([^/]+)\/confirm$/);
    if (req.method === "POST" && confirmMatch) {
      sendJson(res, 200, await confirmOwnedReservation(req, decodeURIComponent(confirmMatch[1])));
      return;
    }
    const cancelMatch = url.pathname.match(/^\/api\/reservations\/([^/]+)\/cancel$/);
    if (req.method === "POST" && cancelMatch) {
      sendJson(res, 200, await cancelOwnedReservation(req, decodeURIComponent(cancelMatch[1])));
      return;
    }
    const reportMatch = url.pathname.match(/^\/api\/reservations\/([^/]+)\/report$/);
    if (req.method === "POST" && reportMatch) {
      const body = await readBody(req);
      sendJson(res, 201, await reportOwnedReservation(req, decodeURIComponent(reportMatch[1]), body));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/staff/messages") {
      const body = await readBody(req);
      sendJson(res, 200, await messageStaffUser(req, body));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/staff/reservations") {
      sendJson(res, 200, await buildAllReservations(req, {
        date: url.searchParams.get("date") ?? "",
        equipment: url.searchParams.get("equipment") ?? "",
        status: url.searchParams.get("status") ?? "",
        user: url.searchParams.get("user") ?? ""
      }));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/reservations") {
      sendJson(res, 200, await buildHistory(req, {
        date: url.searchParams.get("date") ?? "",
        equipment: url.searchParams.get("equipment") ?? "",
        status: url.searchParams.get("status") ?? ""
      }));
      return;
    }
    const reservationMatch = url.pathname.match(/^\/api\/reservations\/([^/]+)$/);
    if (req.method === "GET" && reservationMatch) {
      sendJson(res, 200, await buildReservation(req, decodeURIComponent(reservationMatch[1])));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/tickets") {
      sendJson(res, 200, await buildTickets(req, {
        group: url.searchParams.get("group") ?? "",
        equipment: url.searchParams.get("equipment") ?? "",
        date: url.searchParams.get("date") ?? ""
      }));
      return;
    }
    const ticketMatch = url.pathname.match(/^\/api\/tickets\/([^/]+)\/status$/);
    if (req.method === "POST" && ticketMatch) {
      const body = await readBody(req);
      sendJson(res, 200, await updateTicket(req, decodeURIComponent(ticketMatch[1]), body));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/staff/equipment") {
      sendJson(res, 200, await buildStaffEquipment(req));
      return;
    }
    const blockMatch = url.pathname.match(/^\/api\/staff\/equipment\/([^/]+)\/block$/);
    if (req.method === "POST" && blockMatch) {
      const body = await readBody(req);
      sendJson(res, 200, await blockStaffEquipment(req, decodeURIComponent(blockMatch[1]), body));
      return;
    }
    const unblockMatch = url.pathname.match(/^\/api\/staff\/equipment\/([^/]+)\/unblock$/);
    if (req.method === "POST" && unblockMatch) {
      const body = await readBody(req);
      sendJson(res, 200, await unblockStaffEquipment(req, decodeURIComponent(unblockMatch[1])));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/staff/accounts") {
      sendJson(res, 200, await buildAccounts(req));
      return;
    }
    const suspendMatch = url.pathname.match(/^\/api\/staff\/accounts\/([^/]+)\/suspend$/);
    if (req.method === "POST" && suspendMatch) {
      const body = await readBody(req);
      sendJson(res, 200, await suspendStaffAccount(req, decodeURIComponent(suspendMatch[1]), body));
      return;
    }
    const reactivateMatch = url.pathname.match(/^\/api\/staff\/accounts\/([^/]+)\/reactivate$/);
    if (req.method === "POST" && reactivateMatch) {
      sendJson(res, 200, await reactivateStaffAccount(req, decodeURIComponent(reactivateMatch[1])));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/materials") {
      sendJson(res, 200, await buildMaterials(req));
      return;
    }
    const levelMatch = url.pathname.match(/^\/api\/staff\/materials\/([^/]+)\/level$/);
    if (req.method === "POST" && levelMatch) {
      const body = await readBody(req);
      sendJson(res, 200, await updateMaterialLevel(req, decodeURIComponent(levelMatch[1]), body));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/catalogue") {
      sendJson(res, 200, await buildList(req, url.searchParams.get("type") ?? ""));
      return;
    }
    const availabilityMatch = url.pathname.match(/^\/api\/equipment\/([^/]+)\/availability$/);
    if (req.method === "GET" && availabilityMatch) {
      const id = decodeURIComponent(availabilityMatch[1]);
      sendJson(res, 200, await buildAvailability(req, id, url.searchParams.get("date") ?? ""));
      return;
    }
    if (req.method === "GET" && url.pathname.startsWith("/api/equipment/")) {
      const id = decodeURIComponent(url.pathname.slice("/api/equipment/".length));
      if (id.includes("/")) {
        sendJson(res, HTTP_STATUS.NotFound, { error: "NotFound" });
        return;
      }
      sendJson(res, 200, await buildDetails(req, id));
      return;
    }
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/styles.css" || url.pathname === "/app.js")) {
      await serveStatic(res, url.pathname);
      return;
    }
    sendJson(res, HTTP_STATUS.NotFound, { error: "NotFound" });
  } catch (error) {
    sendError(res, error);
  }
}

module.exports = { handle };
