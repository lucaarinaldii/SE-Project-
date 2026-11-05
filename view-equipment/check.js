const assert = require("assert");
const { listEquipment, equipmentDetails } = require("./src/catalogue");
const { statusOf, machineStatus } = require("./src/status");
const { listMachineRecords, readStoredStatus } = require("./src/storage");
const { currentSession } = require("./src/login");
const { buildList, buildDetails } = require("./src/page");

function requestWith(token) {
  return { headers: token ? { "x-session": token } : {} };
}

(async () => {
  assert.throws(() => currentSession(requestWith("")), (error) => error.code === "NoSession");
  const session = currentSession(requestWith("demo-session"));
  assert.deepEqual(session, { signedIn: true });
  assert.equal("password" in session, false);

  await assert.rejects(listEquipment("printer"), (error) => error.code === "UnknownType");

  const all = await listEquipment("");
  assert.equal(all.some((item) => item.type === "printer"), true);
  assert.equal(all.every((item) => !("status" in item) && !("Min_Threshold" in item)), true);

  const printers = await listEquipment("3D-принтер");
  assert.deepEqual(printers.map((item) => item.type), ["3D printer"]);

  for (const record of await listMachineRecords()) {
    assert.deepEqual(Object.keys(record).sort(), ["Location", "Max_Booking_Duration", "Type", "description", "id"]);
  }

  const blocked = await machineStatus("eq-cutter-1");
  assert.equal(blocked.state, "blocked");
  assert.equal("Is_Open" in blocked, false);
  assert.deepEqual(await machineStatus("eq-3d-1"), { state: "open" });
  assert.equal((await readStoredStatus("eq-cutter-1")).reason, "Lens replacement");
  assert.equal((await statusOf(printers.map((item) => item.id))).length, 1);

  const details = await equipmentDetails("eq-3d-1");
  assert.equal(details.rules, "Maximum booking duration: 180 minutes.");
  assert.equal("Max_Booking_Duration" in details, false);

  await assert.rejects(buildList(requestWith(""), ""), (error) => error.code === "NoSession");
  const view = await buildList(requestWith("demo-session"), "лазерный резак");
  assert.equal(view.equipment[0].status, "blocked");
  assert.equal(view.equipment[0].reason, "Lens replacement");

  const card = await buildDetails(requestWith("demo-session"), "eq-printer-1");
  assert.equal(card.status, "blocked");
  assert.match(card.rules, /30 minutes/);

  console.log("contracts ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
