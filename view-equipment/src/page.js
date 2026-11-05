const { currentSession } = require("./login");
const { listEquipment, equipmentDetails } = require("./catalogue");
const { statusOf, machineStatus } = require("./status");

// Builds the catalogue screen data. It does not read the HTTP request or write the response.
async function buildList(request, type) {
  currentSession(request);
  const equipment = await listEquipment(type);
  const statuses = await statusOf(equipment.map((item) => item.id));
  const byId = new Map(statuses.map((item) => [item.id, item]));
  return {
    equipment: equipment.map((item) => {
      const status = byId.get(item.id);
      return {
        id: item.id,
        type: item.type,
        location: item.location,
        status: status.state,
        reason: status.reason,
        period: status.period
      };
    }),
    message: equipment.length === 0 ? "No equipment found" : ""
  };
}

async function buildDetails(request, id) {
  currentSession(request);
  const details = await equipmentDetails(id);
  const status = await machineStatus(id);
  return { ...details, status: status.state, reason: status.reason, period: status.period };
}

module.exports = { buildList, buildDetails };
