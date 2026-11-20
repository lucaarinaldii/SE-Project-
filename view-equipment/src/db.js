const fs = require("fs");
const path = require("path");
const ws = require("ws");
const { Pool, neonConfig } = require("@neondatabase/serverless");
const { ContractError } = require("./errors");

neonConfig.webSocketConstructor = ws;

function loadEnvFile() {
  for (const name of [".env", ".env.local"]) {
    const file = path.join(__dirname, "..", name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith("\"") && value.endsWith("\""))
        || (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

loadEnvFile();

const pools = { app: null, direct: null };

function connectionString(direct) {
  const value = direct
    ? (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)
    : process.env.DATABASE_URL;
  if (!value) throw new ContractError("StorageUnavailable");
  return value;
}

function getPool(direct) {
  const key = direct ? "direct" : "app";
  if (!pools[key]) {
    const url = connectionString(direct);
    pools[key] = new Pool({
      connectionString: url,
      max: direct ? 2 : 10
    });
    pools[key].on("error", (error) => {
      console.error(error.message);
    });
  }
  return pools[key];
}

async function withClient(work, options = {}) {
  let client;
  try {
    client = await getPool(options.direct).connect();
  } catch (error) {
    if (error instanceof ContractError) throw error;
    console.error(error.message);
    throw new ContractError("StorageUnavailable");
  }
  try {
    return await work(client);
  } finally {
    client.release();
  }
}

module.exports = { withClient };
