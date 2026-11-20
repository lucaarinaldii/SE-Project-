const assert = require("assert");
const { listEquipment, equipmentDetails } = require("./src/catalogue");
const { statusOf, machineStatus } = require("./src/status");
const { prepareDatabase, listMachineRecords, readStoredStatus, listReservationRecords, deleteUserByEmail, withUsers, deleteReservation, insertReservation } = require("./src/storage");
const { confirmReservation, cancelReservation } = require("./src/confirmation");
const { submitReport } = require("./src/report");
const { currentSession, signIn, registerAccount, accountId } = require("./src/login");
const { buildList, buildDetails, buildAvailability, buildHistory, buildReservation, createReservation } = require("./src/page");
const { slotIsPast } = require("./src/availability");
const { handle } = require("./src/api");

function requestWith(token) {
  return { headers: token ? { "x-session": token } : {} };
}

function request(path, token, options = {}) {
  return new Promise((resolve, reject) => {
    const { EventEmitter } = require("events");
    const req = new EventEmitter();
    req.method = options.method || "GET";
    req.url = path;
    req.headers = token ? { "x-session": token } : {};
    const res = {
      status: 0,
      body: "",
      writeHead(code) { this.status = code; },
      end(data) {
        this.body = data ? data.toString() : "";
        resolve(this);
      }
    };
    Promise.resolve(handle(req, res)).catch(reject);
    if (options.body) {
      const raw = Buffer.from(JSON.stringify(options.body));
      process.nextTick(() => {
        req.emit("data", raw);
        req.emit("end");
      });
    }
  });
}

(async () => {
  try {
    await prepareDatabase();
  } catch (error) {
    console.error("Database is unavailable. Put the Neon connection string in .env.local as DATABASE_URL.");
    console.error(error);
    process.exit(1);
  }
  const disposable = [];
  let bookedId = "";
  let soonId = "";
  let cancelId = "";
  let pastCancelId = "";
  let reportReservationId = "";
  try {
  assert.throws(() => currentSession(requestWith("")), (error) => error.code === "NoSession");
  await assert.rejects(signIn("student@university.edu", "wrong-password"), (error) => error.code === "InvalidCredentials");
  const signed = await signIn("student@university.edu", "makerspace");
  const token = signed.token;
  assert.equal(signed.account.email, "student@university.edu");
  assert.equal(JSON.stringify(signed).includes("passwordHash"), false);
  const session = currentSession(requestWith(token));
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
  const view = await buildList(requestWith(token), "лазерный резак");
  assert.equal(view.equipment[0].status, "blocked");
  assert.equal(view.equipment[0].reason, "Lens replacement");

  const card = await buildDetails(requestWith(token), "eq-printer-1");
  assert.equal(card.status, "blocked");
  assert.match(card.rules, /30 minutes/);
  assert.equal("blockStart" in card, false);

  const reservations = await listReservationRecords();
  assert.equal(reservations.some((item) => "studentId" in item), false);
  assert.deepEqual(Object.keys(reservations[0]).sort(), ["date", "end", "equipmentId", "id", "start", "status"]);

  await assert.rejects(buildAvailability(requestWith(""), "eq-3d-1", "2026-11-19"), (error) => error.code === "NoSession");
  await assert.rejects(buildAvailability(requestWith(token), "missing", "2026-11-19"), (error) => error.code === "EquipmentNotFound");
  await assert.rejects(buildAvailability(requestWith(token), "eq-3d-1", "2026-11-31"), (error) => error.code === "InvalidDate");

  const printerDay = await buildAvailability(requestWith(token), "eq-3d-1", "2026-11-19");
  function shown(day, start) {
    return day.slots.find((slot) => slot.start === start);
  }
  if (slotIsPast("2026-11-19", "09:00")) assert.equal(shown(printerDay, "09:00"), undefined);
  else assert.equal(shown(printerDay, "09:00").state, "free");
  for (const start of ["10:00", "11:00", "14:00"]) {
    if (slotIsPast("2026-11-19", start)) assert.equal(shown(printerDay, start), undefined);
    else assert.equal(shown(printerDay, start).state, "booked");
  }
  assert.equal(printerDay.slots.every((slot) => !slotIsPast("2026-11-19", slot.start)), true);
  assert.equal(printerDay.message, printerDay.slots.length === 0 ? "This time has already passed." : "");
  assert.equal(JSON.stringify(printerDay).includes("studentId"), false);

  const blockedDay = await buildAvailability(requestWith(token), "eq-cutter-1", "2026-11-19");
  assert.equal(blockedDay.slots.every((slot) => slot.state === "unavailable"), true);
  assert.equal(blockedDay.slots.some((slot) => slotIsPast("2026-11-19", slot.start)), false);
  assert.equal(blockedDay.reason, "Lens replacement");
  assert.equal(blockedDay.message, "");

  const openDay = await buildAvailability(requestWith(token), "eq-cutter-1", "2026-12-01");
  assert.equal(openDay.slots.some((slot) => slot.state === "free"), true);
  assert.equal(openDay.reason, "");

  const fullDay = await buildAvailability(requestWith(token), "eq-elec-1", "2026-11-19");
  if (fullDay.slots.length === 0) {
    assert.equal(fullDay.message, "This time has already passed.");
    assert.deepEqual(fullDay.suggestions, []);
  } else {
    assert.equal(fullDay.message, "Fully booked");
    assert.equal(fullDay.slots.every((slot) => slot.state === "booked"), true);
    assert.deepEqual(fullDay.suggestions[0], { date: "2026-11-20", start: "09:00", end: "10:00" });
  }

  const closedMachine = await buildAvailability(requestWith(token), "eq-printer-1", "2026-12-01");
  assert.equal(closedMachine.slots.every((slot) => slot.state === "unavailable"), true);
  assert.equal(closedMachine.period, "until further notice");

  const response = await request("/api/equipment/eq-elec-1/availability?date=2026-11-19", token);
  assert.equal(response.status, 200);
  const fullBody = JSON.parse(response.body);
  assert.equal(fullBody.message, fullBody.slots.length === 0 ? "This time has already passed." : "Fully booked");
  const missingSession = await request("/api/equipment/eq-3d-1/availability?date=2026-11-19", "");
  assert.equal(missingSession.status, 401);

  const httpLogin = await request("/api/login", "", {
    method: "POST",
    body: { email: "student@university.edu", password: "makerspace" }
  });
  assert.equal(httpLogin.status, 200);
  const loginBody = JSON.parse(httpLogin.body);
  assert.equal(loginBody.account.email, "student@university.edu");
  assert.equal(JSON.stringify(loginBody).includes("passwordHash"), false);

  const freshEmail = `check.${Date.now()}@university.edu`;
  disposable.push(freshEmail);
  const created = await registerAccount({ name: "Check Student", email: freshEmail, password: "long-enough" });
  assert.equal(created.account.role, "user");
  assert.equal(JSON.stringify(created).includes("passwordHash"), false);
  const emptyHistory = await buildHistory(requestWith(created.token), {});
  assert.equal(emptyHistory.message, "No reservations yet");
  assert.deepEqual(emptyHistory.reservations, []);
  await assert.rejects(
    registerAccount({ name: "Check Student", email: freshEmail, password: "short" }),
    (error) => error.code === "InvalidRegistration"
  );
  await assert.rejects(
    registerAccount({ name: "Check Student", email: freshEmail, password: "long-enough" }),
    (error) => error.code === "EmailTaken"
  );

  const lockEmail = `lock.${Date.now()}@university.edu`;
  disposable.push(lockEmail);
  await registerAccount({ name: "Lock Student", email: lockEmail, password: "long-enough" });
  await assert.rejects(signIn(lockEmail, "bad-password"), (error) => error.code === "InvalidCredentials");
  await assert.rejects(signIn(lockEmail, "bad-password"), (error) => error.code === "InvalidCredentials");
  await assert.rejects(signIn(lockEmail, "bad-password"), (error) => error.code === "LoginBlocked");
  await assert.rejects(signIn(lockEmail, "long-enough"), (error) => error.code === "LoginBlocked");

  await assert.rejects(buildHistory(requestWith(""), {}), (error) => error.code === "NoSession");
  const history = await buildHistory(requestWith(token), {});
  const historyIds = history.reservations.map((item) => item.id);
  assert.equal(historyIds.includes("res-3d-cancelled"), true);
  assert.equal(historyIds.includes("res-3d-morning"), true);
  assert.equal(historyIds.includes("res-elec-day"), false);
  assert.equal(historyIds.indexOf("res-3d-cancelled") < historyIds.indexOf("res-3d-morning"), true);
  assert.equal(history.reservations.some((item) => "studentId" in item), false);
  assert.equal(history.message, "");
  const cancelled = await buildHistory(requestWith(token), { status: "Cancelled", equipment: "eq-3d-1", date: "2026-11-19" });
  assert.equal(cancelled.reservations.every((item) => item.status === "Cancelled" && item.date === "2026-11-19"), true);
  assert.equal(cancelled.reservations.some((item) => item.id === "res-3d-cancelled"), true);
  const otherDay = await buildHistory(requestWith(token), { date: "2026-12-24" });
  assert.equal(otherDay.message, "No reservations yet");
  await assert.rejects(buildHistory(requestWith(token), { date: "2026-11-31" }), (error) => error.code === "InvalidDate");
  await assert.rejects(buildHistory(requestWith(token), { status: "booked" }), (error) => error.code === "UnknownStatus");
  await assert.rejects(buildReservation(requestWith(token), "res-elec-day"), (error) => error.code === "ReservationNotFound");
  const own = await buildReservation(requestWith(token), "res-3d-morning");
  assert.equal(own.equipment, "3D printer");
  assert.equal(["Awaiting confirmation", "Confirmed", "Completed", "Cancelled"].includes(own.status), true);
  assert.equal("studentId" in own, false);
  const historyResponse = await request("/api/reservations", token);
  assert.equal(historyResponse.status, 200);
  const listed = JSON.parse(historyResponse.body).reservations;
  assert.equal(listed.some((item) => item.id === "res-3d-morning"), true);
  assert.equal(listed.some((item) => item.id === "res-elec-day"), false);
  const hiddenReservation = await request("/api/reservations/res-elec-day", token);
  assert.equal(hiddenReservation.status, 404);

  await assert.rejects(createReservation(requestWith(""), {
    equipmentId: "eq-3d-1", date: "2026-11-20", start: "09:00", end: "10:00"
  }), (error) => error.code === "NoSession");
  await assert.rejects(createReservation(requestWith(token), {
    equipmentId: "eq-3d-1", date: "2026-11-20", start: "09:30", end: "10:30"
  }), (error) => error.code === "InvalidSlot");
  await assert.rejects(createReservation(requestWith(token), {
    equipmentId: "eq-3d-1", date: "2026-11-18", start: "09:00", end: "10:00"
  }), (error) => error.code === "PastSlot");
  await assert.rejects(createReservation(requestWith(token), {
    equipmentId: "eq-3d-1", date: "2026-11-19", start: "10:00", end: "11:00"
  }), (error) => error.code === (slotIsPast("2026-11-19", "10:00") ? "PastSlot" : "SlotTaken"));
  await assert.rejects(createReservation(requestWith(token), {
    equipmentId: "eq-cutter-1", date: "2026-11-25", start: "09:00", end: "10:00"
  }), (error) => error.code === (slotIsPast("2026-11-25", "09:00") ? "PastSlot" : "MachineBlocked"));
  const made = await createReservation(requestWith(token), {
    equipmentId: "eq-3d-1", date: "2026-11-20", start: "09:00", end: "10:00"
  });
  bookedId = made.id;
  assert.equal(made.status, "Awaiting confirmation");
  assert.equal(made.message, "Reservation created. Status: Awaiting confirmation.");
  assert.equal("studentId" in made, false);
  await assert.rejects(createReservation(requestWith(token), {
    equipmentId: "eq-3d-1", date: "2026-11-20", start: "09:00", end: "10:00"
  }), (error) => error.code === "SlotTaken" && error.suggestions.length > 0);
  const bookedDay = await buildHistory(requestWith(token), { date: "2026-11-20" });
  assert.equal(bookedDay.reservations.some((item) => item.id === bookedId), true);
  assert.equal(bookedDay.reservations.every((item) => item.date === "2026-11-20"), true);
  const taken = await request("/api/reservations", token, {
    method: "POST",
    body: { equipmentId: "eq-3d-1", date: "2026-11-20", start: "09:00", end: "10:00" }
  });
  assert.equal(taken.status, 409);
  assert.equal(JSON.parse(taken.body).error, "SlotTaken");
  const userId = await accountId(requestWith(token));
  await assert.rejects(
    confirmReservation(userId, bookedId, async () => true),
    (error) => error.code === "CannotConfirm"
  );
  assert.equal((await buildReservation(requestWith(token), bookedId)).canConfirm, false);

  const soonStart = new Date(Date.now() + 8 * 60 * 1000);
  const soonEnd = new Date(soonStart.getTime() + 20 * 60 * 1000);
  const stamp = (date) => {
    const pad = (value) => String(value).padStart(2, "0");
    return {
      date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      time: `${pad(date.getHours())}:${pad(date.getMinutes())}`
    };
  };
  const startStamp = stamp(soonStart);
  const endStamp = stamp(soonEnd);
  if (startStamp.date === endStamp.date) {
    soonId = "res-check-soon";
    await insertReservation({
      id: soonId,
      equipmentId: "eq-printer-1",
      studentId: userId,
      date: startStamp.date,
      start: startStamp.time,
      end: endStamp.time,
      status: "Awaiting confirmation"
    });
    assert.equal((await buildReservation(requestWith(token), soonId)).canConfirm, true);
    let mailed = 0;
    const confirmed = await confirmReservation(userId, soonId, async () => {
      mailed += 1;
      return true;
    });
    assert.equal(confirmed.status, "Confirmed");
    assert.equal(confirmed.mailSent, true);
    assert.equal(confirmed.message, "Reservation confirmed.");
    assert.equal(mailed, 1);
    const again = await request(`/api/reservations/${soonId}/confirm`, token, { method: "POST" });
    assert.equal(again.status, 409);
    assert.equal(JSON.parse(again.body).error, "CannotConfirm");
  }

  cancelId = "res-check-cancel";
  await insertReservation({
    id: cancelId,
    equipmentId: "eq-elec-1",
    studentId: userId,
    date: "2026-11-21",
    start: "10:00",
    end: "11:00",
    status: "Awaiting confirmation"
  });
  const cancellable = await buildReservation(requestWith(token), cancelId);
  assert.equal(cancellable.canCancel, true);
  assert.equal(cancellable.canConfirm, false);
  let cancelMails = 0;
  const withdrawn = await cancelReservation(userId, cancelId, async () => {
    cancelMails += 1;
    return true;
  });
  assert.equal(withdrawn.status, "Cancelled");
  assert.equal(withdrawn.canCancel, false);
  assert.equal(withdrawn.message, "Reservation cancelled. The time slot is free again.");
  assert.equal(cancelMails, 1);
  const cancelAgain = await request(`/api/reservations/${cancelId}/cancel`, token, { method: "POST" });
  assert.equal(cancelAgain.status, 409);
  assert.equal(JSON.parse(cancelAgain.body).error, "CannotCancel");

  pastCancelId = "res-check-past-cancel";
  await insertReservation({
    id: pastCancelId,
    equipmentId: "eq-elec-1",
    studentId: userId,
    date: "2026-11-18",
    start: "10:00",
    end: "11:00",
    status: "Awaiting confirmation"
  });
  await assert.rejects(
    cancelReservation(userId, pastCancelId, async () => true),
    (error) => error.code === "CannotCancel"
  );
  assert.equal((await buildReservation(requestWith(token), pastCancelId)).status, "Awaiting confirmation");
  assert.equal((await buildReservation(requestWith(token), pastCancelId)).canReport, false);

  reportReservationId = "res-check-report";
  await insertReservation({
    id: reportReservationId,
    equipmentId: "eq-elec-1",
    studentId: userId,
    date: "2026-11-22",
    start: "15:00",
    end: "16:00",
    status: "Confirmed"
  });
  assert.equal((await buildReservation(requestWith(token), reportReservationId)).canReport, true);
  await assert.rejects(
    submitReport(userId, reportReservationId, { issueType: "", description: "" }, async () => true),
    (error) => error.code === "ReportIncomplete"
  );
  const reported = await submitReport(userId, reportReservationId, {
    issueType: "Not working",
    description: "The nozzle does not heat."
  }, async () => true);
  assert.equal(reported.status, "Open");
  assert.equal(reported.mailSent, false);
  assert.equal(reported.message, "Report submitted. Status: Open. The staff could not be notified.");
  const reportResponse = await request(`/api/reservations/${reportReservationId}/report`, token, {
    method: "POST",
    body: { issueType: "Other", description: "Again" }
  });
  assert.equal(reportResponse.status, 409);
  assert.equal(JSON.parse(reportResponse.body).error, "ReportExists");
  const saved = await buildReservation(requestWith(token), reportReservationId);
  assert.equal(saved.canReport, false);
  assert.equal(saved.report.status, "Open");
  assert.equal(saved.report.issueType, "Not working");

  console.log("contracts ok");
  } finally {
    if (bookedId) await deleteReservation(bookedId);
    if (soonId) await deleteReservation(soonId);
    if (cancelId) await deleteReservation(cancelId);
    if (pastCancelId) await deleteReservation(pastCancelId);
    if (reportReservationId) await deleteReservation(reportReservationId);
    for (const email of disposable) await deleteUserByEmail(email);
    await withUsers((users) => {
      const user = users.find((item) => item.email === "student@university.edu");
      if (!user) return;
      user.failedAttempts = 0;
      user.lockedUntil = "";
    });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
