const fs = require("fs/promises");
const path = require("path");
const { ContractError } = require("./errors");

const DATA_PATH = path.join(__dirname, "..", "data", "equipment.json");

async function readRaw() {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    throw new ContractError("StorageUnavailable");
  }
}

function catalogueRecord(machine) {
  return {
    id: machine.id,
    Type: machine.Type,
    Location: machine.Location,
    Max_Booking_Duration: machine.Max_Booking_Duration,
    description: machine.description ?? ""
  };
}

async function listMachineRecords() {
  const machines = await readRaw();
  return machines.map(catalogueRecord);
}

async function findMachineRecord(id) {
  const machines = await readRaw();
  const machine = machines.find((item) => item.id === id);
  if (!machine) throw new ContractError("EquipmentNotFound");
  return catalogueRecord(machine);
}

async function readStoredStatus(id) {
  const machines = await readRaw();
  const machine = machines.find((item) => item.id === id);
  if (!machine) throw new ContractError("EquipmentNotFound");
  return {
    value: machine.storedStatus,
    reason: machine.reason ?? "",
    period: machine.period ?? ""
  };
}

module.exports = { listMachineRecords, findMachineRecord, readStoredStatus };
