const TOKEN_KEY = "makerspace-account";
const auth = document.querySelector("#auth");
const appShell = document.querySelector("#appShell");
const authMessage = document.querySelector("#authMessage");
const accountLine = document.querySelector("#accountLine");
const pageTitle = document.querySelector("#pageTitle");
const pageLede = document.querySelector("#pageLede");
const chooseView = document.querySelector("#chooseView");
const accountView = document.querySelector("#accountView");
const historyMessage = document.querySelector("#historyMessage");
const historyList = document.querySelector("#historyList");
const historyDetails = document.querySelector("#historyDetails");
const historyEquipment = document.querySelector("#historyEquipment");
const typeSelect = document.querySelector("#type");
const message = document.querySelector("#message");
const count = document.querySelector("#count");
const list = document.querySelector("#list");
const details = document.querySelector("#details");
let token = localStorage.getItem(TOKEN_KEY) || "";
const emptyDetails = `
  <div class="empty">
    <p class="eyebrow">Machine</p>
    <h2>Pick one</h2>
    <p>Each card is a machine you can book. Open it, then choose a free slot.</p>
  </div>
`;

function sessionHeader() {
  return token ? { "X-Session": token } : {};
}

function showSignedOut() {
  token = "";
  localStorage.removeItem(TOKEN_KEY);
  appShell.hidden = true;
  auth.hidden = false;
  document.title = "Sign in";
  if (location.hash !== "#/sign-in") location.hash = "#/sign-in";
  window.scrollTo(0, 0);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function roleLabel(role) {
  if (role === "staff") return "Staff";
  if (role === "user") return "User";
  return role;
}

function fillAccount(account) {
  accountLine.textContent = `${account.name} · ${account.email}`;
  const initial = (account.name || "?").trim().charAt(0).toUpperCase();
  document.querySelector("#accountAvatar").textContent = initial;
  document.querySelector("#accountName").textContent = account.name;
  document.querySelector("#accountEmail").textContent = account.email;
  document.querySelector("#accountRole").textContent = roleLabel(account.role);
}

function showChoose() {
  chooseView.hidden = false;
  accountView.hidden = true;
  document.querySelector("#backToChoices").hidden = true;
  pageTitle.textContent = "Choose what to book";
  pageLede.textContent = "Pick a machine. Open it to see the day and take a free slot.";
  document.title = "Choose what to book";
  if (location.hash !== "#/choose") location.hash = "#/choose";
  window.scrollTo(0, 0);
}

function showAccount() {
  chooseView.hidden = true;
  accountView.hidden = false;
  document.querySelector("#backToChoices").hidden = false;
  pageTitle.textContent = "My reservations";
  pageLede.textContent = "Your bookings, past and upcoming.";
  document.title = "My reservations";
  if (location.hash !== "#/account") location.hash = "#/account";
  window.scrollTo(0, 0);
  loadHistory().catch(showHistoryError);
}

function showSignedIn(account) {
  auth.hidden = true;
  appShell.hidden = false;
  fillAccount(account);
  if (location.hash === "#/account") showAccount();
  else showChoose();
}

function showAuthError(error) {
  const text = {
    InvalidCredentials: "Email or password is wrong.",
    LoginBlocked: "Sign-in is blocked for 15 minutes after 3 failed attempts.",
    EmailTaken: "An account with this email already exists.",
    InvalidRegistration: "Enter a name, a valid email, and a password of at least 8 characters.",
    StorageUnavailable: "Service unavailable."
  }[error.code];
  setBanner(authMessage, text || "Something went wrong.", "is-blocked");
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
  count.textContent = "";
  showEmptyDetails();
  const text = {
    NoSession: "Sign in to see the catalogue.",
    UnknownType: "Unknown type.",
    EquipmentNotFound: "Equipment not found.",
    InvalidDate: "Enter a valid date.",
    StorageUnavailable: "Service unavailable."
  }[error.code];
  setBanner(message, text || "Something went wrong.", "is-blocked");
}

async function showAvailabilityError(error) {
  if (error.code === "NoSession") {
    showError(error);
    return;
  }
  if (error.code === "SlotTaken" || error.code === "MachineBlocked" || error.code === "InvalidSlot" || error.code === "PastSlot") {
    if (details.dataset.id) {
      try { await loadAvailability(details.dataset.id); } catch { /* keep the reservation error */ }
    }
    if (error.code === "MachineBlocked") return;
    const slotMessage = document.querySelector("#availabilityMessage");
    const suggestions = document.querySelector("#suggestions");
    const text = {
      SlotTaken: "This slot is no longer available.",
      MachineBlocked: "This machine is blocked.",
      InvalidSlot: "Choose one free hour from the day.",
      PastSlot: "This time has already passed."
    }[error.code];
    if (slotMessage) setBanner(slotMessage, text, "is-blocked");
    if (error.code === "SlotTaken" && suggestions) renderSuggestions(suggestions, error.suggestions);
    return;
  }
  const slotMessage = document.querySelector("#availabilityMessage");
  const slots = document.querySelector("#slots");
  const suggestions = document.querySelector("#suggestions");
  if (!slotMessage) {
    showError(error);
    return;
  }
  if (slots) slots.innerHTML = "";
  if (suggestions) suggestions.innerHTML = "";
  const text = {
    InvalidDate: "Enter a valid date.",
    EquipmentNotFound: "Equipment not found.",
    StorageUnavailable: "Service unavailable."
  }[error.code];
  setBanner(slotMessage, text || "Something went wrong.", "is-blocked");
}

const DAY_PAGE = 7;
const DAY_LIMIT = 56;
const HISTORY_BACK = 120;
const HISTORY_AHEAD = 56;
let dayWindowStart = startOfToday();
let historyWindowStart = startOfToday();

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isoDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseIsoDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function shiftDay(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dayOffset(from, to) {
  const utc = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((utc(to) - utc(from)) / 86400000);
}

function formatLongDay(date) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

function selectAvailabilityDate(iso) {
  const input = document.querySelector("#availabilityDate");
  if (!input) return;
  input.value = iso;
  const today = startOfToday();
  const offset = Math.max(0, Math.min(DAY_LIMIT, dayOffset(today, parseIsoDate(iso))));
  const page = Math.min(Math.floor(offset / DAY_PAGE) * DAY_PAGE, DAY_LIMIT - (DAY_PAGE - 1));
  dayWindowStart = shiftDay(today, page);
  renderDayStrip();
}

function renderDayStrip() {
  const strip = document.querySelector("#dayStrip");
  const input = document.querySelector("#availabilityDate");
  const heading = document.querySelector("#selectedDayLabel");
  if (!strip || !input) return;
  const today = startOfToday();
  const todayIso = isoDate(today);
  if (!input.value) input.value = todayIso;
  const selected = parseIsoDate(input.value);
  const maxStart = shiftDay(today, DAY_LIMIT - (DAY_PAGE - 1));
  if (dayWindowStart < today) dayWindowStart = today;
  if (dayWindowStart > maxStart) dayWindowStart = maxStart;
  heading.textContent = formatLongDay(selected);
  const days = [];
  for (let index = 0; index < DAY_PAGE; index += 1) {
    const date = shiftDay(dayWindowStart, index);
    const iso = isoDate(date);
    const pressed = iso === input.value;
    const name = iso === todayIso ? "Today" : new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date);
    days.push(`
      <button class="day${pressed ? " is-selected" : ""}${iso === todayIso ? " is-today" : ""}" type="button" data-date="${iso}" aria-pressed="${pressed}" aria-label="${formatLongDay(date)}">
        <span class="day-name">${name}</span>
        <span class="day-number">${date.getDate()}</span>
      </button>
    `);
  }
  strip.innerHTML = days.join("");
  const previous = document.querySelector("[data-day-shift='-7']");
  const next = document.querySelector("[data-day-shift='7']");
  if (previous) previous.disabled = isoDate(dayWindowStart) <= todayIso;
  if (next) next.disabled = dayOffset(today, dayWindowStart) >= DAY_LIMIT - (DAY_PAGE - 1);
}

function historyPageBounds() {
  const today = startOfToday();
  return {
    today,
    minStart: shiftDay(today, -Math.floor(HISTORY_BACK / DAY_PAGE) * DAY_PAGE),
    maxStart: shiftDay(today, HISTORY_AHEAD - (DAY_PAGE - 1))
  };
}

function selectHistoryDate(iso) {
  const input = document.querySelector("#historyDate");
  if (!input) return;
  input.value = iso;
  const { today, minStart, maxStart } = historyPageBounds();
  const page = Math.floor(dayOffset(today, parseIsoDate(iso)) / DAY_PAGE) * DAY_PAGE;
  const minPage = dayOffset(today, minStart);
  const maxPage = dayOffset(today, maxStart);
  historyWindowStart = shiftDay(today, Math.max(minPage, Math.min(maxPage, page)));
  renderHistoryStrip();
}

function renderHistoryStrip() {
  const strip = document.querySelector("#historyDayStrip");
  const input = document.querySelector("#historyDate");
  const heading = document.querySelector("#historyDayLabel");
  if (!strip || !input) return;
  const { today, minStart, maxStart } = historyPageBounds();
  const todayIso = isoDate(today);
  if (historyWindowStart < minStart) historyWindowStart = minStart;
  if (historyWindowStart > maxStart) historyWindowStart = maxStart;
  if (heading) heading.textContent = input.value ? formatLongDay(parseIsoDate(input.value)) : "All dates";
  const clear = document.querySelector("#clearHistoryDate");
  if (clear) {
    const selected = !input.value;
    clear.classList.toggle("is-selected", selected);
    clear.setAttribute("aria-pressed", String(selected));
  }
  const days = [];
  for (let index = 0; index < DAY_PAGE; index += 1) {
    const date = shiftDay(historyWindowStart, index);
    const iso = isoDate(date);
    const pressed = iso === input.value;
    const name = iso === todayIso ? "Today" : new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date);
    days.push(`
      <button class="day${pressed ? " is-selected" : ""}${iso === todayIso ? " is-today" : ""}" type="button" data-date="${iso}" aria-pressed="${pressed}" aria-label="${formatLongDay(date)}">
        <span class="day-name">${name}</span>
        <span class="day-number">${date.getDate()}</span>
      </button>
    `);
  }
  strip.innerHTML = days.join("");
  const previous = document.querySelector("[data-history-shift='-7']");
  const next = document.querySelector("[data-history-shift='7']");
  if (previous) previous.disabled = historyWindowStart <= minStart;
  if (next) next.disabled = historyWindowStart >= maxStart;
}

function statusClass(status) {
  if (status === "Awaiting confirmation") return "is-awaiting";
  if (status === "Confirmed") return "is-confirmed";
  if (status === "Completed") return "is-completed";
  if (status === "Cancelled") return "is-cancelled";
  return "";
}

function reservationDateTile(iso) {
  const date = parseIsoDate(iso);
  const name = iso === isoDate(startOfToday()) ? "Today" : new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date);
  const month = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date);
  return `
    <span class="reservation-date">
      <span class="day-name">${name}</span>
      <span class="day-number">${date.getDate()}</span>
      <span class="reservation-month">${month}</span>
    </span>
  `;
}

function renderFilterChips() {
  const equipment = document.querySelector("#historyEquipmentChips");
  if (equipment) {
    equipment.innerHTML = [...historyEquipment.options].map((option) => {
      const selected = option.value === historyEquipment.value;
      const label = option.value ? option.textContent : "All";
      return `<button class="chip${selected ? " is-selected" : ""}" type="button" data-equipment="${escapeHtml(option.value)}" aria-pressed="${selected}">${escapeHtml(label)}</button>`;
    }).join("");
  }
  const status = document.querySelector("#historyStatus").value;
  document.querySelectorAll("#historyStatusChips .chip").forEach((chip) => {
    const selected = chip.dataset.status === status;
    chip.classList.toggle("is-selected", selected);
    chip.setAttribute("aria-pressed", String(selected));
  });
  renderHistoryStrip();
}

function slotLabel(state) {
  if (state === "booked") return "Booked";
  if (state === "unavailable") return "Unavailable";
  return "Free";
}

function mark(kind) {
  if (kind === "open" || kind === "free") {
    return '<svg class="mark" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="4" fill="currentColor"></circle></svg>';
  }
  if (kind === "booked") {
    return '<svg class="mark" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="2" rx="1" fill="currentColor"></rect></svg>';
  }
  return '<svg class="mark" viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor"></rect></svg>';
}

const emptyHistory = `
  <div class="empty">
    <p class="eyebrow">Reservation</p>
    <h2>Pick one</h2>
    <p>Open a reservation to see the machine, the time, and the status.</p>
  </div>
`;

function showEmptyHistory() {
  delete historyDetails.dataset.id;
  historyDetails.innerHTML = emptyHistory;
}

function showHistoryError(error) {
  if (error.code === "NoSession") {
    showSignedOut();
    return;
  }
  if (error.code === "CannotConfirm") {
    setBanner(historyMessage, "This reservation can no longer be confirmed.", "is-blocked");
    return;
  }
  if (error.code === "CannotCancel") {
    setBanner(historyMessage, "This reservation can no longer be cancelled.", "is-blocked");
    return;
  }
  if (error.code === "CannotReport") {
    setBanner(historyMessage, "This reservation cannot be reported.", "is-blocked");
    return;
  }
  if (error.code === "ReportIncomplete") {
    setBanner(historyMessage, "Enter the issue type and a description.", "is-blocked");
    return;
  }
  if (error.code === "ReportExists") {
    setBanner(historyMessage, "A report is already open for this reservation.", "is-blocked");
    return;
  }
  historyList.innerHTML = "";
  showEmptyHistory();
  const text = {
    InvalidDate: "Enter a valid date.",
    UnknownStatus: "Unknown status.",
    EquipmentNotFound: "Equipment not found.",
    ReservationNotFound: "Reservation not found.",
    StorageUnavailable: "Service unavailable."
  }[error.code];
  setBanner(historyMessage, text || "Something went wrong.", "is-blocked");
}

async function fillEquipmentChoices() {
  if (historyEquipment.dataset.ready === "true") return;
  const data = await readJson(await fetch("/api/catalogue?type=", { headers: sessionHeader() }));
  historyEquipment.insertAdjacentHTML("beforeend", data.equipment.map((item) => (
    `<option value="${escapeHtml(item.id)}">${escapeHtml(item.type)}</option>`
  )).join(""));
  historyEquipment.dataset.ready = "true";
}

async function loadHistory(options = {}) {
  await fillEquipmentChoices();
  if (!options.silent) renderFilterChips();
  if (!options.silent) {
    setBanner(historyMessage, "", "");
    showEmptyHistory();
  }
  const params = new URLSearchParams();
  const date = document.querySelector("#historyDate").value;
  if (date) params.set("date", date);
  if (historyEquipment.value) params.set("equipment", historyEquipment.value);
  const status = document.querySelector("#historyStatus").value;
  if (status) params.set("status", status);
  const data = await readJson(await fetch(`/api/reservations?${params}`, { headers: sessionHeader() }));
  if (data.message) {
    historyList.innerHTML = "";
    if (!options.silent) setBanner(historyMessage, data.message, "is-warning");
    return;
  }
  const openId = historyDetails.dataset.id || "";
  historyList.innerHTML = data.reservations.map((item) => `
    <div class="card reservation-card${item.id === openId ? " is-selected" : ""}" data-reservation="${escapeHtml(item.id)}"${item.id === openId ? ' aria-current="true"' : ""}>
      <button class="card-open" type="button">
        ${reservationDateTile(item.date)}
        <span class="reservation-body">
          <span class="card-title">${escapeHtml(item.equipment)}</span>
          <span class="badge ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
          <span class="reservation-time"><span class="slot-time">${escapeHtml(item.start)}</span><span class="slot-until">until ${escapeHtml(item.end)}</span></span>
        </span>
      </button>
      ${reservationActions(item)}
    </div>
  `).join("");
  if (!options.silent || !openId) return;
  const open = data.reservations.find((item) => item.id === openId);
  const showingConfirm = Boolean(historyDetails.querySelector("#confirmReservation"));
  const showingCancel = Boolean(historyDetails.querySelector("#cancelReservation"));
  const showingReport = Boolean(historyDetails.querySelector("#showReport"));
  const formOpen = historyDetails.querySelector("#reportForm") && !historyDetails.querySelector("#reportForm").hidden;
  if (!formOpen && open && (open.canConfirm !== showingConfirm || open.canCancel !== showingCancel || open.canReport !== showingReport)) {
    await loadReservation(openId);
  }
}

function reservationActions(item) {
  const confirm = item.canConfirm
    ? `<button class="primary confirm-reservation" type="button" data-confirm="${escapeHtml(item.id)}">Confirm</button>`
    : "";
  const cancel = item.canCancel
    ? `<button class="cancel-reservation" type="button" data-cancel="${escapeHtml(item.id)}"><span>Cancel</span><span>reservation</span></button>`
    : "";
  return confirm || cancel ? `<div class="card-actions">${confirm}${cancel}</div>` : "";
}

async function loadReservation(id) {
  const item = await readJson(await fetch(`/api/reservations/${encodeURIComponent(id)}`, { headers: sessionHeader() }));
  historyDetails.dataset.id = item.id;
  document.querySelectorAll("#historyList .card").forEach((card) => {
    const selected = card.dataset.reservation === item.id;
    card.classList.toggle("is-selected", selected);
    if (selected) card.setAttribute("aria-current", "true");
    else card.removeAttribute("aria-current");
  });
  historyDetails.innerHTML = `
    <p class="eyebrow">Reservation</p>
    <h2>${escapeHtml(item.equipment)}</h2>
    <div class="reservation-hero">
      ${reservationDateTile(item.date)}
      <div>
        <p class="day-heading">${formatLongDay(parseIsoDate(item.date))}</p>
        <p class="reservation-time"><span class="slot-time">${escapeHtml(item.start)}</span><span class="slot-until">until ${escapeHtml(item.end)}</span></p>
        <p class="card-location">${escapeHtml(item.location || "—")}</p>
        <span class="badge ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
      </div>
    </div>
    <div class="reservation-actions">
      ${item.canConfirm ? `<button id="confirmReservation" class="primary" type="button">Confirm</button>` : ""}
      ${item.canCancel ? `<button id="cancelReservation" class="cancel-reservation" type="button">Cancel reservation</button>` : ""}
      ${item.canReport ? `<button id="showReport" class="primary" type="button">Report</button>` : ""}
    </div>
    ${item.canReport ? `
      <form id="reportForm" class="report-form" hidden>
        <label for="issueType">Issue type</label>
        <select id="issueType">
          <option value="">Select an issue</option>
          <option>Not working</option>
          <option>Unsafe to use</option>
          <option>Other</option>
        </select>
        <label for="issueDescription">Description</label>
        <textarea id="issueDescription"></textarea>
        <button class="primary" type="submit">Submit report</button>
      </form>
    ` : ""}
    ${item.report ? `
      <section class="report-saved">
        <p class="eyebrow">Report</p>
        <span class="badge is-awaiting">${escapeHtml(item.report.status)}</span>
        <p class="card-title">${escapeHtml(item.report.issueType)}</p>
        <p>${escapeHtml(item.report.description)}</p>
      </section>
    ` : ""}
  `;
}

function armCancel(button) {
  if (button.dataset.ready === "yes") return true;
  button.dataset.ready = "yes";
  button.innerHTML = "<span>Yes,</span><span>cancel</span>";
  setBanner(historyMessage, "Cancel this reservation? The time slot will be free again.", "is-warning");
  return false;
}

async function cancelReservation(id, button) {
  if (!armCancel(button)) return;
  if (button) button.disabled = true;
  const data = await readJson(await fetch(`/api/reservations/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    headers: sessionHeader()
  }));
  await loadHistory();
  await loadReservation(id);
  setBanner(historyMessage, data.message, data.mailSent ? "is-open" : "is-warning");
}

async function confirmReservation(id, button) {
  if (button) button.disabled = true;
  const data = await readJson(await fetch(`/api/reservations/${encodeURIComponent(id)}/confirm`, {
    method: "POST",
    headers: sessionHeader()
  }));
  await loadHistory();
  await loadReservation(id);
  setBanner(historyMessage, data.message, data.mailSent ? "is-open" : "is-warning");
}

function showEmptyDetails() {
  details.hidden = false;
  delete details.dataset.id;
  details.innerHTML = emptyDetails;
}

function setBanner(node, text, kind) {
  node.className = "banner";
  if (!text) {
    node.hidden = true;
    node.textContent = "";
    return;
  }
  node.hidden = false;
  node.textContent = text;
  if (kind) node.classList.add(kind);
}

function markSelected(id) {
  document.querySelectorAll(".card").forEach((card) => {
    const selected = card.dataset.id === id;
    card.classList.toggle("is-selected", selected);
    if (selected) card.setAttribute("aria-current", "true");
    else card.removeAttribute("aria-current");
  });
}

async function loadCatalogue() {
  setBanner(message, "", "");
  showEmptyDetails();
  const type = typeSelect.value;
  const data = await readJson(await fetch(`/api/catalogue?type=${encodeURIComponent(type)}`, {
    headers: sessionHeader()
  }));
  if (data.message) {
    list.innerHTML = "";
    count.textContent = "";
    setBanner(message, data.message, "is-warning");
    return;
  }
  count.textContent = `${data.equipment.length} in this view`;
  list.innerHTML = data.equipment.map((item) => {
    const open = item.status !== "blocked";
    return `
      <button class="card" type="button" data-id="${item.id}">
        <span class="card-top">
          <span class="card-title">${item.type}</span>
          <span class="badge ${item.status}">${mark(open ? "open" : "blocked")}${open ? "Open" : "Blocked"}</span>
        </span>
        <span class="card-location">${item.location}</span>
        <span class="card-status">${statusLabel(item)}</span>
      </button>
    `;
  }).join("");
}

async function loadDetails(id) {
  const item = await readJson(await fetch(`/api/equipment/${encodeURIComponent(id)}`, {
    headers: sessionHeader()
  }));
  details.hidden = false;
  details.dataset.id = item.id;
  markSelected(item.id);
  details.innerHTML = `
    <p class="eyebrow">Machine</p>
    <h2>${item.type}</h2>
    <dl>
      <dt>Location</dt><dd>${item.location}</dd>
      <dt>Description</dt><dd>${item.description || "—"}</dd>
      <dt>Rules of use</dt><dd>${item.rules || "—"}</dd>
      <dt>Status</dt><dd>${statusLabel(item)}</dd>
    </dl>
    <section class="availability">
      <h3>Availability</h3>
      <p id="selectedDayLabel" class="day-heading"></p>
      <div class="day-picker">
        <button class="day-nav" type="button" data-day-shift="-7" aria-label="Previous week">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6.5 9 12l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </button>
        <div id="dayStrip" class="day-strip" role="group" aria-label="Date"></div>
        <button class="day-nav" type="button" data-day-shift="7" aria-label="Next week">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6.5 15 12l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </button>
      </div>
      <input id="availabilityDate" hidden>
      <p id="availabilityMessage" class="banner" role="status" hidden></p>
      <div id="slots" class="slots"></div>
      <div id="suggestions"></div>
    </section>
  `;
  dayWindowStart = startOfToday();
  selectAvailabilityDate(isoDate(dayWindowStart));
  await loadAvailability(item.id);
}

async function loadAvailability(id) {
  const date = document.querySelector("#availabilityDate").value;
  const data = await readJson(await fetch(`/api/equipment/${encodeURIComponent(id)}/availability?date=${encodeURIComponent(date)}`, {
    headers: sessionHeader()
  }));
  const slotMessage = document.querySelector("#availabilityMessage");
  const slots = document.querySelector("#slots");
  const suggestions = document.querySelector("#suggestions");
  const block = [data.reason, data.period].filter(Boolean).join(" · ");
  if (data.message) setBanner(slotMessage, data.message, "is-warning");
  else if (block) setBanner(slotMessage, `Blocked · ${block}`, "is-blocked");
  else setBanner(slotMessage, "", "");
  slots.innerHTML = data.slots.map((slot) => {
    const label = slot.state === "free" ? "Book" : slotLabel(slot.state);
    const body = `
      <span class="slot-time">${escapeHtml(slot.start)}</span>
      <span class="slot-until">until ${escapeHtml(slot.end)}</span>
      <span class="slot-label">${label}</span>
    `;
    if (slot.state !== "free") return `<div class="slot ${slot.state}">${body}</div>`;
    return `<button class="slot free" type="button" data-book="true" data-start="${escapeHtml(slot.start)}" data-end="${escapeHtml(slot.end)}">${body}</button>`;
  }).join("");
  renderSuggestions(suggestions, data.suggestions);
}

function renderSuggestions(node, items) {
  node.className = "suggestions";
  node.innerHTML = !items || items.length === 0 ? "" : `
    <h3>Nearest free slots</h3>
    <ul>
      ${items.map((slot) => `<li><button class="suggestion" type="button" data-date="${escapeHtml(slot.date)}">${escapeHtml(formatLongDay(parseIsoDate(slot.date)))} · ${escapeHtml(slot.start)}–${escapeHtml(slot.end)}</button></li>`).join("")}
    </ul>
  `;
}

async function bookSlot(id, start, end, button) {
  if (button) button.disabled = true;
  const response = await fetch("/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeader() },
    body: JSON.stringify({
      equipmentId: id,
      date: document.querySelector("#availabilityDate").value,
      start,
      end
    })
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Request failed");
    error.code = data.error;
    error.suggestions = data.suggestions || [];
    if (button) button.disabled = false;
    throw error;
  }
  await loadAvailability(id);
  const slotMessage = document.querySelector("#availabilityMessage");
  setBanner(slotMessage, data.message, "is-open");
}

function showSignInTab(signIn) {
  document.querySelector("#signInForm").hidden = !signIn;
  document.querySelector("#registerForm").hidden = signIn;
  document.querySelector("#showSignIn").classList.toggle("is-selected", signIn);
  document.querySelector("#showRegister").classList.toggle("is-selected", !signIn);
  document.querySelector("#showSignIn").setAttribute("aria-selected", String(signIn));
  document.querySelector("#showRegister").setAttribute("aria-selected", String(!signIn));
  document.querySelector("#auth h1").textContent = signIn ? "Sign in" : "Create account";
  setBanner(authMessage, "", "");
}

async function submitAccount(url, body, button) {
  if (button) button.disabled = true;
  setBanner(authMessage, "", "");
  try {
    const data = await readJson(await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }));
    token = data.token;
    localStorage.setItem(TOKEN_KEY, token);
    showSignedIn(data.account);
    await loadCatalogue();
  } catch (error) {
    showAuthError(error);
  } finally {
    if (button) button.disabled = false;
  }
}

document.querySelector("#showSignIn").addEventListener("click", () => showSignInTab(true));
document.querySelector("#showRegister").addEventListener("click", () => showSignInTab(false));

document.querySelector("#signInForm").addEventListener("submit", (event) => {
  event.preventDefault();
  submitAccount("/api/login", {
    email: document.querySelector("#signInEmail").value,
    password: document.querySelector("#signInPassword").value
  }, event.submitter);
});

document.querySelector("#registerForm").addEventListener("submit", (event) => {
  event.preventDefault();
  submitAccount("/api/register", {
    name: document.querySelector("#registerName").value,
    email: document.querySelector("#registerEmail").value,
    password: document.querySelector("#registerPassword").value
  }, event.submitter);
});

document.querySelector("#openAccount").addEventListener("click", () => {
  if (location.hash !== "#/account") location.hash = "#/account";
});

document.querySelector("#backToChoices").addEventListener("click", () => {
  if (location.hash !== "#/choose") location.hash = "#/choose";
});

document.querySelector("#signOut").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST", headers: sessionHeader() });
  showSignedOut();
});

accountView.addEventListener("click", (event) => {
  const day = event.target.closest("#historyDayStrip [data-date]");
  if (day) {
    const input = document.querySelector("#historyDate");
    if (input.value === day.dataset.date) input.value = "";
    else selectHistoryDate(day.dataset.date);
    loadHistory().catch(showHistoryError);
    return;
  }
  const shift = event.target.closest("[data-history-shift]");
  if (shift) {
    if (shift.disabled) return;
    historyWindowStart = shiftDay(historyWindowStart, Number(shift.dataset.historyShift));
    renderHistoryStrip();
    return;
  }
  if (event.target.closest("#clearHistoryDate")) {
    document.querySelector("#historyDate").value = "";
    loadHistory().catch(showHistoryError);
    return;
  }
  const equipment = event.target.closest("#historyEquipmentChips [data-equipment]");
  if (equipment) {
    historyEquipment.value = equipment.dataset.equipment;
    loadHistory().catch(showHistoryError);
    return;
  }
  const status = event.target.closest("#historyStatusChips [data-status]");
  if (!status) return;
  document.querySelector("#historyStatus").value = status.dataset.status;
  loadHistory().catch(showHistoryError);
});

document.querySelector("#historyDate").addEventListener("change", () => loadHistory().catch(showHistoryError));
document.querySelector("#historyEquipment").addEventListener("change", () => loadHistory().catch(showHistoryError));
document.querySelector("#historyStatus").addEventListener("change", () => loadHistory().catch(showHistoryError));

historyList.addEventListener("click", (event) => {
  const confirmButton = event.target.closest("[data-confirm]");
  if (confirmButton) {
    confirmReservation(confirmButton.dataset.confirm, confirmButton).catch((error) => {
      confirmButton.disabled = false;
      showHistoryError(error);
    });
    return;
  }
  const cancelButton = event.target.closest("[data-cancel]");
  if (cancelButton) {
    cancelReservation(cancelButton.dataset.cancel, cancelButton).catch((error) => {
      cancelButton.disabled = false;
      showHistoryError(error);
    });
    return;
  }
  const card = event.target.closest("[data-reservation]");
  if (!card) return;
  setBanner(historyMessage, "");
  loadReservation(card.dataset.reservation).catch(showHistoryError);
});

historyDetails.addEventListener("click", (event) => {
  const confirmButton = event.target.closest("#confirmReservation");
  if (confirmButton) {
    confirmReservation(historyDetails.dataset.id, confirmButton).catch((error) => {
      confirmButton.disabled = false;
      showHistoryError(error);
    });
    return;
  }
  const cancelButton = event.target.closest("#cancelReservation");
  if (cancelButton) {
    cancelReservation(historyDetails.dataset.id, cancelButton).catch((error) => {
      cancelButton.disabled = false;
      showHistoryError(error);
    });
    return;
  }
  const reportButton = event.target.closest("#showReport");
  if (!reportButton) return;
  reportButton.hidden = true;
  document.querySelector("#reportForm").hidden = false;
});

historyDetails.addEventListener("submit", (event) => {
  const form = event.target.closest("#reportForm");
  if (!form) return;
  event.preventDefault();
  const issueType = document.querySelector("#issueType");
  const description = document.querySelector("#issueDescription");
  const missingType = !issueType.value;
  const missingDescription = !description.value.trim();
  issueType.classList.toggle("is-invalid", missingType);
  description.classList.toggle("is-invalid", missingDescription);
  if (missingType || missingDescription) {
    setBanner(historyMessage, "Enter the issue type and a description.", "is-blocked");
    return;
  }
  const button = form.querySelector("button");
  if (button) button.disabled = true;
  submitReport(historyDetails.dataset.id, issueType.value, description.value.trim()).catch((error) => {
    if (button) button.disabled = false;
    showHistoryError(error);
  });
});

async function submitReport(id, issueType, description) {
  const data = await readJson(await fetch(`/api/reservations/${encodeURIComponent(id)}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeader() },
    body: JSON.stringify({ issueType, description })
  }));
  await loadHistory();
  await loadReservation(id);
  setBanner(historyMessage, data.message, data.mailSent ? "is-open" : "is-warning");
}

window.addEventListener("hashchange", () => {
  if (!token) return;
  if (location.hash === "#/account") {
    showAccount();
    return;
  }
  if (location.hash === "#/choose") {
    const opening = chooseView.hidden;
    showChoose();
    if (opening) loadCatalogue().catch(showError);
  }
});

setInterval(() => {
  if (!token || accountView.hidden) return;
  loadHistory({ silent: true }).catch(() => {});
}, 30000);

typeSelect.addEventListener("change", () => loadCatalogue().catch(showError));

list.addEventListener("click", (event) => {
  const card = event.target.closest("[data-id]");
  if (!card) return;
  loadDetails(card.dataset.id).catch(showError);
});

details.addEventListener("click", (event) => {
  const book = event.target.closest("[data-book]");
  if (book) {
    bookSlot(details.dataset.id, book.dataset.start, book.dataset.end, book).catch(showAvailabilityError);
    return;
  }
  const day = event.target.closest("[data-date]");
  if (day) {
    selectAvailabilityDate(day.dataset.date);
    loadAvailability(details.dataset.id).catch(showAvailabilityError);
    return;
  }
  const shift = event.target.closest("[data-day-shift]");
  if (!shift || shift.disabled) return;
  dayWindowStart = shiftDay(dayWindowStart, Number(shift.dataset.dayShift));
  renderDayStrip();
});

details.addEventListener("change", (event) => {
  if (event.target.id !== "availabilityDate") return;
  loadAvailability(details.dataset.id).catch(showAvailabilityError);
});

async function restore() {
  if (!token) {
    showSignedOut();
    return;
  }
  try {
    const account = await readJson(await fetch("/api/me", { headers: sessionHeader() }));
    showSignedIn(account);
    if (location.hash !== "#/account") await loadCatalogue();
  } catch (error) {
    if (error.code === "NoSession") {
      showSignedOut();
      return;
    }
    showError(error);
  }
}

restore();
