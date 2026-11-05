const sessionInput = document.querySelector("#session");
const sessionNote = document.querySelector("#sessionNote");
const typeSelect = document.querySelector("#type");
const message = document.querySelector("#message");
const list = document.querySelector("#list");
const details = document.querySelector("#details");

const saved = localStorage.getItem("makerspace-session");
if (saved) sessionInput.value = saved;

function sessionHeader() {
  return { "X-Session": sessionInput.value.trim() };
}

async function readJson(response) {
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Request failed");
    error.code = data.error;
    throw error;
  }
  return data;
}

function statusLabel(item) {
  if (item.status !== "blocked") return "Open";
  const extra = [item.reason, item.period].filter(Boolean).join(" · ");
  return extra ? `Blocked · ${extra}` : "Blocked";
}

function showError(error) {
  list.innerHTML = "";
  details.hidden = true;
  const text = {
    NoSession: "This request has no session. Enter demo-session.",
    UnknownType: "Unknown type.",
    EquipmentNotFound: "Equipment not found.",
    StorageUnavailable: "Service unavailable."
  }[error.code];
  message.textContent = text || "Something went wrong.";
}

async function loadCatalogue() {
  message.textContent = "";
  details.hidden = true;
  const type = typeSelect.value;
  const data = await readJson(await fetch(`/api/catalogue?type=${encodeURIComponent(type)}`, {
    headers: sessionHeader()
  }));
  if (data.message) {
    list.innerHTML = "";
    message.textContent = data.message;
    return;
  }
  list.innerHTML = data.equipment.map((item) => `
    <button class="card" type="button" data-id="${item.id}">
      <header>
        <strong>${item.type}</strong>
        <span class="badge ${item.status}">${item.status === "blocked" ? "Blocked" : "Open"}</span>
      </header>
      <p class="muted">${item.location}</p>
      <p class="status-line"><span>${statusLabel(item)}</span></p>
    </button>
  `).join("");
}

async function loadDetails(id) {
  const item = await readJson(await fetch(`/api/equipment/${encodeURIComponent(id)}`, {
    headers: sessionHeader()
  }));
  details.hidden = false;
  details.innerHTML = `
    <h2>${item.type}</h2>
    <dl>
      <dt>Location</dt><dd>${item.location}</dd>
      <dt>Description</dt><dd>${item.description || "—"}</dd>
      <dt>Rules of use</dt><dd>${item.rules || "—"}</dd>
      <dt>Status</dt><dd>${statusLabel(item)}</dd>
    </dl>
  `;
}

document.querySelector("#applySession").addEventListener("click", () => {
  localStorage.setItem("makerspace-session", sessionInput.value.trim());
  sessionNote.textContent = "";
  loadCatalogue().catch(showError);
});

typeSelect.addEventListener("change", () => loadCatalogue().catch(showError));

list.addEventListener("click", (event) => {
  const card = event.target.closest("[data-id]");
  if (!card) return;
  loadDetails(card.dataset.id).catch(showError);
});

loadCatalogue().catch(showError);
