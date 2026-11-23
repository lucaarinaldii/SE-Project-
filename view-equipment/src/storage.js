const fs = require("fs/promises");
const path = require("path");
const { ContractError } = require("./errors");
const { withClient } = require("./db");

const DATA_DIR = path.join(__dirname, "..", "data");
const USER_LOCK = 4815162342;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS equipment (
  id text PRIMARY KEY,
  type text NOT NULL,
  location text NOT NULL,
  max_booking_duration integer,
  min_threshold integer,
  description text NOT NULL DEFAULT '',
  get_status boolean NOT NULL,
  is_open boolean NOT NULL,
  reason text NOT NULL DEFAULT '',
  period text NOT NULL DEFAULT '',
  block_start text NOT NULL DEFAULT '',
  block_end text NOT NULL DEFAULT '',
  position integer NOT NULL,
  serial_number text NOT NULL DEFAULT ''
)`,
  `CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until text NOT NULL DEFAULT ''
)`,
  `CREATE TABLE IF NOT EXISTS reservations (
  id text PRIMARY KEY,
  equipment_id text NOT NULL REFERENCES equipment (id),
  student_id text NOT NULL,
  reservation_date text NOT NULL,
  start_text text NOT NULL,
  end_text text NOT NULL,
  start_minute integer NOT NULL,
  end_minute integer NOT NULL,
  status text NOT NULL CHECK (status IN ('Awaiting confirmation', 'Confirmed', 'Completed', 'Cancelled')),
  reminder_sent_at text NOT NULL DEFAULT '',
  CHECK (start_minute < end_minute),
  CONSTRAINT reservations_no_overlap EXCLUDE USING gist (
    equipment_id WITH =,
    reservation_date WITH =,
    int4range(start_minute, end_minute) WITH &&
  ) WHERE (status <> 'Cancelled')
)`,
  `CREATE TABLE IF NOT EXISTS reports (
  id text PRIMARY KEY,
  reservation_id text NOT NULL UNIQUE REFERENCES reservations (id) ON DELETE CASCADE,
  equipment_id text NOT NULL,
  user_id text NOT NULL,
  issue_type text NOT NULL,
  description text NOT NULL,
  status text NOT NULL CHECK (status IN ('Open', 'In progress', 'Maintenance requested', 'Resolved', 'Rejected')),
  created_at text NOT NULL
)`
];

function minutes(clock) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(clock));
  if (!match) throw new ContractError("StorageUnavailable");
  return Number(match[1]) * 60 + Number(match[2]);
}

function catalogueRecord(row) {
  return {
    id: row.id,
    Type: row.type,
    Location: row.location,
    Max_Booking_Duration: row.max_booking_duration,
    description: row.description ?? "",
    serial: row.serial_number ?? ""
  };
}

function statusRecord(row) {
  return {
    value: { Get_Status: row.get_status, Is_Open: row.is_open },
    reason: row.reason ?? "",
    period: row.period ?? "",
    blockStart: row.block_start ?? "",
    blockEnd: row.block_end ?? ""
  };
}

function reservationRecord(row) {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    date: row.reservation_date,
    start: row.start_text,
    end: row.end_text,
    status: row.status
  };
}

function userRecord(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    failedAttempts: row.failed_attempts,
    lockedUntil: row.locked_until ?? ""
  };
}

async function readJson(name) {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, name), "utf8");
    return JSON.parse(raw);
  } catch {
    throw new ContractError("StorageUnavailable");
  }
}

async function query(sql, params) {
  return withClient(async (client) => {
    try {
      return await client.query(sql, params);
    } catch (error) {
      console.error(error.message);
      throw new ContractError("StorageUnavailable");
    }
  });
}

async function seedEquipment(client, machines) {
  for (let index = 0; index < machines.length; index += 1) {
    const machine = machines[index];
    const flags = machine.storedStatus || {};
    await client.query(
      `INSERT INTO equipment (
        id, type, location, max_booking_duration, min_threshold, description,
        get_status, is_open, reason, period, block_start, block_end, position, serial_number
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (id) DO UPDATE
      SET serial_number = CASE
        WHEN equipment.serial_number = '' THEN EXCLUDED.serial_number
        ELSE equipment.serial_number
      END`,
      [
        machine.id,
        machine.Type,
        machine.Location,
        machine.Max_Booking_Duration ?? null,
        machine.Min_Threshold ?? null,
        machine.description ?? "",
        flags.Get_Status === true,
        flags.Is_Open === true,
        machine.reason ?? "",
        machine.period ?? "",
        machine.blockStart ?? "",
        machine.blockEnd ?? "",
        index,
        machine.serial || ""
      ]
    );
  }
}

async function seedUsers(client, users) {
  for (const user of users) {
    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role, failed_attempts, locked_until)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [user.id, user.name, user.email, user.passwordHash, user.role, Number(user.failedAttempts || 0), user.lockedUntil || ""]
    );
  }
}

async function seedReservations(client, reservations) {
  for (const reservation of reservations) {
    await client.query(
      `INSERT INTO reservations (
        id, equipment_id, student_id, reservation_date, start_text, end_text, start_minute, end_minute, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        reservation.id,
        reservation.equipmentId,
        reservation.studentId,
        reservation.date,
        reservation.start,
        reservation.end,
        minutes(reservation.start),
        minutes(reservation.end),
        reservation.status
      ]
    );
  }
}

async function prepareDatabase() {
  return withClient(async (client) => {
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS btree_gist");
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [USER_LOCK]);
      for (const statement of SCHEMA) await client.query(statement);
      await client.query("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reminder_sent_at text NOT NULL DEFAULT ''");
      await client.query("ALTER TABLE equipment ADD COLUMN IF NOT EXISTS serial_number text NOT NULL DEFAULT ''");
      await seedEquipment(client, await readJson("equipment.json"));
      await client.query("CREATE UNIQUE INDEX IF NOT EXISTS equipment_serial_number_key ON equipment (serial_number)");
      const userCount = await client.query("SELECT COUNT(*)::int AS n FROM users");
      if (userCount.rows[0].n === 0) await seedUsers(client, await readJson("users.json"));
      const reservationCount = await client.query("SELECT COUNT(*)::int AS n FROM reservations");
      if (reservationCount.rows[0].n === 0) await seedReservations(client, await readJson("reservations.json"));
      await client.query("COMMIT");
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch { /* the connection may already be closed */ }
      if (error instanceof ContractError) throw error;
      console.error(error.message);
      throw new ContractError("StorageUnavailable");
    }
  }, { direct: true });
}

async function listMachineRecords() {
  const result = await query(
    `SELECT id, type, location, max_booking_duration, description, serial_number
     FROM equipment ORDER BY position, id`
  );
  return result.rows.map(catalogueRecord);
}

async function findMachineRecord(id) {
  const result = await query(
    `SELECT id, type, location, max_booking_duration, description, serial_number
     FROM equipment WHERE id = $1`,
    [id]
  );
  if (result.rowCount === 0) throw new ContractError("EquipmentNotFound");
  return catalogueRecord(result.rows[0]);
}

async function setMachineBlock(id, block) {
  const result = await query(
    `UPDATE equipment
     SET get_status = true, is_open = $2, reason = $3, period = $4, block_start = $5, block_end = $6
     WHERE id = $1`,
    [id, block.open === true, block.reason || "", block.period || "", block.blockStart || "", block.blockEnd || ""]
  );
  if (result.rowCount !== 1) throw new ContractError("EquipmentNotFound");
}

async function readStoredStatus(id) {
  const result = await query(
    `SELECT get_status, is_open, reason, period, block_start, block_end
     FROM equipment WHERE id = $1`,
    [id]
  );
  if (result.rowCount === 0) throw new ContractError("EquipmentNotFound");
  return statusRecord(result.rows[0]);
}

async function listPeriodReservations(equipmentId, start, end) {
  const result = await query(
    `SELECT r.id, r.student_id, r.reservation_date, r.start_text, r.end_text, r.status,
            u.email, u.name
     FROM reservations r
     LEFT JOIN users u ON u.id = r.student_id
     WHERE r.equipment_id = $1
       AND r.status IN ('Awaiting confirmation', 'Confirmed')
       AND ($2 = '' OR r.reservation_date >= $2)
       AND ($3 = '' OR r.reservation_date <= $3)
     ORDER BY r.reservation_date, r.start_minute, r.id`,
    [equipmentId, start || "", end || ""]
  );
  return result.rows.map((row) => ({
    id: row.id,
    studentId: row.student_id,
    date: row.reservation_date,
    start: row.start_text,
    end: row.end_text,
    status: row.status,
    email: row.email || "",
    name: row.name || ""
  }));
}

async function blockMachineAndCancel(equipmentId, block, ids) {
  return withClient(async (client) => {
    try {
      await client.query("BEGIN");
      let cancelled = [];
      if (ids.length > 0) {
        const result = await client.query(
          `UPDATE reservations SET status = 'Cancelled'
           WHERE equipment_id = $1 AND id = ANY($2::text[])
             AND status IN ('Awaiting confirmation', 'Confirmed')
           RETURNING id`,
          [equipmentId, ids]
        );
        cancelled = result.rows.map((row) => row.id);
      }
      const updated = await client.query(
        `UPDATE equipment
         SET get_status = true, is_open = false, reason = $2, period = $3, block_start = $4, block_end = $5
         WHERE id = $1
         RETURNING id`,
        [equipmentId, block.reason, block.period, block.blockStart || "", block.blockEnd || ""]
      );
      if (updated.rowCount === 0) throw new ContractError("EquipmentNotFound");
      await client.query("COMMIT");
      return cancelled;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch { /* the connection may already be closed */ }
      if (error instanceof ContractError) throw error;
      console.error(error.message);
      throw new ContractError("StorageUnavailable");
    }
  });
}

async function listReservationRecords() {
  const result = await query(
    `SELECT id, equipment_id, reservation_date, start_text, end_text, status
     FROM reservations ORDER BY reservation_date, start_minute, id`
  );
  return result.rows.map(reservationRecord);
}

async function insertReservation(reservation) {
  return withClient(async (client) => {
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO reservations (
          id, equipment_id, student_id, reservation_date, start_text, end_text, start_minute, end_minute, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          reservation.id,
          reservation.equipmentId,
          reservation.studentId,
          reservation.date,
          reservation.start,
          reservation.end,
          minutes(reservation.start),
          minutes(reservation.end),
          reservation.status
        ]
      );
      await client.query("COMMIT");
      return { id: reservation.id };
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch { /* the connection may already be closed */ }
      if (error instanceof ContractError) throw error;
      if (error.code === "23P01" || String(error.message || "").includes("reservations_no_overlap")) {
        throw new ContractError("SlotTaken");
      }
      console.error(error.message);
      throw new ContractError("StorageUnavailable");
    }
  });
}

async function deleteReservation(id) {
  await query("DELETE FROM reservations WHERE id = $1", [id]);
}

async function listAwaitingReservations() {
  const result = await query(
    `SELECT r.id, r.reservation_date, r.start_text, r.end_text, r.reminder_sent_at,
            u.email, e.type, e.location
     FROM reservations r
     JOIN users u ON u.id = r.student_id
     JOIN equipment e ON e.id = r.equipment_id
     WHERE r.status = 'Awaiting confirmation'
     ORDER BY r.reservation_date, r.start_minute, r.id`
  );
  return result.rows.map((row) => ({
    id: row.id,
    date: row.reservation_date,
    start: row.start_text,
    end: row.end_text,
    reminderSentAt: row.reminder_sent_at || "",
    email: row.email,
    equipment: row.type,
    location: row.location
  }));
}

async function claimReminder(id, sentAt) {
  const result = await query(
    `UPDATE reservations
     SET reminder_sent_at = $2
     WHERE id = $1 AND status = 'Awaiting confirmation' AND reminder_sent_at = ''
     RETURNING id`,
    [id, sentAt]
  );
  return result.rowCount === 1;
}

async function releaseReminder(id) {
  await query(
    `UPDATE reservations SET reminder_sent_at = ''
     WHERE id = $1 AND status = 'Awaiting confirmation'`,
    [id]
  );
}

async function cancelAwaiting(id) {
  const result = await query(
    `UPDATE reservations SET status = 'Cancelled'
     WHERE id = $1 AND status = 'Awaiting confirmation'
     RETURNING id`,
    [id]
  );
  return result.rowCount === 1;
}

async function cancelOwned(userId, id) {
  const result = await query(
    `UPDATE reservations SET status = 'Cancelled'
     WHERE id = $1 AND student_id = $2 AND status IN ('Awaiting confirmation', 'Confirmed')
     RETURNING id`,
    [id, userId]
  );
  return result.rowCount === 1;
}

async function confirmAwaiting(userId, id) {
  const result = await query(
    `UPDATE reservations SET status = 'Confirmed'
     WHERE id = $1 AND student_id = $2 AND status = 'Awaiting confirmation'
     RETURNING id`,
    [id, userId]
  );
  return result.rowCount === 1;
}

async function findOwnedReservation(userId, id) {
  const result = await query(
    `SELECT id, equipment_id, reservation_date, start_text, end_text, status
     FROM reservations WHERE id = $1 AND student_id = $2`,
    [id, userId]
  );
  return result.rowCount === 0 ? null : reservationRecord(result.rows[0]);
}

async function listReportsFor(reservationIds) {
  if (reservationIds.length === 0) return [];
  const result = await query(
    `SELECT id, reservation_id, issue_type, description, status
     FROM reports WHERE reservation_id = ANY($1::text[])`,
    [reservationIds]
  );
  return result.rows.map((row) => ({
    id: row.id,
    reservationId: row.reservation_id,
    issueType: row.issue_type,
    description: row.description,
    status: row.status
  }));
}

async function findReportByReservation(reservationId) {
  const reports = await listReportsFor([reservationId]);
  return reports[0] || null;
}

async function insertReport(report) {
  return withClient(async (client) => {
    try {
      await client.query(
        `INSERT INTO reports (id, reservation_id, equipment_id, user_id, issue_type, description, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [report.id, report.reservationId, report.equipmentId, report.userId, report.issueType, report.description, report.status, report.createdAt]
      );
    } catch (error) {
      if (error.code === "23505") throw new ContractError("ReportExists");
      console.error(error.message);
      throw new ContractError("StorageUnavailable");
    }
  });
}

async function listTicketRecords() {
  const result = await query(
    `SELECT r.id, r.equipment_id, r.issue_type, r.description, r.status,
            e.type AS equipment_type, e.location AS equipment_location, e.serial_number AS equipment_serial,
            u.id AS account_id, u.name AS user_name, u.email AS user_email, u.role AS user_role,
            v.reservation_date, v.start_text, v.end_text
     FROM reports r
     LEFT JOIN equipment e ON e.id = r.equipment_id
     LEFT JOIN users u ON u.id = r.user_id
     LEFT JOIN reservations v ON v.id = r.reservation_id
     ORDER BY v.reservation_date DESC NULLS LAST, v.start_minute DESC NULLS LAST, r.created_at DESC, r.id`
  );
  return result.rows.map((row) => ({
    id: row.id,
    equipmentId: row.equipment_id,
    equipment: row.equipment_type || "",
    location: row.equipment_location || "",
    serial: row.equipment_serial || "",
    userId: row.account_id || "",
    user: row.user_name || "",
    email: row.user_email || "",
    role: row.user_role || "",
    date: row.reservation_date || "",
    start: row.start_text || "",
    end: row.end_text || "",
    issueType: row.issue_type,
    description: row.description,
    status: row.status
  }));
}

async function updateTicketStatus(id, status) {
  const result = await query(
    `UPDATE reports SET status = $2 WHERE id = $1 RETURNING id`,
    [id, status]
  );
  return result.rowCount === 1;
}

async function listStaffEmails() {
  const result = await query(`SELECT email FROM users WHERE role = 'staff' ORDER BY email`);
  return result.rows.map((row) => row.email);
}

async function listAllReservationRecords() {
  const result = await query(
    `SELECT r.id, r.equipment_id, r.student_id, r.reservation_date, r.start_text, r.end_text, r.status,
            u.name AS user_name, u.email AS user_email, u.role AS user_role
     FROM reservations r
     LEFT JOIN users u ON u.id = r.student_id
     ORDER BY r.reservation_date, r.start_minute, r.id`
  );
  return result.rows.map((row) => ({
    ...reservationRecord(row),
    userId: row.student_id,
    user: row.user_name || "",
    email: row.user_email || "",
    role: row.user_role || ""
  }));
}

async function listAccountNames() {
  const result = await query(`SELECT id, name FROM users ORDER BY name, id`);
  return result.rows.map((row) => ({ id: row.id, name: row.name }));
}

async function listOwnedReservations(userId) {
  const result = await query(
    `SELECT id, equipment_id, reservation_date, start_text, end_text, status
     FROM reservations WHERE student_id = $1
     ORDER BY reservation_date, start_minute, id`,
    [userId]
  );
  return result.rows.map(reservationRecord);
}

async function findUserById(id) {
  const result = await query(
    `SELECT id, name, email, password_hash, role, failed_attempts, locked_until
     FROM users WHERE id = $1`,
    [id]
  );
  return result.rowCount === 0 ? null : userRecord(result.rows[0]);
}

function withUsers(work) {
  return withClient(async (client) => {
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [USER_LOCK]);
      const existing = await client.query(
        `SELECT id, name, email, password_hash, role, failed_attempts, locked_until
         FROM users ORDER BY email`
      );
      const users = existing.rows.map(userRecord);
      const result = await work(users);
      await client.query("DELETE FROM users");
      for (const user of users) {
        await client.query(
          `INSERT INTO users (id, name, email, password_hash, role, failed_attempts, locked_until)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [user.id, user.name, user.email, user.passwordHash, user.role, Number(user.failedAttempts || 0), user.lockedUntil || ""]
        );
      }
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch { /* the connection may already be closed */ }
      if (error instanceof ContractError) throw error;
      console.error(error.message);
      throw new ContractError("StorageUnavailable");
    }
  });
}

async function deleteUserByEmail(email) {
  return withUsers((users) => {
    const index = users.findIndex((user) => user.email === email);
    if (index >= 0) users.splice(index, 1);
    return { deleted: index >= 0 };
  });
}

module.exports = {
  prepareDatabase,
  listMachineRecords,
  findMachineRecord,
  readStoredStatus,
  setMachineBlock,
  listPeriodReservations,
  blockMachineAndCancel,
  listReservationRecords,
  insertReservation,
  deleteReservation,
  listAwaitingReservations,
  claimReminder,
  releaseReminder,
  cancelAwaiting,
  cancelOwned,
  confirmAwaiting,
  findOwnedReservation,
  listReportsFor,
  findReportByReservation,
  insertReport,
  listTicketRecords,
  updateTicketStatus,
  listStaffEmails,
  listAllReservationRecords,
  listAccountNames,
  listOwnedReservations,
  withUsers,
  findUserById,
  deleteUserByEmail
};
