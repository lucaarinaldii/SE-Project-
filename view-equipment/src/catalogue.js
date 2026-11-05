const storage = require("./storage");
const { ContractError } = require("./errors");

const FILTER_TO_TYPE = {
  "3D-принтер": "3D printer",
  "лазерный резак": "laser cutter",
  электроника: "electronics workstation"
};

function rulesOfUse(maxBookingDuration) {
  if (maxBookingDuration === undefined || maxBookingDuration === null || maxBookingDuration === "") {
    return "";
  }
  return `Maximum booking duration: ${maxBookingDuration} minutes.`;
}

function summary(record) {
  return {
    id: record.id,
    type: record.Type,
    location: record.Location
  };
}

async function listEquipment(type) {
  const filter = type ?? "";
  if (filter !== "" && !Object.prototype.hasOwnProperty.call(FILTER_TO_TYPE, filter)) {
    throw new ContractError("UnknownType");
  }

  const records = await storage.listMachineRecords();
  const wanted = filter === "" ? null : FILTER_TO_TYPE[filter];
  return records
    .filter((record) => wanted === null || record.Type === wanted)
    .map(summary);
}

async function equipmentDetails(id) {
  const record = await storage.findMachineRecord(id);
  return {
    id: record.id,
    type: record.Type,
    location: record.Location,
    description: record.description ?? "",
    rules: rulesOfUse(record.Max_Booking_Duration)
  };
}

module.exports = { listEquipment, equipmentDetails };
