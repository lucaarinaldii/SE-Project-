const http = require("http");
const { handle } = require("./src/api");

const port = Number(process.env.PORT || 3010);
const host = process.env.HOST || "127.0.0.1";

http.createServer((req, res) => {
  handle(req, res);
}).listen(port, host, () => {
  console.log(`View equipment at http://${host}:${port}`);
});
