const fs = require("fs/promises");
const path = require("path");
const { ContractError } = require("./errors");
const { buildList, buildDetails } = require("./page");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8"
};

const HTTP_STATUS = {
  NoSession: 401,
  UnknownType: 422,
  EquipmentNotFound: 404,
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
  sendJson(res, HTTP_STATUS[code] || 500, { error: code });
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
    "Content-Length": data.length
  });
  res.end(data);
}

async function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  try {
    if (req.method === "GET" && url.pathname === "/api/catalogue") {
      sendJson(res, 200, await buildList(req, url.searchParams.get("type") ?? ""));
      return;
    }
    if (req.method === "GET" && url.pathname.startsWith("/api/equipment/")) {
      const id = decodeURIComponent(url.pathname.slice("/api/equipment/".length));
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
