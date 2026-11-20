const http = require("http");
const { handle } = require("./src/api");
const { prepareDatabase } = require("./src/storage");
const { sweepReservations } = require("./src/confirmation");

const port = Number(process.env.PORT || 3010);
const host = process.env.HOST || "127.0.0.1";

prepareDatabase().then(() => {
  http.createServer((req, res) => {
    handle(req, res);
  }).listen(port, host, () => {
    console.log(`View equipment at http://${host}:${port}`);
    let sweeping = false;
    const tick = () => {
      if (sweeping) return;
      sweeping = true;
      sweepReservations()
        .catch((error) => console.error(error.message))
        .finally(() => { sweeping = false; });
    };
    tick();
    setInterval(tick, 60 * 1000);
  });
}).catch(() => {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL in .env.local to the Neon connection string.");
  } else {
    console.error("Database is unavailable.");
  }
  process.exit(1);
});
